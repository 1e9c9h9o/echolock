'use strict';

/**
 * Database Connection Pool
 *
 * Uses node-postgres (pg) with connection pooling for performance
 * Includes error handling and graceful shutdown
 *
 * Best Practices:
 * - Connection pooling for performance
 * - Parameterized queries to prevent SQL injection
 * - Error handling with logging
 * - Graceful shutdown on process termination
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Database configuration type
interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl: { rejectUnauthorized: boolean } | false;
}

// Database configuration from environment variables
const config: DbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'echolock',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',

  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if connection takes >10s

  // SSL configuration (required for production)
  // SECURITY: Default to strict SSL verification, allow override via env var for platforms
  // that use self-signed certificates (e.g., Railway, some Heroku configs)
  ssl: process.env.NODE_ENV === 'production' ? {
    // Set DB_SSL_REJECT_UNAUTHORIZED=false only for platforms with self-signed certs
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
};

// Create connection pool
const pool = new Pool(config);

// Export pool for migrations that need direct access
export { pool };

// Handle pool errors
pool.on('error', (err: Error) => {
  logger.error('Unexpected database pool error:', err);
  // Don't exit - let the application handle it
});

// Handle pool connection events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Database connection acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

/**
 * Execute a query with parameterized values
 * Prevents SQL injection by using parameterized queries
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
      text: text.substring(0, 100), // Log first 100 chars
      duration,
      rows: result.rowCount
    });

    return result;
  } catch (error) {
    const err = error as Error;
    logger.error('Database query error:', {
      error: err.message,
      query: text.substring(0, 100),
      params: params.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p)
    });
    throw error;
  }
}

// Extended pool client with logged release
export interface ExtendedPoolClient extends PoolClient {
  release: () => void;
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done!
 */
export async function getClient(): Promise<ExtendedPoolClient> {
  const client = await pool.connect();

  // Wrap release to add logging
  const originalRelease = client.release.bind(client);
  client.release = () => {
    logger.debug('Releasing database client back to pool');
    originalRelease();
  };

  return client as ExtendedPoolClient;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Execute a function within a transaction
 * Automatically handles commit/rollback
 */
export async function transaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    logger.warn('Transaction rolled back', { error: err.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * Useful for health checks
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT NOW()');
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Gracefully close database connections
 * Call this on application shutdown
 */
export async function close(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
    throw error;
  }
}

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections...');
  await close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connections...');
  await close();
  process.exit(0);
});

export default {
  query,
  getClient,
  transaction,
  testConnection,
  close
};
