import axios from 'axios';
import { db } from '../db/index.js';
import { protocols, signalIngestions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

async function ingestEtherscanSignals(protocol: typeof protocols.$inferSelect) {
  if (!protocol.contractAddress || !env.ETHERSCAN_API_KEY) return;
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${protocol.contractAddress}&sort=desc&page=1&offset=20&apikey=${env.ETHERSCAN_API_KEY}`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data.status !== '1') return;
    const txs = res.data.result as Array<Record<string, string>>;
    const largeFlows = txs.filter(tx => BigInt(tx.value ?? 0) > BigInt('10000000000000000000'));
    if (largeFlows.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'etherscan',
        content: { largeTransactions: largeFlows.slice(0, 5), count: largeFlows.length },
      });
    }
  } catch {}
}

async function tick() {
  try {
    const activeProtocols = await db.select().from(protocols).where(eq(protocols.monitoringActive, true));
    await Promise.allSettled(activeProtocols.map(p => ingestEtherscanSignals(p)));
  } catch (err) {
    console.error('Signal ingestion error:', err);
  }
}

export function signalIngestionWorker() {
  setInterval(tick, 60_000);
  console.log('  ✓ Signal ingestion worker started (60s interval)');
}
