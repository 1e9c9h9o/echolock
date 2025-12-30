#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Runs JavaScript migration files in order.
 * Tracks completed migrations in a migrations table.
 *
 * Usage:
 *   npm run db:migrate:js
 *   node src/api/db/runMigrations.js
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executedResult = await client.query('SELECT name FROM migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map(r => r.name));

    // Get list of migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    let migrationsRun = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`  ✓ ${file} (already executed)`);
        continue;
      }

      console.log(`  → Running ${file}...`);

      try {
        // Import and run the migration
        const migrationPath = path.join(MIGRATIONS_DIR, file);
        const migration = await import(`file://${migrationPath}`);

        await client.query('BEGIN');
        await migration.up(client);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');

        console.log(`  ✓ ${file} completed`);
        migrationsRun++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${file} FAILED:`, error.message);
        throw error;
      }
    }

    if (migrationsRun === 0) {
      console.log('\nNo new migrations to run.');
    } else {
      console.log(`\n✓ Successfully ran ${migrationsRun} migration(s)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
