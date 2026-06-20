import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateWallet } from '../services/wallet/walletService.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post('/register', async (req, reply) => {
    const body = RegisterSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { email, password } = body.data;

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return reply.status(409).send({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const walletData = generateWallet(password);

    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      ...walletData,
      emailVerified: false,
      subscriptionTier: 'free',
    }).returning({ id: users.id, email: users.email, walletAddress: users.walletAddress });

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '15m' });
    const refresh = app.jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });

    reply.setCookie('access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    return { user, refresh };
  });

  // POST /api/v1/auth/login
  app.post('/login', async (req, reply) => {
    const body = LoginSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { email, password } = body.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '15m' });
    const refresh = app.jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });

    reply.setCookie('access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    return {
      user: { id: user.id, email: user.email, walletAddress: user.walletAddress, subscriptionTier: user.subscriptionTier },
      refresh,
    };
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const { refresh } = req.body as { refresh: string };
    try {
      const payload = app.jwt.verify<{ id: string; type: string }>(refresh);
      if (payload.type !== 'refresh') throw new Error();
      const token = app.jwt.sign({ id: payload.id }, { expiresIn: '15m' });
      reply.setCookie('access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
      return { ok: true };
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (req, reply) => {
    reply.clearCookie('access_token');
    return { ok: true };
  });

  // GET /api/v1/auth/me
  app.get('/me', { preHandler: authenticate }, async (req) => {
    const { passwordHash, encryptedPrivateKey, encryptedMnemonic, ...safe } = req.user;
    return { user: safe };
  });
}
