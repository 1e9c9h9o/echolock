'use strict';

// Performance benchmarks for ECHOLOCK
// Measures execution time for critical operations

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Mock dependencies
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  getCurrentBlockHeight: jest.fn().mockResolvedValue(1000),
  createTimelockTransaction: jest.fn().mockReturnValue({
    address: 'tb1qtest',
    script: 'abcd',
    scriptAsm: 'test script'
  }),
  getTimelockStatus: jest.fn().mockResolvedValue({
    isValid: false
  }),
  createTimelockScript: jest.fn().mockReturnValue(Buffer.from('script'))
}));

jest.unstable_mockModule('../../src/nostr/multiRelayClient.js', () => ({
  publishFragment: jest.fn().mockResolvedValue({ success: true }),
  retrieveFragments: jest.fn().mockResolvedValue([])
}));

jest.unstable_mockModule('../../src/nostr/relayHealthCheck.js', () => ({
  filterHealthyRelays: jest.fn().mockResolvedValue([
    'wss://relay1.test',
    'wss://relay2.test',
    'wss://relay3.test'
  ])
}));

const { createSwitch } = await import('../../src/core/deadManSwitch.js');
const { split, combine } = await import('shamir-secret-sharing');
const { encrypt, decrypt } = await import('../../src/crypto/encryption.js');
const { deriveKey } = await import('../../src/crypto/keyDerivation.js');
import crypto from 'crypto';

