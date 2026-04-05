#!/usr/bin/env node
/**
 * Minimal migration runner.
 * Reads all *.sql files from ./migrations in order and applies them
 * idempotently against the DATABASE_URL Postgres instance.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL is not set');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  // Ensure the migrations tracking table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file],
    );

    if (rows.length > 0) {
      console.log(`[migrate] Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] Applying ${file}...`);
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [file],
    );
    console.log(`[migrate] Applied ${file}`);
  }

  console.log('[migrate] All migrations complete');
} catch (err) {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
} finally {
  await client.end();
}
