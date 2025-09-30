'use strict';

// Failure Mode Integration Tests
// Tests error handling and resilience across ECHOLOCK components

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as dms from '../../src/core/deadManSwitch.js';
import { setupTestEnvironment, teardownTestEnvironment, createTestMessage } from '../helpers/testCleanup.js';
import { TimeController } from '../helpers/timeTravel.js';
import {
  setMockBlockHeight,
  addMockUTXOs,
  resetMockBitcoin,
  MockBlockstreamAPI
} from '../helpers/testBitcoinRPC.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Mock Bitcoin client that can fail
let mockBitcoinAPI;

jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  getCurrentBlockHeight: jest.fn(async () => {
    if (mockBitcoinAPI && mockBitcoinAPI.shouldFail) {
      throw new Error('Bitcoin API unavailable');
    }
    return mockBitcoinAPI ? mockBitcoinAPI.getCurrentBlockHeight() : 2500000;
  }),
  getBlockAtHeight: jest.fn(async (h) => {
    if (mockBitcoinAPI && mockBitcoinAPI.shouldFail) {
      throw new Error('Bitcoin API unavailable');
    }
    return mockBitcoinAPI ? mockBitcoinAPI.getBlockAtHeight(h) : { height: h };
  }),
  getFeeEstimates: jest.fn(async () => {
    if (mockBitcoinAPI && mockBitcoinAPI.shouldFail) {
      throw new Error('Bitcoin API unavailable');
    }
    return { fastest: 20, halfHour: 15, hour: 10, economy: 5 };
  }),
  createTimelockScript: jest.fn((locktime, pubkey) => Buffer.from('mock_script')),
  createTimelockAddress: jest.fn(() => 'tb1qmock_timelock_address'),
  createTimelockTransaction: jest.fn((locktime, pubkey) => ({
    locktime,
    address: 'tb1qmock_timelock_address',
    script: 'mock_script_hex',
    scriptAsm: 'OP_CHECKLOCKTIMEVERIFY',
    network: 'testnet',
    isReady: false
  })),
  getTimelockStatus: jest.fn(async (locktime) => {
    if (mockBitcoinAPI && mockBitcoinAPI.shouldFail) {
      throw new Error('Bitcoin API unavailable');
    }
    const currentHeight = mockBitcoinAPI ? await mockBitcoinAPI.getCurrentBlockHeight() : 2500000;
    return {
      type: 'block-height',
      locktime,
      currentHeight,
      blocksRemaining: Math.max(0, locktime - currentHeight),
      isValid: locktime <= currentHeight
    };
  })
}));