describe('ECHOLOCK Performance Benchmarks', () => {
  const SWITCHES_FILE = path.join(projectRoot, 'data/switches.json');
  const FRAGMENTS_FILE = path.join(projectRoot, 'data/fragments.json');
  const BACKUP_SWITCHES = path.join(projectRoot, 'data/switches.json.backup');
  const BACKUP_FRAGMENTS = path.join(projectRoot, 'data/fragments.json.backup');

  beforeEach(() => {
    // Backup existing files
    if (fs.existsSync(SWITCHES_FILE)) {
      fs.copyFileSync(SWITCHES_FILE, BACKUP_SWITCHES);
    }
    if (fs.existsSync(FRAGMENTS_FILE)) {
      fs.copyFileSync(FRAGMENTS_FILE, BACKUP_FRAGMENTS);
    }

    // Clean up test files
    if (fs.existsSync(SWITCHES_FILE)) fs.unlinkSync(SWITCHES_FILE);
    if (fs.existsSync(FRAGMENTS_FILE)) fs.unlinkSync(FRAGMENTS_FILE);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore backups
    if (fs.existsSync(BACKUP_SWITCHES)) {
      fs.copyFileSync(BACKUP_SWITCHES, SWITCHES_FILE);
      fs.unlinkSync(BACKUP_SWITCHES);
    }
    if (fs.existsSync(BACKUP_FRAGMENTS)) {
      fs.copyFileSync(BACKUP_FRAGMENTS, FRAGMENTS_FILE);
      fs.unlinkSync(BACKUP_FRAGMENTS);
    }
  });

  describe('createSwitch() performance', () => {
    test('should create switch with small message (100 bytes) in < 1s', async () => {
      const message = 'A'.repeat(100);
      const start = Date.now();

      await createSwitch(message, 72, false);

      const duration = Date.now() - start;
      console.log(`    Small message (100B): ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });

    test('should create switch with medium message (1 KB) in < 1s', async () => {
      const message = 'A'.repeat(1024);
      const start = Date.now();

      await createSwitch(message, 72, false);

      const duration = Date.now() - start;
      console.log(`    Medium message (1KB): ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });

    test('should create switch with large message (10 KB) in < 2s', async () => {
      const message = 'A'.repeat(10 * 1024);
      const start = Date.now();

      await createSwitch(message, 72, false);

      const duration = Date.now() - start;
      console.log(`    Large message (10KB): ${duration}ms`);
      expect(duration).toBeLessThan(2000);
    }, 5000);

    test('should create switch with very large message (100 KB) in < 5s', async () => {
      const message = 'A'.repeat(100 * 1024);
      const start = Date.now();

      await createSwitch(message, 72, false);

      const duration = Date.now() - start;
      console.log(`    Very large message (100KB): ${duration}ms`);
      expect(duration).toBeLessThan(5000);
    }, 10000);

    test('should create switch with Bitcoin timelock in < 2s', async () => {
      const message = 'Test message';
      const start = Date.now();

      await createSwitch(message, 72, true, 'password123');

      const duration = Date.now() - start;
      console.log(`    With Bitcoin timelock: ${duration}ms`);
      expect(duration).toBeLessThan(2000);
    }, 5000);
  });

  describe('Shamir secret sharing performance', () => {
    test('should split small secret (32 bytes) in < 50ms', async () => {
      const secret = crypto.randomBytes(32);
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await split(new Uint8Array(secret), 5, 3);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Split 32B secret (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(50);
    });

    test('should combine 3 shares in < 50ms', async () => {
      const secret = crypto.randomBytes(32);
      const shares = await split(new Uint8Array(secret), 5, 3);
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await combine([shares[0], shares[1], shares[2]]);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Combine 3 shares (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(50);
    });

    test('should split large secret (1 KB) in < 100ms', async () => {
      const secret = crypto.randomBytes(1024);
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await split(new Uint8Array(secret), 5, 3);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Split 1KB secret (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(100);
    });
  });

  describe('Encryption/Decryption performance', () => {
    test('should encrypt small data (100 bytes) in < 10ms', () => {
      const data = Buffer.from('A'.repeat(100));
      const key = crypto.randomBytes(32);
      const iterations = 100;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        encrypt(data, key);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Encrypt 100B (avg of ${iterations}): ${avgDuration.toFixed(3)}ms`);
      expect(avgDuration).toBeLessThan(10);
    });

    test('should decrypt small data (100 bytes) in < 10ms', () => {
      const data = Buffer.from('A'.repeat(100));
      const key = crypto.randomBytes(32);
      const { ciphertext, iv, authTag } = encrypt(data, key);
      const iterations = 100;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        decrypt(ciphertext, key, iv, authTag);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Decrypt 100B (avg of ${iterations}): ${avgDuration.toFixed(3)}ms`);
      expect(avgDuration).toBeLessThan(10);
    });

    test('should encrypt large data (10 KB) in < 50ms', () => {
      const data = Buffer.from('A'.repeat(10 * 1024));
      const key = crypto.randomBytes(32);
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        encrypt(data, key);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Encrypt 10KB (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(50);
    });

    test('should decrypt large data (10 KB) in < 50ms', () => {
      const data = Buffer.from('A'.repeat(10 * 1024));
      const key = crypto.randomBytes(32);
      const { ciphertext, iv, authTag } = encrypt(data, key);
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        decrypt(ciphertext, key, iv, authTag);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Decrypt 10KB (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(50);
    });
  });

  describe('Key derivation performance', () => {
    test('should derive key from password in < 500ms', async () => {
      const password = 'test-password';
      const salt = crypto.randomBytes(16);
      const iterations = 5;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await deriveKey(password, salt);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Derive key (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(500);
    }, 10000);

    test('should derive multiple keys consistently', async () => {
      const password = 'test-password';
      const salt = crypto.randomBytes(16);
      const iterations = 5;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await deriveKey(password, salt);
        durations.push(Date.now() - start);
      }

      // Check variance is low (consistent timing)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / iterations;
      const stdDev = Math.sqrt(variance);

      console.log(`    Key derivation stddev: ${stdDev.toFixed(2)}ms`);
      expect(stdDev).toBeLessThan(100); // Low variance
    }, 10000);
  });

  describe('Bitcoin script generation performance', () => {
    test('should generate timelock script in < 10ms', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      const locktime = 1000;
      const publicKey = Buffer.alloc(33, 0x02);
      const iterations = 100;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        testnetClient.createTimelockScript(locktime, publicKey);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Generate script (avg of ${iterations}): ${avgDuration.toFixed(3)}ms`);
      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('File I/O performance', () => {
    test('should write switch data to disk in < 100ms', async () => {
      const iterations = 10;
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await createSwitch(`Test ${i}`, 72, false);
        durations.push(Date.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / iterations;
      console.log(`    Create and save switch (avg of ${iterations}): ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeLessThan(100);
    }, 5000);

    test('should handle rapid sequential writes', async () => {
      const count = 50;
      const start = Date.now();

      for (let i = 0; i < count; i++) {
        await createSwitch(`Test ${i}`, 72, false);
      }

      const duration = Date.now() - start;
      const avgPerWrite = duration / count;
      console.log(`    ${count} sequential writes: ${duration}ms (${avgPerWrite.toFixed(2)}ms avg)`);
      expect(avgPerWrite).toBeLessThan(200);
    }, 30000);
  });

  describe('Throughput benchmarks', () => {
    test('should measure switches per second (small messages)', async () => {
      const duration = 2000; // 2 seconds
      const start = Date.now();
      let count = 0;

      while (Date.now() - start < duration) {
        await createSwitch('Small message', 72, false);
        count++;
      }

      const actualDuration = Date.now() - start;
      const throughput = (count / actualDuration) * 1000;
      console.log(`    Throughput: ${throughput.toFixed(2)} switches/sec (${count} in ${actualDuration}ms)`);
      expect(throughput).toBeGreaterThan(1); // At least 1 switch per second
    }, 10000);

    test('should measure encryption throughput (MB/s)', () => {
      const key = crypto.randomBytes(32);
      const dataSize = 1024 * 1024; // 1 MB
      const data = Buffer.alloc(dataSize, 'A');
      const iterations = 10;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        encrypt(data, key);
      }
      const duration = Date.now() - start;

      const totalMB = (dataSize * iterations) / (1024 * 1024);
      const throughput = (totalMB / duration) * 1000;
      console.log(`    Encryption throughput: ${throughput.toFixed(2)} MB/s`);
      expect(throughput).toBeGreaterThan(10); // At least 10 MB/s
    }, 10000);
  });
});