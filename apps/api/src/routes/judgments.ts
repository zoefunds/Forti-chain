import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { aiJudgments, protocols } from '../db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';

export async function judgmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (req) => {
    const userProtocols = await db.select({ id: protocols.id }).from(protocols)
      .where(eq(protocols.userId, req.user.id));
    if (!userProtocols.length) return [];
    const ids = userProtocols.map(p => p.id);
    return db.select().from(aiJudgments)
      .where(inArray(aiJudgments.protocolId, ids))
      .orderBy(desc(aiJudgments.createdAt))
      .limit(100);
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [j] = await db.select().from(aiJudgments).where(eq(aiJudgments.id, id)).limit(1);
    if (!j) return reply.status(404).send({ error: 'Not found' });
    return j;
  });
}
