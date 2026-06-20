import { db } from '../db/index.js';
import { signalIngestions, protocols, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { GenLayerService } from '../services/genlayer/genLayerService.js';

async function tick() {
  try {
    const unprocessed = await db.select().from(signalIngestions)
      .where(eq(signalIngestions.processed, false)).limit(10);
    for (const signal of unprocessed) {
      if (!signal.protocolId) continue;
      const [protocol] = await db.select().from(protocols).where(eq(protocols.id, signal.protocolId)).limit(1);
      if (!protocol) continue;
      const [user] = await db.select().from(users).where(eq(users.id, protocol.userId)).limit(1);
      if (!user) continue;
      const genLayer = new GenLayerService();
      await genLayer.analyzeProtocol(protocol, user);
      await db.update(signalIngestions)
        .set({ processed: true, processedAt: new Date() })
        .where(eq(signalIngestions.id, signal.id));
    }
  } catch (err) {
    console.error('Analysis worker error:', err);
  }
}

export function analysisWorker() {
  setInterval(tick, 5 * 60_000);
  console.log('  ✓ Analysis worker started (5min interval)');
}
