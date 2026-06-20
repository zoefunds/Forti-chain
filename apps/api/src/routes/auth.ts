import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as Brevo from '@getbrevo/brevo';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateWallet } from '../services/wallet/walletService.js';
import { encryptForServer, decrypt } from '../services/wallet/encryption.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/authenticate.js';

// In-memory token store (sufficient for stateless reset; TTL = 15 min)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

async function sendResetEmail(to: string, token: string) {
  const brevoApi = new Brevo.TransactionalEmailsApi();
  brevoApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, env.BREVO_API_KEY);
  const resetUrl = `https://forti-chain.vercel.app/auth/reset-password?token=${token}`;
  const email = new Brevo.SendSmtpEmail();
  email.sender = { email: env.EMAIL_FROM, name: 'FortiChain' };
  email.to = [{ email: to }];
  email.subject = '[FortiChain] Reset your password';
  email.htmlContent = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0d1014;padding:24px;border-radius:8px 8px 0 0;border-bottom:1px solid #1c2229">
        <h1 style="color:#217eaa;margin:0;font-size:18px">&#x1F6E1; FortiChain</h1>
      </div>
      <div style="background:#111518;padding:28px;border-radius:0 0 8px 8px">
        <h2 style="color:#eeeeee;margin-top:0">Reset your password</h2>
        <p style="color:#8ca4ac">We received a request to reset the password for your FortiChain account.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#217eaa;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#8ca4ac;font-size:13px">This link expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border-color:#1c2229"/>
        <p style="color:#8ca4ac;font-size:11px;font-family:monospace">Or copy: ${resetUrl}</p>
      </div>
    </div>
  `;
  await brevoApi.sendTransacEmail(email);
}

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

    // Insert first to get the UUID, then encrypt the private key with the server key
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      ...walletData,
      emailVerified: false,
      subscriptionTier: 'free',
    }).returning({ id: users.id, email: users.email, walletAddress: users.walletAddress });

    // Derive the plaintext private key (we have the password right now) and store
    // a server-only encrypted copy so the API can sign transactions on behalf of the user.
    try {
      const { decrypt: dec } = await import('../services/wallet/encryption.js');
      const privateKey = dec(walletData.encryptedPrivateKey, password, walletData.walletSalt);
      const serverEncryptedKey = encryptForServer(privateKey, user.id);
      await db.update(users).set({ serverEncryptedKey }).where(eq(users.id, user.id));
    } catch (err) {
      console.error('[auth] Failed to store server encrypted key on register:', err);
    }

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

    const [user] = await db.select({
      id: users.id, email: users.email, passwordHash: users.passwordHash,
      walletAddress: users.walletAddress, subscriptionTier: users.subscriptionTier,
      role: users.role,
      encryptedPrivateKey: users.encryptedPrivateKey, walletSalt: users.walletSalt,
      serverEncryptedKey: users.serverEncryptedKey,
    }).from(users).where(eq(users.email, email)).limit(1) as any[];
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    // Lazy-migrate: if serverEncryptedKey is missing, derive and store it now
    // (existing users who registered before this feature was added)
    if (!user.serverEncryptedKey) {
      try {
        const privateKey = decrypt(user.encryptedPrivateKey, password, user.walletSalt);
        const serverEncryptedKey = encryptForServer(privateKey, user.id);
        await db.update(users).set({ serverEncryptedKey }).where(eq(users.id, user.id));
        user.serverEncryptedKey = serverEncryptedKey;
      } catch (err) {
        console.error('[auth] Failed to migrate server encrypted key on login:', err);
      }
    }

    const token = app.jwt.sign({ id: user.id }, { expiresIn: '15m' });
    const refresh = app.jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });

    reply.setCookie('access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' });
    return {
      user: { id: user.id, email: user.email, walletAddress: user.walletAddress, subscriptionTier: user.subscriptionTier, role: user.role },
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

  // POST /api/v1/auth/forgot-password
  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body as { email: string };
    if (!email || typeof email !== 'string') return reply.status(400).send({ error: 'Email required' });

    const [user] = await db.select({ id: users.id, email: users.email })
      .from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

    // Always return 200 to prevent email enumeration
    if (!user) return { ok: true };

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });

    try { await sendResetEmail(user.email, token); } catch {}
    return { ok: true };
  });

  // POST /api/v1/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) return reply.status(400).send({ error: 'Token and password required' });

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      return reply.status(400).send({ error: 'Reset link has expired or is invalid' });
    }

    const parsed = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).safeParse(password);
    if (!parsed.success) return reply.status(400).send({ error: 'Password must be at least 8 characters with one uppercase letter and one number' });

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await db.update(users).set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, entry.userId));

    resetTokens.delete(token);
    return { ok: true };
  });

  // POST /api/v1/auth/logout
  app.post('/logout', async (req, reply) => {
    reply.clearCookie('access_token');
    return { ok: true };
  });

  // GET /api/v1/auth/me
  app.get('/me', { preHandler: authenticate }, async (req) => {
    const { passwordHash, encryptedPrivateKey, encryptedMnemonic, serverEncryptedKey, walletSalt, ...safe } = req.user as any;
    return { user: safe };
  });
}
