import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { protocols, aiJudgments, alertsSent } from '../db/schema.js';
import { sql } from 'drizzle-orm';

export async function publicStatsRoutes(app: FastifyInstance) {
  // GET /api/v1/stats — unauthenticated, used by landing page
  app.get('/', async () => {
    const [[protocolCount], [judgmentCount], [alertCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(protocols),
      db.select({ count: sql<number>`count(*)::int` }).from(aiJudgments),
      db.select({ count: sql<number>`count(*)::int` }).from(alertsSent),
    ]);

    return {
      protocolsMonitored: protocolCount.count,
      judgmentsMade:       judgmentCount.count,
      alertsDispatched:    alertCount.count,
      validators:          5,
      avgResponseMinutes:  '1–3',
    };
  });
}
