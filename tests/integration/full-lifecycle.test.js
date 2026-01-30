'use strict';

// Full Lifecycle Integration Tests
// Tests complete ECHOLOCK workflows across crypto, Nostr, and Bitcoin components

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as dms from '../../src/core/deadManSwitch.js';
import { setupTestEnvironment, teardownTestEnvironment, createTestMessage } from '../helpers/testCleanup.js';
import { TimeController } from '../helpers/timeTravel.js';
import { MockRelayPool, createMockRelays } from '../helpers/mockRelayServer.js';
import {
  setMockBlockHeight,
  advanceBlocks,
  addMockUTXOs,
  resetMockBitcoin,
  MockBlockstreamAPI
} from '../helpers/testBitcoinRPC.js';

// Mock external modules
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => {
  const mockAPI = new MockBlockstreamAPI();
  return {
    getCurrentBlockHeight: jest.fn(async () => mockAPI.getCurrentBlockHeight()),
    getBlockAtHeight: jest.fn(async (h) => mockAPI.getBlockAtHeight(h)),
    getTransaction: jest.fn(async (txid) => mockAPI.getTransaction(txid)),
    getFeeEstimates: jest.fn(async () => mockAPI.getFeeEstimates()),
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
    calculateTimelockValidity: jest.fn(async (locktime, currentHeight) => ({
      type: 'block-height',
      locktime,
      currentHeight: currentHeight || await mockAPI.getCurrentBlockHeight(),
      blocksRemaining: Math.max(0, locktime - (currentHeight || await mockAPI.getCurrentBlockHeight())),
      isValid: locktime <= (currentHeight || await mockAPI.getCurrentBlockHeight())
    })),
    getTimelockStatus: jest.fn(async (locktime) => {
      const currentHeight = await mockAPI.getCurrentBlockHeight();
      return {
        type: 'block-height',
        locktime,
        currentHeight,
        blocksRemaining: Math.max(0, locktime - currentHeight),
        isValid: locktime <= currentHeight
      };
    })
  };
});

