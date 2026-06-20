import axios from 'axios';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

async function tick() {
  try {
    if (!env.GENLAYER_RPC_URL) return;
    const allUsers = await db.select({ id: users.id, walletAddress: users.walletAddress }).from(users);
    for (const user of allUsers) {
      try {
        const res = await axios.post(env.GENLAYER_RPC_URL, {
          jsonrpc: '2.0', method: 'eth_getBalance', params: [user.walletAddress, 'latest'], id: 1,
        }, { timeout: 5000 });
        const balance = res.data?.result ?? '0x0';
        const balanceWei = BigInt(balance);
        const balanceGEN = (Number(balanceWei) / 1e18).toFixed(18);
        await db.update(users).set({ genBalanceCache: balanceGEN }).where(eq(users.id, user.id));
      } catch {}
    }
  } catch (err) {
    console.error('GEN balance sync error:', err);
  }
}

export function genBalanceSyncWorker() {
  setInterval(tick, 10 * 60_000);
  console.log('  ✓ GEN balance sync worker started (10min interval)');
}
