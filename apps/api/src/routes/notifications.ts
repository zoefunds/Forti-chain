import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /notifications — list (latest 50, unread first)
  app.get('/', async (req) => {
    const rows = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const unread = rows.filter(n => !n.read).length;
    return { unread, notifications: rows };
  });

  // PATCH /notifications/read-all
  app.patch('/read-all', async (req) => {
    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, req.user.id), eq(notifications.read, false)));
    return { ok: true };
  });

  // PATCH /notifications/:id/read
  app.patch('/:id/read', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [updated] = await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)))
      .returning({ id: notifications.id });
    if (!updated) return reply.status(404).send({ error: 'Not found' });
    return { ok: true };
  });

  // DELETE /notifications/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)));
    return { ok: true };
  });
}