describe('ECHOLOCK Failure Mode Tests', () => {
  let timeController;

  beforeEach(() => {
    setupTestEnvironment();
    timeController = new TimeController();
    resetMockBitcoin();
    mockBitcoinAPI = new MockBlockstreamAPI();
    setMockBlockHeight(2500000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (timeController.isActive) {
      timeController.stop();
    }
    teardownTestEnvironment();
  });

  describe('Corrupted fragment data', () => {
    it('should fail reconstruction with corrupted fragment', async () => {
      const message = createTestMessage('corrupted');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Corrupt fragment data by modifying the file
      const fragmentsFile = path.join(projectRoot, 'data', 'test', 'fragments.json');
      const fragments = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));

      // Corrupt one share
      if (fragments[result.switchId]?.shares) {
        fragments[result.switchId].shares[0] = 'CORRUPTED_DATA!!!';
        fs.writeFileSync(fragmentsFile, JSON.stringify(fragments, null, 2));
      }

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should fail due to corruption)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('failed');
    });

    it('should fail with corrupted ciphertext', async () => {
      const message = createTestMessage('corrupted-ciphertext');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Corrupt the encrypted message
      const switchesFile = path.join(projectRoot, 'data', 'test', 'switches.json');
      const switches = JSON.parse(fs.readFileSync(switchesFile, 'utf8'));

      if (switches[result.switchId]) {
        switches[result.switchId].encryptedMessage.ciphertext = 'CORRUPTED_CIPHERTEXT';
        fs.writeFileSync(switchesFile, JSON.stringify(switches, null, 2));
      }

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should fail)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(false);
    });

    it('should fail with corrupted auth tag', async () => {
      const message = createTestMessage('corrupted-authtag');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Corrupt the auth tag
      const switchesFile = path.join(projectRoot, 'data', 'test', 'switches.json');
      const switches = JSON.parse(fs.readFileSync(switchesFile, 'utf8'));

      if (switches[result.switchId]) {
        switches[result.switchId].encryptedMessage.authTag = Buffer.from('wrong_auth_tag').toString('base64');
        fs.writeFileSync(switchesFile, JSON.stringify(switches, null, 2));
      }

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should fail due to auth tag mismatch)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(false);
    });
  });

  describe('Missing fragments', () => {
    it('should fail with only 2 of 5 fragments available', async () => {
      const message = createTestMessage('insufficient-fragments');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Remove fragments (keep only 2, need 3)
      const fragmentsFile = path.join(projectRoot, 'data', 'test', 'fragments.json');
      const fragments = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));

      if (fragments[result.switchId]?.shares) {
        fragments[result.switchId].shares = fragments[result.switchId].shares.slice(0, 2);
        fs.writeFileSync(fragmentsFile, JSON.stringify(fragments, null, 2));
      }

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should fail - need 3, have 2)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('failed');
    });

    it('should succeed with exactly 3 of 5 fragments', async () => {
      const message = createTestMessage('exact-threshold');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Keep exactly 3 fragments
      const fragmentsFile = path.join(projectRoot, 'data', 'test', 'fragments.json');
      const fragments = JSON.parse(fs.readFileSync(fragmentsFile, 'utf8'));

      if (fragments[result.switchId]?.shares) {
        fragments[result.switchId].shares = fragments[result.switchId].shares.slice(0, 3);
        fs.writeFileSync(fragmentsFile, JSON.stringify(fragments, null, 2));
      }

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should succeed with threshold met)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
    });

    it('should fail with no fragments file', async () => {
      const message = createTestMessage('no-fragments');
      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 0.001, false);

      // Delete fragments file
      const fragmentsFile = path.join(projectRoot, 'data', 'test', 'fragments.json');
      fs.unlinkSync(fragmentsFile);

      // Advance time
      timeController.advanceHours(0.002);

      // Attempt release (should fail)
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('not found');
    });
  });

  describe('Wrong password for Bitcoin key decryption', () => {
    it('should fail decryption with incorrect password', async () => {
      const message = createTestMessage('wrong-password');
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch with Bitcoin
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Add UTXOs
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Make timelock valid
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release with wrong password
      const releaseResult = await dms.testRelease(result.switchId, wrongPassword, true);

      // Should fail during decryption or reconstruction
      expect(releaseResult.success).toBe(false);
    });

    it('should succeed with correct password', async () => {
      const message = createTestMessage('correct-password');
      const password = 'correct-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch with Bitcoin
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Add UTXOs
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Make timelock valid
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release with correct password
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
      expect(releaseResult.bitcoinTx.success).toBe(true);
    });

    it('should fail with empty password', async () => {
      const message = createTestMessage('empty-password');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Make timelock valid
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release with empty password
      const releaseResult = await dms.testRelease(result.switchId, '', true);

      expect(releaseResult.success).toBe(false);
    });
  });

  describe('Bitcoin API unavailable', () => {
    it('should fail gracefully when Bitcoin API is down during creation', async () => {
      const message = createTestMessage('api-down-create');
      const password = 'test-password';

      // Set API to fail
      mockBitcoinAPI.setFailureMode(true);

      // Attempt to create switch (should handle error)
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Should create switch but with Bitcoin error
      expect(result.switchId).toBeDefined();
      expect(result.bitcoin).toBeDefined();
      expect(result.bitcoin.enabled).toBe(false);
      expect(result.bitcoin.error).toBeDefined();
    });

    it('should fail when Bitcoin API is down during status check', async () => {
      const message = createTestMessage('api-down-status');
      const password = 'test-password';

      // Create switch with API working
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Now make API fail
      mockBitcoinAPI.setFailureMode(true);

      // Check status with Bitcoin info (should handle error)
      const status = await dms.getStatus(result.switchId, true);

      // Should return status but with Bitcoin error
      expect(status.found).toBe(true);
      expect(status.bitcoin).toBeDefined();
    });

    it('should recover when API comes back online', async () => {
      const message = createTestMessage('api-recovery');
      const password = 'test-password';

      // Start with working API
      mockBitcoinAPI.setFailureMode(false);
      setMockBlockHeight(2500000);

      const result = await dms.createSwitch(message, 0.01, true, password);
      expect(result.bitcoin.enabled).toBe(true);

      // API goes down
      mockBitcoinAPI.setFailureMode(true);
      let status1 = await dms.getStatus(result.switchId, true);
      // Should handle gracefully

      // API comes back
      mockBitcoinAPI.setFailureMode(false);
      let status2 = await dms.getStatus(result.switchId, true);

      expect(status2.found).toBe(true);
      expect(status2.bitcoin).toBeDefined();
    });
  });

  describe('No UTXOs available', () => {
    it('should fail when timelock address has no UTXOs', async () => {
      const message = createTestMessage('no-utxos');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Make timelock valid but DON'T add UTXOs
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release (should fail - no UTXOs to spend)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      // May succeed message reconstruction but fail Bitcoin tx
      if (releaseResult.success) {
        expect(releaseResult.bitcoinTx.success).toBe(false);
        expect(releaseResult.bitcoinTx.error).toContain('No UTXOs');
      }
    });

    it('should fail when UTXOs are insufficient for fees', async () => {
      const message = createTestMessage('insufficient-utxos');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Add VERY small UTXO (not enough for fees + dust)
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100, confirmed: true, status: { confirmed: true } }
      ]);

      // Make timelock valid
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release (should fail - insufficient value)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      if (releaseResult.success) {
        expect(releaseResult.bitcoinTx.success).toBe(false);
      }
    });

    it('should succeed with sufficient UTXOs', async () => {
      const message = createTestMessage('sufficient-utxos');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, 0.01, true, password);

      // Add sufficient UTXO
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Make timelock valid
      setMockBlockHeight(result.bitcoin.timelockHeight + 10);
      timeController.advanceHours(0.02);

      // Attempt release (should succeed)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.bitcoinTx.success).toBe(true);
      expect(releaseResult.bitcoinTx.details.totalInput).toBeGreaterThanOrEqual(100000);
    });
  });

  describe('Edge cases', () => {
    it('should handle non-existent switch ID', async () => {
      const fakeId = 'non_existent_switch_id';

      const status = await dms.getStatus(fakeId);
      expect(status.found).toBe(false);

      const releaseResult = await dms.testRelease(fakeId);
      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('not found');
    });

    it('should handle multiple releases of same switch', async () => {
      const message = createTestMessage('double-release');
      timeController.start();

      const result = await dms.createSwitch(message, 0.001, false);

      timeController.advanceHours(0.002);

      // First release
      const release1 = await dms.testRelease(result.switchId);
      expect(release1.success).toBe(true);

      // Second release (should still work - read-only operation)
      const release2 = await dms.testRelease(result.switchId);
      expect(release2.success).toBe(true);
      expect(release2.reconstructedMessage).toBe(message);
    });

    it('should handle corrupted switches file', async () => {
      const switchesFile = path.join(projectRoot, 'data', 'test', 'switches.json');

      // Write invalid JSON
      fs.writeFileSync(switchesFile, 'INVALID JSON{{{');

      // Should handle gracefully
      expect(() => {
        dms.listSwitches();
      }).toThrow();
    });

    it('should handle missing data directory', async () => {
      const testDataDir = path.join(projectRoot, 'data', 'test');

      // Remove test data directory
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      }

      // Operations should recreate or handle gracefully
      const switches = dms.listSwitches();
      expect(Array.isArray(switches)).toBe(true);
    });
  });
});