import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    const sql = readFileSync(join(__dirname, 'migrations/0000_initial.sql'), 'utf8');
    await client.query(sql);
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
