import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema.js';
import { env } from '../config/env.js';

// HTTP-based Neon driver: no TCP connection overhead, no cold-start penalty.
// Each query is a single HTTPS request — latency ~50ms vs 200-800ms for TCP reconnects.
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

