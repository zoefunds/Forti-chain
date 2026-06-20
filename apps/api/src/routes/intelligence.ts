import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { signalIngestions, aiJudgments } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';

export async function intelligenceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // Global threat intelligence feed
  app.get('/feed', async () => {
    return db.select().from(signalIngestions)
      .orderBy(desc(signalIngestions.ingestedAt))
      .limit(50);
  });

  // Global risk summary
  app.get('/global-risk', async () => {
    const recentJudgments = await db.select().from(aiJudgments)
      .orderBy(desc(aiJudgments.createdAt))
      .limit(20);
    const avgRisk = recentJudgments.length
      ? recentJudgments.reduce((a, j) => a + j.riskScore, 0) / recentJudgments.length
      : 0;
    const criticalCount = recentJudgments.filter(j => j.level >= 3).length;
    return { avgRisk: Math.round(avgRisk), criticalCount, sampleSize: recentJudgments.length };
  });
}
