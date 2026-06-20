import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { protocolRoutes } from './routes/protocols.js';
import { judgmentRoutes } from './routes/judgments.js';
import { alertRoutes } from './routes/alerts.js';
import { apiKeyRoutes } from './routes/apiKeys.js';
import { walletRoutes } from './routes/wallet.js';
import { intelligenceRoutes } from './routes/intelligence.js';
import { settingsRoutes } from './routes/settings.js';
import { publicStatsRoutes } from './routes/publicStats.js';
import { startWorkers } from './workers/index.js';

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});
await app.register(cookie);
await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: { cookieName: 'access_token', signed: false },
});
await app.register(rateLimit, {
  max: 200,
  timeWindow: '1 minute',
});

// Health check
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// Routes
await app.register(authRoutes, { prefix: '/api/v1/auth' });
await app.register(protocolRoutes, { prefix: '/api/v1/protocols' });
await app.register(judgmentRoutes, { prefix: '/api/v1/judgments' });
await app.register(alertRoutes, { prefix: '/api/v1/alerts' });
await app.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
await app.register(walletRoutes, { prefix: '/api/v1/wallet' });
await app.register(intelligenceRoutes, { prefix: '/api/v1/intelligence' });
await app.register(settingsRoutes, { prefix: '/api/v1/settings' });
await app.register(publicStatsRoutes, { prefix: '/api/v1/stats' });

// Start background workers
if (env.NODE_ENV !== 'test') {
  startWorkers();
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`FortiChain API running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
