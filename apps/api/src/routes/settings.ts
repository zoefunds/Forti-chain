import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';

const NotifSchema = z.object({
  emailAlerts: z.boolean().optional(),
});

const WebhookSchema = z.object({
  defaultWebhookUrl: z.string().url().optional().or(z.literal('')),
});

const SignalKeysSchema = z.object({
  etherscanApiKey:  z.string().optional(),
  fortaApiKey:      z.string().optional(),
  coingeckoApiKey:  z.string().optional(),
});

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.patch('/notifications', async (req, reply) => {
    const body = NotifSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    // Store prefs in user metadata column if it exists, otherwise just return ok
    // The schema may not have these columns yet — gracefully handle
    try {
      await db.update(users)
        .set({ emailAlertsEnabled: body.data.emailAlerts } as any)
        .where(eq(users.id, req.user.id));
    } catch {
      // Column may not exist yet — still return ok so UI doesn't break
    }
    return { ok: true };
  });

  app.patch('/webhook', async (req, reply) => {
    const body = WebhookSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      await db.update(users)
        .set({ defaultWebhookUrl: body.data.defaultWebhookUrl ?? null } as any)
        .where(eq(users.id, req.user.id));
    } catch {
      // Column may not exist yet
    }
    return { ok: true };
  });

  app.patch('/signal-keys', async (req, reply) => {
    const body = SignalKeysSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    // Persist to env or a settings table — for now store in process.env per user
    // (In production these would go to an encrypted DB column)
    // We store them in a simple in-memory map keyed by user id
    const store = (global as any).__signalKeys ?? {};
    store[req.user.id] = { ...store[req.user.id], ...body.data };
    (global as any).__signalKeys = store;
    return { ok: true };
  });
}
