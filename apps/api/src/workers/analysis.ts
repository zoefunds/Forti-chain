import { db } from '../db/index.js';
import { signalIngestions, protocols, users } from '../db/schema.js';
import { eq, and, lte, gt, isNotNull } from 'drizzle-orm';
import { GenLayerService } from '../services/genlayer/genLayerService.js';
import { workerHealth } from '../routes/admin.js';

// ── Process unprocessed signals ────────────────────────────────────
async function processSignals() {
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
}

// ── Auto-analyze protocols whose interval has elapsed ─────────────
async function processScheduledAnalysis() {
  // Find protocols with a non-zero autoAnalyzeIntervalHours where lastAnalyzedAt
  // is older than the interval (or has never been analyzed)
  const now = new Date();

  const activeProtocols = await db.select().from(protocols)
    .where(and(
      eq(protocols.monitoringActive, true),
      gt(protocols.autoAnalyzeIntervalHours, 0),
    ));

  for (const protocol of activeProtocols) {
    const intervalMs = (protocol.autoAnalyzeIntervalHours ?? 0) * 60 * 60 * 1000;
    if (intervalMs <= 0) continue;

    const lastAnalyzed = protocol.lastAnalyzedAt ? new Date(protocol.lastAnalyzedAt).getTime() : 0;
    const dueAt = lastAnalyzed + intervalMs;

    if (now.getTime() >= dueAt) {
      const [user] = await db.select().from(users).where(eq(users.id, protocol.userId)).limit(1);
      if (!user) continue;
      const genLayer = new GenLayerService();
      await genLayer.analyzeProtocol(protocol, user).catch(err =>
        console.error(`[analysis] scheduled analysis failed for ${protocol.name}:`, err),
      );
    }
  }
}

async function tick() {
  workerHealth.analysis.runs++;
  try {
    await processSignals();
    await processScheduledAnalysis();
    workerHealth.analysis.lastRun = new Date();
  } catch (err) {
    workerHealth.analysis.errors++;
    console.error('[analysis] tick error:', err);
  }
}

export function analysisWorker() {
  setInterval(tick, 5 * 60_000);
  console.log('  ✓ Analysis worker started (5min interval, signal + scheduled)');
}
