'use strict';

// Timing Integration Tests
// Tests time synchronization between app timer and Bitcoin timelock

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as dms from '../../src/core/deadManSwitch.js';
import { setupTestEnvironment, teardownTestEnvironment, createTestMessage } from '../helpers/testCleanup.js';
import { TimeController } from '../helpers/timeTravel.js';
import {
  setMockBlockHeight,
  advanceBlocks,
  getMockBlockHeight,
  addMockUTXOs,
  resetMockBitcoin
} from '../helpers/testBitcoinRPC.js';

// Mock Bitcoin client
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  getCurrentBlockHeight: jest.fn(async () => getMockBlockHeight()),
  getBlockAtHeight: jest.fn(async (h) => ({ height: h, timestamp: Math.floor(Date.now() / 1000) })),
  getFeeEstimates: jest.fn(async () => ({ fastest: 20, halfHour: 15, hour: 10, economy: 5 })),
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
    const currentHeight = getMockBlockHeight();
    return {
      type: 'block-height',
      locktime,
      currentHeight,
      blocksRemaining: Math.max(0, locktime - currentHeight),
      isValid: locktime <= currentHeight
    };
  })
}));

describe('ECHOLOCK Timing Tests', () => {
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

  describe('Application timer vs Bitcoin timelock synchronization', () => {
    it('should have app timer expire before Bitcoin timelock', async () => {
      const message = createTestMessage('app-before-btc');
      const password = 'test-password';
      const checkInHours = 1; // 1 hour = 6 blocks at 10 min/block

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Calculate expected timelock (~6 blocks for 1 hour)
      const expectedBlocks = Math.ceil((checkInHours * 60) / 10);
      expect(timelockHeight).toBeGreaterThanOrEqual(2500000 + expectedBlocks);

      // Advance app time past expiry (but not blocks)
      timeController.advanceHours(checkInHours + 0.1);

      // Check app status
      const appStatus = await dms.getStatus(result.switchId);
      expect(appStatus.isExpired).toBe(true); // App timer expired

      // Check Bitcoin timelock
      const btcStatus = await dms.getStatus(result.switchId, true);
      expect(btcStatus.bitcoin.blocksRemaining).toBeGreaterThan(0); // Bitcoin not valid yet

      // Attempt release (should fail due to Bitcoin)
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      const releaseResult = await dms.testRelease(result.switchId, password, true);
      expect(releaseResult.success).toBe(false);
      expect(releaseResult.message).toContain('timelock not yet valid');
    });

    it('should succeed when both timers are valid', async () => {
      const message = createTestMessage('both-valid');
      const password = 'test-password';
      const checkInHours = 1;

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Advance BOTH time and blocks
      timeController.advanceHours(checkInHours + 0.1);
      const blocksToAdvance = timelockHeight - 2500000 + 10; // Extra buffer
      advanceBlocks(blocksToAdvance);

      // Both should be valid now
      const status = await dms.getStatus(result.switchId, true);
      expect(status.isExpired).toBe(true); // App timer
      expect(status.bitcoin.isValid).toBe(true); // Bitcoin timelock

      // Release should succeed
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      const releaseResult = await dms.testRelease(result.switchId, password, true);
      expect(releaseResult.success).toBe(true);
      expect(releaseResult.reconstructedMessage).toBe(message);
    });

    it('should handle blocks advancing faster than expected', async () => {
      const message = createTestMessage('fast-blocks');
      const password = 'test-password';
      const checkInHours = 10; // 10 hours = ~60 blocks

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Blocks advance very fast (faster than 10 min/block)
      // Simulate 100 blocks in just 5 hours
      advanceBlocks(100);
      timeController.advanceHours(5);

      // Bitcoin timelock valid but app timer not expired yet
      const status = await dms.getStatus(result.switchId, true);
      expect(status.isExpired).toBe(false); // App timer still active
      expect(status.bitcoin.isValid).toBe(true); // Bitcoin valid (blocks advanced)

      // Can't release - app timer not expired (even though Bitcoin is)
      // This is correct behavior - need BOTH conditions
    });

    it('should handle blocks advancing slower than expected', async () => {
      const message = createTestMessage('slow-blocks');
      const password = 'test-password';
      const checkInHours = 1;

      timeController.start();
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, checkInHours, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Advance app time past expiry
      timeController.advanceHours(checkInHours + 1);

      // But blocks advance very slowly (only 2 blocks in 2 hours)
      advanceBlocks(2);

      // App expired but Bitcoin not valid
      const status = await dms.getStatus(result.switchId, true);
      expect(status.isExpired).toBe(true); // App timer expired
      expect(status.bitcoin.isValid).toBe(false); // Bitcoin not valid

      // Can't release - Bitcoin timelock not valid
      addMockUTXOs(result.bitcoin.address, [
        { txid: 'mock_tx', vout: 0, value: 100000, confirmed: true, status: { confirmed: true } }
      ]);

      const releaseResult = await dms.testRelease(result.switchId, password, true);
      expect(releaseResult.success).toBe(false);
    });
  });

  describe('Clock skew scenarios', () => {
    it('should handle system time in the past', async () => {
      const message = createTestMessage('past-time');
      const password = 'test-password';

      // Start with time in the past
      const pastTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      timeController.start(pastTime);
      setMockBlockHeight(2500000);

      // Create switch (should still work)
      const result = await dms.createSwitch(message, 1, true, password);
      expect(result.switchId).toBeDefined();

      // Time is already "expired" relative to real time but not in our mock
      const status = await dms.getStatus(result.switchId);
      expect(status.isExpired).toBe(false); // Not expired in mock time
    });

    it('should handle system time in the future', async () => {
      const message = createTestMessage('future-time');
      const password = 'test-password';

      // Start with time in the future
      const futureTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours ahead
      timeController.start(futureTime);
      setMockBlockHeight(2500000);

      // Create switch
      const result = await dms.createSwitch(message, 1, true, password);
      expect(result.switchId).toBeDefined();

      // Everything works normally in mock time
      const status = await dms.getStatus(result.switchId);
      expect(status.found).toBe(true);
    });

    it('should handle sudden time jumps forward', async () => {
      const message = createTestMessage('time-jump-forward');

      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 2, false);

      // Check status
      let status1 = await dms.getStatus(result.switchId);
      expect(status1.isExpired).toBe(false);

      // Sudden jump forward 3 hours
      timeController.advanceHours(3);

      // Should now be expired
      let status2 = await dms.getStatus(result.switchId);
      expect(status2.isExpired).toBe(true);
    });

    it('should handle time going backwards (system clock adjustment)', async () => {
      const message = createTestMessage('time-backwards');

      timeController.start();

      // Create switch
      const result = await dms.createSwitch(message, 1, false);

      // Advance time
      timeController.advanceHours(0.5);

      const currentTime = timeController.getCurrentTime();

      // Time goes backwards
      timeController.setTime(currentTime - (30 * 60 * 1000)); // Back 30 minutes

      // Status should still be calculable
      const status = await dms.getStatus(result.switchId);
      expect(status.found).toBe(true);
    });
  });

  describe('Race conditions in concurrent check-ins', () => {
    it('should handle rapid successive check-ins', async () => {
      const message = createTestMessage('rapid-checkins');

      timeController.start();

      const result = await dms.createSwitch(message, 1, false);

      // Perform many check-ins rapidly
      for (let i = 0; i < 10; i++) {
        const checkInResult = dms.checkIn(result.switchId);
        expect(checkInResult.success).toBe(true);
      }

      const status = await dms.getStatus(result.switchId);
      expect(status.checkInCount).toBe(10);
      expect(status.status).toBe('ARMED');
    });

    it('should handle check-in during expiry window', async () => {
      const message = createTestMessage('checkin-during-expiry');

      timeController.start();

      const result = await dms.createSwitch(message, 0.001, false); // ~3.6 seconds

      // Advance to exact expiry time
      timeController.advanceHours(0.001);

      // Check-in at expiry boundary
      const checkInResult = dms.checkIn(result.switchId);

      // Should still allow check-in
      expect(checkInResult.success).toBe(true);

      const status = await dms.getStatus(result.switchId);
      expect(status.status).toBe('ARMED'); // Reset to ARMED
    });

    it('should prevent check-in after status becomes TRIGGERED', async () => {
      const message = createTestMessage('no-checkin-after-trigger');

      timeController.start();

      const result = await dms.createSwitch(message, 0.001, false);

      // Advance past expiry
      timeController.advanceHours(0.002);

      // Check status to trigger state change
      const status1 = await dms.getStatus(result.switchId);
      expect(status1.status).toBe('TRIGGERED');

      // Now try to check-in (should fail)
      const checkInResult = dms.checkIn(result.switchId);
      expect(checkInResult.success).toBe(false);
      expect(checkInResult.message).toContain('triggered');
    });
  });

  describe('Expiry edge cases', () => {
    it('should handle expiry at exact boundary', async () => {
      const message = createTestMessage('exact-expiry');

      timeController.start();
      const startTime = timeController.getCurrentTime();

      const result = await dms.createSwitch(message, 1, false);

      // Advance to 1ms before expiry
      const expiryTime = result.expiryTime;
      timeController.setTime(expiryTime - 1);

      const status1 = await dms.getStatus(result.switchId);
      expect(status1.isExpired).toBe(false);
      expect(status1.timeRemaining).toBeLessThan(10); // Very close

      // Advance to exact expiry
      timeController.setTime(expiryTime);

      const status2 = await dms.getStatus(result.switchId);
      expect(status2.isExpired).toBe(true);
      expect(status2.timeRemaining).toBe(0);
    });

    it('should handle multiple switches with different expiry times', async () => {
      timeController.start();

      // Create 3 switches with different expiry times
      const switch1 = await dms.createSwitch(createTestMessage('1'), 0.001, false);
      const switch2 = await dms.createSwitch(createTestMessage('2'), 0.002, false);
      const switch3 = await dms.createSwitch(createTestMessage('3'), 0.003, false);

      // Check all not expired
      expect((await dms.getStatus(switch1.switchId)).isExpired).toBe(false);
      expect((await dms.getStatus(switch2.switchId)).isExpired).toBe(false);
      expect((await dms.getStatus(switch3.switchId)).isExpired).toBe(false);

      // Advance to expire first switch
      timeController.advanceHours(0.0015);

      expect((await dms.getStatus(switch1.switchId)).isExpired).toBe(true);
      expect((await dms.getStatus(switch2.switchId)).isExpired).toBe(false);
      expect((await dms.getStatus(switch3.switchId)).isExpired).toBe(false);

      // Advance to expire second switch
      timeController.advanceHours(0.001);

      expect((await dms.getStatus(switch1.switchId)).isExpired).toBe(true);
      expect((await dms.getStatus(switch2.switchId)).isExpired).toBe(true);
      expect((await dms.getStatus(switch3.switchId)).isExpired).toBe(false);

      // Advance to expire third switch
      timeController.advanceHours(0.002);

      expect((await dms.getStatus(switch1.switchId)).isExpired).toBe(true);
      expect((await dms.getStatus(switch2.switchId)).isExpired).toBe(true);
      expect((await dms.getStatus(switch3.switchId)).isExpired).toBe(true);
    });

    it('should calculate time remaining accurately', async () => {
      const message = createTestMessage('time-remaining');

      timeController.start();

      const result = await dms.createSwitch(message, 2, false); // 2 hours

      // Check initial time remaining
      const status1 = await dms.getStatus(result.switchId);
      const expectedRemaining1 = 2 * 60 * 60 * 1000; // 2 hours in ms
      expect(status1.timeRemaining).toBeGreaterThan(expectedRemaining1 - 100);
      expect(status1.timeRemaining).toBeLessThanOrEqual(expectedRemaining1);

      // Advance 1 hour
      timeController.advanceHours(1);

      const status2 = await dms.getStatus(result.switchId);
      const expectedRemaining2 = 1 * 60 * 60 * 1000; // 1 hour in ms
      expect(status2.timeRemaining).toBeGreaterThan(expectedRemaining2 - 100);
      expect(status2.timeRemaining).toBeLessThanOrEqual(expectedRemaining2);

      // Advance past expiry
      timeController.advanceHours(2);

      const status3 = await dms.getStatus(result.switchId);
      expect(status3.timeRemaining).toBe(0);
    });

    it('should handle very short expiry times', async () => {
      const message = createTestMessage('very-short');

      timeController.start();

      // 1 millisecond expiry (extreme edge case)
      const result = await dms.createSwitch(message, 1 / (60 * 60 * 1000), false);

      // Immediately check status
      const status1 = await dms.getStatus(result.switchId);
      // May or may not be expired depending on timing

      // Advance tiny amount
      timeController.advance(10);

      const status2 = await dms.getStatus(result.switchId);
      expect(status2.isExpired).toBe(true);
    });

    it('should handle very long expiry times', async () => {
      const message = createTestMessage('very-long');

      timeController.start();

      // 1 year expiry
      const result = await dms.createSwitch(message, 365 * 24, false);

      const status = await dms.getStatus(result.switchId);
      expect(status.isExpired).toBe(false);
      expect(status.timeRemaining).toBeGreaterThan(364 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Bitcoin block timing edge cases', () => {
    it('should handle exactly at timelock height', async () => {
      const message = createTestMessage('exact-block-height');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      const result = await dms.createSwitch(message, 1, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Set to exactly the timelock height
      setMockBlockHeight(timelockHeight);

      const status = await dms.getStatus(result.switchId, true);
      expect(status.bitcoin.isValid).toBe(true);
      expect(status.bitcoin.blocksRemaining).toBe(0);
    });

    it('should handle 1 block before timelock', async () => {
      const message = createTestMessage('one-block-before');
      const password = 'test-password';

      timeController.start();
      setMockBlockHeight(2500000);

      const result = await dms.createSwitch(message, 1, true, password);
      const timelockHeight = result.bitcoin.timelockHeight;

      // Set to 1 block before
      setMockBlockHeight(timelockHeight - 1);

      const status = await dms.getStatus(result.switchId, true);
      expect(status.bitcoin.isValid).toBe(false);
      expect(status.bitcoin.blocksRemaining).toBe(1);
    });
  });
});