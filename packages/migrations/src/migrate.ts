#!/usr/bin/env tsx
/**
 * Lightweight SQL migration runner.
 *
 * Usage:
 *   tsx src/migrate.ts up       — apply all pending migrations
 *   tsx src/migrate.ts down     — roll back the last applied migration
 *   tsx src/migrate.ts status   — print applied / pending migrations
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, '..', 'sql');

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://enheritage:enheritage_dev@localhost:5432/enheritage';

async function getClient(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

async function ensureTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT        PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function loadMigrationFiles(): { version: string; up: string; down: string }[] {
  const files = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.match(/^\d{3}_.*\.sql$/))
    .sort();

  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(SQL_DIR, filename), 'utf-8');
    const [upSection, downSection = ''] = raw.split(/^-- DOWN\s*$/m);
    return {
      version: filename.replace('.sql', ''),
      up: upSection.replace(/^-- UP\s*\n?/m, '').trim(),
      down: downSection.trim(),
    };
  });
}

async function getApplied(client: pg.Client): Promise<Set<string>> {
  const res = await client.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(res.rows.map((r) => r.version));
}

async function migrateUp(client: pg.Client): Promise<void> {
  const migrations = loadMigrationFiles();
  const applied = await getApplied(client);
  const pending = migrations.filter((m) => !applied.has(m.version));

  if (pending.length === 0) {
    console.log('✓ No pending migrations.');
    return;
  }

  for (const migration of pending) {
    console.log(`  → Applying ${migration.version}…`);
    await client.query('BEGIN');
    try {
      await client.query(migration.up);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
      await client.query('COMMIT');
      console.log(`  ✓ ${migration.version}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${migration.version} failed: ${String(err)}`);
    }
  }
}

async function migrateDown(client: pg.Client): Promise<void> {
  const migrations = loadMigrationFiles();
  const applied = await getApplied(client);

  const last = [...applied].sort().at(-1);
  if (!last) {
    console.log('Nothing to roll back.');
    return;
  }

  const migration = migrations.find((m) => m.version === last);
  if (!migration || !migration.down) {
    throw new Error(`No DOWN migration found for ${last}`);
  }

  console.log(`  ↓ Rolling back ${last}…`);
  await client.query('BEGIN');
  try {
    await client.query(migration.down);
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [last]);
    await client.query('COMMIT');
    console.log(`  ✓ Rolled back ${last}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Rollback of ${last} failed: ${String(err)}`);
  }
}

async function status(client: pg.Client): Promise<void> {
  const migrations = loadMigrationFiles();
  const applied = await getApplied(client);

  console.log('\nMigration status:\n');
  for (const m of migrations) {
    const state = applied.has(m.version) ? '✓ applied' : '○ pending';
    console.log(`  ${state}  ${m.version}`);
  }
  console.log();
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';
  const client = await getClient();

  try {
    await ensureTable(client);
    if (command === 'up') await migrateUp(client);
    else if (command === 'down') await migrateDown(client);
    else await status(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
