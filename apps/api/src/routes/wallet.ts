import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import axios from 'axios';
import { db } from '../db/index.js';
import { users, genTransactions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { exportPrivateKey, exportMnemonic } from '../services/wallet/walletService.js';
import { decryptForServer } from '../services/wallet/encryption.js';
import { env } from '../config/env.js';

// GEN token prices per plan per month (on StudioNet testnet)
const PLAN_GEN_PRICE: Record<string, number> = {
  pro:        50,   // 50 GEN / month
  enterprise: 200,  // 200 GEN / month
};

async function getOnChainBalance(walletAddress: string): Promise<number> {
  try {
    const res = await axios.post(env.GENLAYER_RPC_URL, {
      jsonrpc: '2.0', method: 'eth_getBalance', params: [walletAddress, 'latest'], id: 1,
    }, { timeout: 6000 });
    const hex = res.data?.result ?? '0x0';
    return Number(BigInt(hex)) / 1e18;
  } catch {
    return 0;
  }
}

async function sendGENTransfer(
  fromPrivateKey: string,
  toAddress: string,
  amountGEN: number,
): Promise<string | null> {
  // Use genlayer-js to send a native GEN transfer
  try {
    const { createClient, createAccount } = await import('genlayer-js');
    const { studionet } = await import('genlayer-js/chains');
    const { TransactionStatus } = await import('genlayer-js/types');

    const client = createClient({ chain: studionet });
    const account = createAccount(fromPrivateKey as `0x${string}`);

    const amountWei = BigInt(Math.floor(amountGEN * 1e18));

    const txHash = await (client as any).sendTransaction({
      account,
      to: toAddress as `0x${string}`,
      value: amountWei,
    });

    await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      fullTransaction: false,
      retries: 40,
    });

    return txHash as string;
  } catch (err) {
    console.error('[wallet] GEN transfer failed:', err);
    return null;
  }
}

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /wallet
  app.get('/', async (req) => {
    const txs = await db.select().from(genTransactions)
      .where(eq(genTransactions.userId, req.user.id))
      .orderBy(desc(genTransactions.createdAt))
      .limit(20);
    return {
      walletAddress: req.user.walletAddress,
      genBalance: req.user.genBalanceCache,
      recentTransactions: txs,
    };
  });

  // POST /wallet/export-key
  app.post('/export-key', async (req, reply) => {
    const { password } = req.body as { password: string };
    if (!password) return reply.status(400).send({ error: 'Password required' });
    const valid = await bcrypt.compare(password, req.user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect password' });
    const privateKey = exportPrivateKey(
      req.user.encryptedPrivateKey,
      req.user.walletSalt,
      password,
    );
    return { privateKey };
  });

  // POST /wallet/export-mnemonic
  app.post('/export-mnemonic', async (req, reply) => {
    const { password } = req.body as { password: string };
    if (!password) return reply.status(400).send({ error: 'Password required' });
    const valid = await bcrypt.compare(password, req.user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Incorrect password' });
    const mnemonic = exportMnemonic(
      req.user.encryptedMnemonic,
      req.user.walletSalt,
      password,
    );
    return { mnemonic };
  });

  // GET /wallet/transactions
  app.get('/transactions', async (req) => {
    return db.select().from(genTransactions)
      .where(eq(genTransactions.userId, req.user.id))
      .orderBy(desc(genTransactions.createdAt));
  });

  // GET /wallet/plan-prices — show GEN prices for each plan
  app.get('/plan-prices', async () => {
    return { prices: PLAN_GEN_PRICE, currency: 'GEN' };
  });

  // POST /wallet/subscribe — pay in GEN tokens, upgrade subscription
  app.post('/subscribe', async (req, reply) => {
    const { planId, months = 1 } = req.body as { planId: string; months?: number };
    const VALID_PLANS = ['free', 'pro', 'enterprise'];
    if (!VALID_PLANS.includes(planId)) return reply.status(400).send({ error: 'Invalid plan' });
    if (planId === 'free') return reply.status(400).send({ error: 'Cannot subscribe to free plan' });

    const pricePerMonth = PLAN_GEN_PRICE[planId] ?? 0;
    const totalGEN = pricePerMonth * months;

    // Get live on-chain balance
    const liveBalance = await getOnChainBalance(req.user.walletAddress);
    if (liveBalance < totalGEN) {
      return reply.status(402).send({
        error: `Insufficient GEN balance. Need ${totalGEN} GEN (${pricePerMonth} × ${months} month${months > 1 ? 's' : ''}), have ${liveBalance.toFixed(4)} GEN.`,
        required: totalGEN,
        available: liveBalance,
      });
    }

    // Send on-chain payment to treasury (if treasury configured and user has server key)
    let txHash: string | null = null;
    const treasury = env.TREASURY_WALLET;
    if (treasury && req.user.serverEncryptedKey) {
      try {
        const pk = decryptForServer(req.user.serverEncryptedKey, req.user.id);
        txHash = await sendGENTransfer(pk, treasury, totalGEN);
        if (!txHash) {
          return reply.status(502).send({ error: 'On-chain payment failed. Please try again.' });
        }
      } catch (err) {
        console.error('[wallet/subscribe] payment error:', err);
        return reply.status(502).send({ error: 'Payment processing failed.' });
      }
    }

    // Update subscription tier
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await db.update(users)
      .set({ subscriptionTier: planId, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    // Record transaction
    if (txHash) {
      await db.insert(genTransactions).values({
        userId: req.user.id,
        txHash,
        amount: String(totalGEN),
        purpose: `subscription:${planId}:${months}mo`,
        confirmed: true,
      }).catch(() => {});
    }

    // Update cached balance
    const newBalance = Math.max(0, liveBalance - totalGEN);
    await db.update(users)
      .set({ genBalanceCache: String(newBalance) })
      .where(eq(users.id, req.user.id))
      .catch(() => {});

    return {
      ok: true,
      subscriptionTier: planId,
      genPaid: totalGEN,
      txHash,
      newBalance: newBalance.toFixed(4),
    };
  });
}