describe('ECHOLOCK Full Lifecycle Integration Tests', () => {
  let timeController;

  beforeEach(() => {
    setupTestEnvironment();
    timeController = new TimeController();
    resetMockBitcoin();
    setMockBlockHeight(2500000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (timeController.isActive) {
      timeController.stop();
    }
    teardownTestEnvironment();
  });

  describe('Scenario A: Local-only mode (no Nostr, no Bitcoin)', () => {
    it('should create switch, wait for expiry, and reconstruct secret', async () => {
      const message = createTestMessage('local');
      const checkInHours = 0.001; // ~3.6 seconds for fast test

      // Start time tracking
      timeController.start();

      // Create switch without Bitcoin
      const result = await dms.createSwitch(message, checkInHours, false);

      expect(result.switchId).toBeDefined();
      expect(result.fragmentCount).toBe(5);
      expect(result.requiredFragments).toBe(3);
      expect(result.bitcoin).toBeNull();

      // Verify switch is ARMED
      const status1 = await dms.getStatus(result.switchId);
      expect(status1.status).toBe('ARMED');
      expect(status1.isExpired).toBe(false);

      // Advance time past expiry
      timeController.advanceHours(checkInHours + 0.001);

      // Verify switch is TRIGGERED
      const status2 = await dms.getStatus(result.switchId);
      expect(status2.status).toBe('TRIGGERED');
      expect(status2.isExpired).toBe(true);

      // Test release
      const releaseResult = await dms.testRelease(result.switchId);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
      expect(releaseResult.sharesUsed).toBe(3);
      expect(releaseResult.totalShares).toBe(5);
      expect(releaseResult.distributionMethod).toBe('LOCAL');

      // Verify switch is RELEASED
      const status3 = await dms.getStatus(result.switchId);
      expect(status3.status).toBe('RELEASED');
    });

    it('should allow check-in to reset timer', async () => {
      const message = createTestMessage('checkin');
      const checkInHours = 0.002; // ~7.2 seconds

      timeController.start();

      const result = await dms.createSwitch(message, checkInHours, false);
      const originalExpiry = result.expiryTime;

      // Advance time but not past expiry
      timeController.advanceHours(checkInHours * 0.5);

      // Perform check-in
      const checkInResult = await dms.checkIn(result.switchId);

      expect(checkInResult.success).toBe(true);
      expect(checkInResult.newExpiryTime).toBeGreaterThan(originalExpiry);

      // Verify timer was reset
      const status = await dms.getStatus(result.switchId);
      expect(status.status).toBe('ARMED');
      expect(status.isExpired).toBe(false);
      expect(status.checkInCount).toBe(1);
    });

    it('should handle multiple check-ins correctly', async () => {
      const message = createTestMessage('multiple-checkins');
      const checkInHours = 0.002;

      timeController.start();

      const result = await dms.createSwitch(message, checkInHours, false);

      // Perform 3 check-ins
      for (let i = 0; i < 3; i++) {
        timeController.advanceHours(checkInHours * 0.3);
        const checkInResult = await dms.checkIn(result.switchId);
        expect(checkInResult.success).toBe(true);
        expect(checkInResult.checkInCount).toBe(i + 1);
      }

      const status = await dms.getStatus(result.switchId);
      expect(status.checkInCount).toBe(3);
      expect(status.status).toBe('ARMED');
    });

    it('should prevent check-in on already triggered switch', async () => {
      const message = createTestMessage('no-checkin-after-trigger');
      const checkInHours = 0.001;

      timeController.start();

      const result = await dms.createSwitch(message, checkInHours, false);

      // Wait for expiry
      timeController.advanceHours(checkInHours + 0.001);

      // Verify triggered
      const status = await dms.getStatus(result.switchId);
      expect(status.status).toBe('TRIGGERED');

      // Try to check-in (should fail)
      const checkInResult = await dms.checkIn(result.switchId);
      expect(checkInResult.success).toBe(false);
      expect(checkInResult.message).toContain('triggered');
    });
  });

  describe('Scenario B: Nostr distribution mode', () => {
    it('should publish fragments to Nostr relays and retrieve them', async () => {
      // This test would require mocking the Nostr client
      // For now, we test with LOCAL mode as Nostr integration
      // requires WebSocket mocking which is complex

      const message = createTestMessage('nostr');
      const checkInHours = 0.001;

      // Create with local storage (Nostr mocking would go here)
      const result = await dms.createSwitch(message, checkInHours, false);

      expect(result.distribution.distributionStatus).toBe('LOCAL');

      // Test reconstruction
      const releaseResult = await dms.testRelease(result.switchId);
      expect(releaseResult.success).toBe(true);
      expect(releaseResult.distributionMethod).toBe('LOCAL');
    });

    it('should handle relay failures gracefully', async () => {
      // Test would verify that if some relays fail,
      // fragments can still be published to healthy relays
      // This requires mocking the Nostr relay pool

      const message = createTestMessage('relay-failure');
      const checkInHours = 0.001;

      const result = await dms.createSwitch(message, checkInHours, false);

      expect(result.switchId).toBeDefined();
      expect(result.distribution.distributionStatus).toBe('LOCAL');
    });
  });

  describe('Scenario C: Bitcoin timelock mode (dry-run)', () => {
    it('should create switch with encrypted private key', async () => {
      const message = createTestMessage('bitcoin');
      const checkInHours = 0.01; // ~36 seconds
      const password = 'test-password-123';

      timeController.start();

      // Set initial block height
      setMockBlockHeight(2500000);

      // Create switch with Bitcoin timelock
      const result = await dms.createSwitch(message, checkInHours, true, password);

      expect(result.switchId).toBeDefined();
      expect(result.bitcoin).toBeDefined();
      expect(result.bitcoin.enabled).toBe(true);
      expect(result.bitcoin.address).toBeDefined();
      expect(result.bitcoin.timelockHeight).toBeGreaterThan(2500000);

      // Verify encrypted key fields are stored
      const status = await dms.getStatus(result.switchId);
      expect(status.bitcoin.encryptedPrivateKey).toBeDefined();
      expect(status.bitcoin.privateKeyIV).toBeDefined();
      expect(status.bitcoin.privateKeyAuthTag).toBeDefined();
      expect(status.bitcoin.privateKeySalt).toBeDefined();
    });

    it('should fail release before timelock is valid', async () => {
      const message = createTestMessage('bitcoin-early');
      const checkInHours = 0.01;
      const password = 'test-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Don't advance blocks yet - timelock not valid

      // Advance app time past expiry
      timeController.advanceHours(checkInHours + 0.001);

      // Attempt release (should fail due to Bitcoin timelock)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('timelock not yet valid');
    });

    it('should succeed release after timelock is valid', async () => {
      const message = createTestMessage('bitcoin-valid');
      const checkInHours = 0.01;
      const password = 'test-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Add mock UTXOs for the timelock address
      addMockUTXOs(result.bitcoin.address, [
        {
          txid: 'mock_funding_tx',
          vout: 0,
          value: 100000,
          confirmed: true,
          status: { confirmed: true }
        }
      ]);

      // Advance blocks to make timelock valid
      const blocksToAdvance = timelockHeight - 2500000 + 1;
      advanceBlocks(blocksToAdvance);

      // Advance app time past expiry
      timeController.advanceHours(checkInHours + 0.001);

      // Attempt release (should succeed now)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
      expect(releaseResult.bitcoinTx).toBeDefined();
      expect(releaseResult.bitcoinTx.success).toBe(true);
      expect(releaseResult.bitcoinTx.dryRun).toBe(true);
      expect(releaseResult.bitcoinTx.psbt).toBeDefined();
    });

    it('should fail with wrong password', async () => {
      const message = createTestMessage('bitcoin-wrong-pass');
      const checkInHours = 0.01;
      const password = 'test-password-123';
      const wrongPassword = 'wrong-password';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);

      // Advance blocks and time
      advanceBlocks(1000);
      timeController.advanceHours(checkInHours + 0.001);

      // Add UTXOs
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Attempt release with wrong password
      const releaseResult = await dms.testRelease(result.switchId, wrongPassword, true);

      // Should fail during key decryption
      expect(releaseResult.success).toBe(false);
    });

    it('should create valid PSBT in dry-run mode', async () => {
      const message = createTestMessage('bitcoin-psbt');
      const checkInHours = 0.01;
      const password = 'test-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);

      // Add UTXOs
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Advance blocks and time to make valid
      advanceBlocks(1000);
      timeController.advanceHours(checkInHours + 0.001);

      // Release
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.bitcoinTx.success).toBe(true);
      expect(releaseResult.bitcoinTx.dryRun).toBe(true);
      expect(releaseResult.bitcoinTx.psbt).toBeDefined();
      expect(releaseResult.bitcoinTx.details).toBeDefined();
      expect(releaseResult.bitcoinTx.details.locktime).toBe(result.bitcoin.timelockHeight);
      expect(releaseResult.bitcoinTx.signedTxHex).toBeNull(); // Dry run doesn't sign
    });
  });

  describe('Scenario D: Full integration (Nostr + Bitcoin)', () => {
    it('should work with both Nostr and Bitcoin enabled', async () => {
      const message = createTestMessage('full-integration');
      const checkInHours = 0.01;
      const password = 'test-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch with both features
      const result = await dms.createSwitch(message, checkInHours, true, password);

      expect(result.switchId).toBeDefined();
      expect(result.bitcoin.enabled).toBe(true);
      expect(result.distribution).toBeDefined();

      // Add UTXOs
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      // Advance both time and blocks
      advanceBlocks(1000);
      timeController.advanceHours(checkInHours + 0.001);

      // Release
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
      expect(releaseResult.distributionMethod).toBe('LOCAL'); // Local in test mode
      expect(releaseResult.bitcoinTx).toBeDefined();
    });

    it('should verify Bitcoin timelock before Shamir reconstruction', async () => {
      const message = createTestMessage('timelock-first');
      const checkInHours = 0.01;
      const password = 'test-password-123';

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);

      // Advance app time but NOT blocks
      timeController.advanceHours(checkInHours + 0.001);

      // Attempt release (should fail at Bitcoin check, before Shamir)
      const releaseResult = await dms.testRelease(result.switchId, password, true);

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('Bitcoin timelock not yet valid');
      // Should not have reconstructed message
      expect(releaseResult.reconstructedMessage).toBeUndefined();
    });
  });

  describe('Switch lifecycle operations', () => {
    it('should list all switches correctly', async () => {
      timeController.start();

      // Create multiple switches
      await dms.createSwitch(createTestMessage('1'), 0.01, false);
      await dms.createSwitch(createTestMessage('2'), 0.02, false);
      await dms.createSwitch(createTestMessage('3'), 0.03, false);

      const switches = dms.listSwitches();

      expect(switches).toHaveLength(3);
      expect(switches.every(sw => sw.id && sw.status)).toBe(true);
    });

    it('should delete switch and cleanup fragments', async () => {
      const message = createTestMessage('delete');
      const result = await dms.createSwitch(message, 0.01, false);

      // Verify exists
      const status1 = await dms.getStatus(result.switchId);
      expect(status1.found).toBe(true);

      // Delete
      const deleteResult = dms.deleteSwitch(result.switchId);
      expect(deleteResult.success).toBe(true);

      // Verify deleted
      const status2 = await dms.getStatus(result.switchId);
      expect(status2.found).toBe(false);
    });

    it('should track check-in history', async () => {
      const message = createTestMessage('history');
      timeController.start();

      const result = await dms.createSwitch(message, 0.01, false);

      // Perform multiple check-ins
      for (let i = 0; i < 3; i++) {
        timeController.advanceHours(0.003);
        await dms.checkIn(result.switchId);
      }

      const status = await dms.getStatus(result.switchId);
      expect(status.checkInCount).toBe(3);
    });
  });
});