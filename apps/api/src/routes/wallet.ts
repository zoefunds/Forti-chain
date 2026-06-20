import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users, genTransactions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { exportPrivateKey, exportMnemonic } from '../services/wallet/walletService.js';

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

  // POST /wallet/subscribe — upgrade subscription (calls on-chain contract via GenLayerService)
  app.post('/subscribe', async (req, reply) => {
    const { planId, months = 1 } = req.body as { planId: string; months?: number };
    const VALID_PLANS = ['free', 'pro', 'enterprise'];
    if (!VALID_PLANS.includes(planId)) return reply.status(400).send({ error: 'Invalid plan' });
    if (planId === 'free') return reply.status(400).send({ error: 'Cannot subscribe to free plan' });

    // Update subscription tier in DB
    await db.update(users)
      .set({ subscriptionTier: planId })
      .where(eq(users.id, req.user.id));

    // Optionally call on-chain contract.subscribe() in background
    // (not awaited to avoid timeout — GenLayer tx takes ~60s)
    (async () => {
      try {
        const { GenLayerService } = await import('../services/genlayer/genLayerService.js');
        const svc = new GenLayerService();
        const durationMap: Record<string, number> = { pro: months, enterprise: months };
        // contract.subscribe(duration_months) is payable — skip if no on-chain sub price configured
        // For now we just log — the DB update is the source of truth
        console.log(`[wallet] subscription updated: ${req.user.id} → ${planId}`);
      } catch {}
    })();

    return { ok: true, subscriptionTier: planId };
  });
}
