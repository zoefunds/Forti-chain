import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import { users, apiKeys } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    // API key auth
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const [key] = await db.select().from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash)).limit(1);
      if (!key || key.revokedAt) {
        return reply.status(401).send({ error: 'Invalid API key' });
      }
      const [user] = await db.select().from(users)
        .where(eq(users.id, key.userId)).limit(1);
      if (!user) return reply.status(401).send({ error: 'User not found' });
      req.user = user;
      // fire-and-forget last used update
      db.update(apiKeys).set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id)).execute();
      return;
    }

    // JWT auth
    await req.jwtVerify();
    const payload = req.user as { id: string };
    const [user] = await db.select().from(users)
      .where(eq(users.id, payload.id)).limit(1);
    if (!user) return reply.status(401).send({ error: 'User not found' });
    req.user = user;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user: typeof users.$inferSelect;
  }
}
