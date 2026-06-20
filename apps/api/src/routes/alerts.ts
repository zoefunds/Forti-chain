import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { alertsSent, protocols } from '../db/schema.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';

export async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (req) => {
    const userProtocols = await db.select({ id: protocols.id }).from(protocols)
      .where(eq(protocols.userId, req.user.id));
    if (!userProtocols.length) return [];
    const ids = userProtocols.map(p => p.id);
    return db.select().from(alertsSent)
      .where(inArray(alertsSent.protocolId, ids))
      .orderBy(desc(alertsSent.sentAt))
      .limit(100);
  });

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [alert] = await db.select().from(alertsSent).where(eq(alertsSent.id, id)).limit(1);
    if (!alert) return reply.status(404).send({ error: 'Not found' });
    return alert;
  });
}
