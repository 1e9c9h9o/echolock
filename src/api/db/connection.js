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
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Database configuration from environment variables
const config = {
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
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : false
};

// Create connection pool
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err, client) => {
  logger.error('Unexpected database pool error:', err);
  // Don't exit - let the application handle it
});

// Handle pool connection events
pool.on('connect', (client) => {
  logger.debug('New database connection established');
});

pool.on('acquire', (client) => {
  logger.debug('Database connection acquired from pool');
});

pool.on('remove', (client) => {
  logger.debug('Database connection removed from pool');
});

/**
 * Execute a query with parameterized values
 * Prevents SQL injection by using parameterized queries
 *
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Parameters to substitute
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params = []) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Query executed', {
      text: text.substring(0, 100), // Log first 100 chars
      duration,
      rows: result.rowCount
    });

    return result;
  } catch (error) {
    logger.error('Database query error:', {
      error: error.message,
      query: text.substring(0, 100),
      params: params.map(p => typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p)
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done!
 *
 * @returns {Promise<Object>} Database client
 */
export async function getClient() {
  const client = await pool.connect();

  // Wrap release to add logging
  const originalRelease = client.release.bind(client);
  client.release = () => {
    logger.debug('Releasing database client back to pool');
    originalRelease();
  };

  return client;
}

/**
 * Execute a function within a transaction
 * Automatically handles commit/rollback
 *
 * @param {Function} callback - Async function that receives client
 * @returns {Promise<any>} Result from callback
 */
export async function transaction(callback) {
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
    logger.warn('Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 * Useful for health checks
 *
 * @returns {Promise<boolean>} True if connected
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
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
export async function close() {
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
