import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import crypto from 'crypto';

const CreateKeySchema = z.object({
  label: z.string().min(1).max(100),
  permissions: z.array(z.string()).default(['read']),
  rateLimit: z.number().int().min(10).max(10000).default(1000),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async (req) => {
    const keys = await db.select({
      id: apiKeys.id,
      label: apiKeys.label,
      keyPrefix: apiKeys.keyPrefix,
      permissions: apiKeys.permissions,
      rateLimit: apiKeys.rateLimit,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.userId, req.user.id));
    return keys;
  });

  app.post('/', async (req, reply) => {
    const body = CreateKeySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const rawKey = `fc_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    const [key] = await db.insert(apiKeys).values({
      userId: req.user.id,
      keyHash,
      keyPrefix,
      label: body.data.label,
      permissions: body.data.permissions,
      rateLimit: body.data.rateLimit,
    }).returning({ id: apiKeys.id, label: apiKeys.label, keyPrefix: apiKeys.keyPrefix });

    // Return raw key only on creation — never stored
    return reply.status(201).send({ ...key, key: rawKey });
  });

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [revoked] = await db.update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, req.user.id)))
      .returning({ id: apiKeys.id });
    if (!revoked) return reply.status(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
