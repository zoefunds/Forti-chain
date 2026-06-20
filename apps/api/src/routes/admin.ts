import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users, protocols, aiJudgments, alertsSent, signalIngestions } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  // GET /admin/stats — platform-wide numbers
  app.get('/stats', async () => {
    const [[userCount], [protocolCount], [judgmentCount], [alertCount], [signalCount]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(users),
        db.select({ count: sql<number>`count(*)::int` }).from(protocols),
        db.select({ count: sql<number>`count(*)::int` }).from(aiJudgments),
        db.select({ count: sql<number>`count(*)::int` }).from(alertsSent),
        db.select({ count: sql<number>`count(*)::int` }).from(signalIngestions),
      ]);

    // Per-tier breakdown
    const tierBreakdown = await db
      .select({ level: aiJudgments.level, count: sql<number>`count(*)::int` })
      .from(aiJudgments)
      .groupBy(aiJudgments.level);

    // Subscription breakdown
    const subBreakdown = await db
      .select({ tier: users.subscriptionTier, count: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.subscriptionTier);

    return {
      users:             userCount.count,
      protocols:         protocolCount.count,
      judgments:         judgmentCount.count,
      alerts:            alertCount.count,
      signals:           signalCount.count,
      judgmentsByTier:   tierBreakdown,
      usersBySubscription: subBreakdown,
    };
  });

  // GET /admin/users — all users with per-user counts
  app.get('/users', async () => {
    const rows = await db
      .select({
        id:               users.id,
        email:            users.email,
        role:             users.role,
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
    return rows;
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
}
