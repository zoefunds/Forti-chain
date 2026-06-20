import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users, protocols, aiJudgments, alertsSent, signalIngestions, notifications } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

// Worker health tracking (updated by workers)
export const workerHealth: Record<string, { lastRun: Date | null; runs: number; errors: number }> = {
  signalIngestion: { lastRun: null, runs: 0, errors: 0 },
  analysis:        { lastRun: null, runs: 0, errors: 0 },
  genBalanceSync:  { lastRun: null, runs: 0, errors: 0 },
};

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = String(row[h] ?? '').replace(/"/g, '""');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
    }).join(','));
  }
  return lines.join('\n');
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  // GET /admin/stats — platform-wide numbers
  app.get('/stats', async () => {
    const [[userCount], [protocolCount], [judgmentCount], [alertCount], [signalCount], [notifCount]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(users),
        db.select({ count: sql<number>`count(*)::int` }).from(protocols),
        db.select({ count: sql<number>`count(*)::int` }).from(aiJudgments),
        db.select({ count: sql<number>`count(*)::int` }).from(alertsSent),
        db.select({ count: sql<number>`count(*)::int` }).from(signalIngestions),
        db.select({ count: sql<number>`count(*)::int` }).from(notifications),
      ]);

    const tierBreakdown = await db
      .select({ level: aiJudgments.level, count: sql<number>`count(*)::int` })
      .from(aiJudgments)
      .groupBy(aiJudgments.level);

    const subBreakdown = await db
      .select({ tier: users.subscriptionTier, count: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.subscriptionTier);

    const suspendedCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(users).where(eq(users.suspended, true));

    const unverifiedCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(users).where(eq(users.emailVerified, false));

    return {
      users:             userCount.count,
      protocols:         protocolCount.count,
      judgments:         judgmentCount.count,
      alerts:            alertCount.count,
      signals:           signalCount.count,
      notifications:     notifCount.count,
      suspended:         suspendedCount[0].count,
      unverified:        unverifiedCount[0].count,
      judgmentsByTier:   tierBreakdown,
      usersBySubscription: subBreakdown,
    };
  });

  // GET /admin/health — worker + system health
  app.get('/health', async () => {
    return {
      api: { status: 'ok', uptime: process.uptime(), memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024) },
      workers: workerHealth,
      timestamp: new Date().toISOString(),
    };
  });

  // GET /admin/users — all users with per-user counts
  app.get('/users', async () => {
    return db
      .select({
        id:               users.id,
        email:            users.email,
        role:             users.role,
        suspended:        users.suspended,
        walletAddress:    users.walletAddress,
        subscriptionTier: users.subscriptionTier,
        emailVerified:    users.emailVerified,
        genBalanceCache:  users.genBalanceCache,
        createdAt:        users.createdAt,
        protocolCount:    sql<number>`(select count(*)::int from protocols where user_id = users.id)`,
        judgmentCount:    sql<number>`(select count(*)::int from ai_judgments j join protocols p on p.id = j.protocol_id where p.user_id = users.id)`,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  });

  // PATCH /admin/users/:id/role — promote/demote
  app.patch('/users/:id/role', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { role } = req.body as { role: string };
    if (!['user', 'admin'].includes(role)) {
      return reply.status(400).send({ error: 'role must be "user" or "admin"' });
    }
    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role });
    if (!updated) return reply.status(404).send({ error: 'User not found' });
    return updated;
  });

  // PATCH /admin/users/:id/suspend — suspend or unsuspend
  app.patch('/users/:id/suspend', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { suspended } = req.body as { suspended: boolean };
    if (typeof suspended !== 'boolean') {
      return reply.status(400).send({ error: 'suspended must be a boolean' });
    }
    const [updated] = await db.update(users)
      .set({ suspended, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, suspended: users.suspended });
    if (!updated) return reply.status(404).send({ error: 'User not found' });
    return updated;
  });

  // GET /admin/protocols — all protocols across all users
  app.get('/protocols', async () => {
    return db
      .select({
        id:               protocols.id,
        name:             protocols.name,
        chain:            protocols.chain,
        category:         protocols.category,
        riskScore:        protocols.riskScore,
        onChainRegistered: protocols.onChainRegistered,
        monitoringActive: protocols.monitoringActive,
        autoAnalyzeIntervalHours: protocols.autoAnalyzeIntervalHours,
        lastAnalyzedAt:   protocols.lastAnalyzedAt,
        createdAt:        protocols.createdAt,
        userId:           protocols.userId,
        userEmail:        sql<string>`(select email from users where id = protocols.user_id)`,
        judgmentCount:    sql<number>`(select count(*)::int from ai_judgments where protocol_id = protocols.id)`,
      })
      .from(protocols)
      .orderBy(desc(protocols.createdAt));
  });

  // GET /admin/judgments — recent judgments across platform
  app.get('/judgments', async (req) => {
    const limit = parseInt((req.query as any).limit ?? '50');
    return db
      .select({
        id:               aiJudgments.id,
        protocolId:       aiJudgments.protocolId,
        riskScore:        aiJudgments.riskScore,
        level:            aiJudgments.level,
        consensusReached: aiJudgments.consensusReached,
        contractCallTx:   aiJudgments.contractCallTx,
        recommendedAction: aiJudgments.recommendedAction,
        createdAt:        aiJudgments.createdAt,
        protocolName:     sql<string>`(select name from protocols where id = ai_judgments.protocol_id)`,
        userEmail:        sql<string>`(select u.email from users u join protocols p on p.user_id = u.id where p.id = ai_judgments.protocol_id limit 1)`,
      })
      .from(aiJudgments)
      .orderBy(desc(aiJudgments.createdAt))
      .limit(Math.min(limit, 200));
  });

  // GET /admin/export/users.csv
  app.get('/export/users.csv', async (req, reply) => {
    const rows = await db.select({
      id: users.id, email: users.email, role: users.role,
      suspended: users.suspended, subscriptionTier: users.subscriptionTier,
      emailVerified: users.emailVerified, walletAddress: users.walletAddress,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="users.csv"');
    return toCSV(rows as any);
  });

  // GET /admin/export/protocols.csv
  app.get('/export/protocols.csv', async (req, reply) => {
    const rows = await db.select({
      id: protocols.id, name: protocols.name, chain: protocols.chain,
      category: protocols.category, riskScore: protocols.riskScore,
      onChainRegistered: protocols.onChainRegistered,
      userId: protocols.userId, createdAt: protocols.createdAt,
      lastAnalyzedAt: protocols.lastAnalyzedAt,
    }).from(protocols).orderBy(desc(protocols.createdAt));
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="protocols.csv"');
    return toCSV(rows as any);
  });

  // GET /admin/export/judgments.csv
  app.get('/export/judgments.csv', async (req, reply) => {
    const rows = await db.select({
      id: aiJudgments.id, protocolId: aiJudgments.protocolId,
      riskScore: aiJudgments.riskScore, level: aiJudgments.level,
      consensusReached: aiJudgments.consensusReached,
      contractCallTx: aiJudgments.contractCallTx,
      recommendedAction: aiJudgments.recommendedAction,
      createdAt: aiJudgments.createdAt,
    }).from(aiJudgments).orderBy(desc(aiJudgments.createdAt)).limit(5000);
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="judgments.csv"');
    return toCSV(rows as any);
  });
}
