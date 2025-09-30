'use strict';

// Test cleanup utilities
// Clean up test data between tests

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const TEST_DATA_DIR = path.join(projectRoot, 'data', 'test');
const SWITCHES_FILE = path.join(TEST_DATA_DIR, 'switches.json');
const FRAGMENTS_FILE = path.join(TEST_DATA_DIR, 'fragments.json');

/**
 * Ensure test data directory exists
 */
export function ensureTestDataDir() {
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
}

/**
 * Clean up test data files
 */
export function cleanupTestData() {
  try {
    if (fs.existsSync(SWITCHES_FILE)) {
      fs.unlinkSync(SWITCHES_FILE);
    }
    if (fs.existsSync(FRAGMENTS_FILE)) {
      fs.unlinkSync(FRAGMENTS_FILE);
    }
  } catch (error) {
    console.warn('Failed to cleanup test data:', error.message);
  }
}

/**
 * Initialize test data with empty structures
 */
export function initializeTestData() {
  ensureTestDataDir();
  fs.writeFileSync(SWITCHES_FILE, JSON.stringify({}, null, 2));
  fs.writeFileSync(FRAGMENTS_FILE, JSON.stringify({}, null, 2));
}

/**
 * Get test data directory path
 */
export function getTestDataDir() {
  return TEST_DATA_DIR;
}

/**
 * Create a test configuration
 */
export function createTestConfig(overrides = {}) {
  return {
    nostr: {
      useNostrDistribution: false, // Default to local for tests
      relays: [
        'wss://relay.test1.local',
        'wss://relay.test2.local',
        'wss://relay.test3.local'
      ],
      ...overrides.nostr
    },
    bitcoin: {
      network: 'testnet',
      ...overrides.bitcoin
    },
    dataDir: TEST_DATA_DIR,
    ...overrides
  };
}

/**
 * Mock environment for tests
 */
export function setupTestEnvironment() {
  // Set test environment variable
  process.env.NODE_ENV = 'test';
  process.env.ECHOLOCK_DATA_DIR = TEST_DATA_DIR;

  // Ensure test data directory
  ensureTestDataDir();
  initializeTestData();
}

/**
 * Tear down test environment
 */
export function teardownTestEnvironment() {
  cleanupTestData();

  // Clean up environment variables
  delete process.env.ECHOLOCK_DATA_DIR;

  // Remove test data directory if empty
  try {
    if (fs.existsSync(TEST_DATA_DIR)) {
      const files = fs.readdirSync(TEST_DATA_DIR);
      if (files.length === 0) {
        fs.rmdirSync(TEST_DATA_DIR);
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Create a beforeEach/afterEach pair for tests
 */
export function createTestHooks() {
  return {
    beforeEach: () => {
      setupTestEnvironment();
    },
    afterEach: () => {
      teardownTestEnvironment();
    }
  };
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 */
export async function waitForCondition(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Condition timeout exceeded');
}

/**
 * Generate a test switch ID
 */
export function generateTestSwitchId() {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Create test message
 */
export function createTestMessage(id = 'default') {
  return `Test secret message ${id} - ${Date.now()}`;
}