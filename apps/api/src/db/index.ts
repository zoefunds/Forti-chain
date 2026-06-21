import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import { env } from '../config/env.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,                     // Neon free tier connection limit
  idleTimeoutMillis: 600_000, // keep connections alive 10 min (signal worker runs every 60s)
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
export { pool };
