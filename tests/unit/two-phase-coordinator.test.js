'use strict';

/**
 * Tests for Two-Phase Commit Coordinator
 * Tests the atomic commit protocol between Bitcoin and Nostr
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock Bitcoin testnet client - MUST be before dynamic imports
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  broadcastTransaction: jest.fn(),
  waitForConfirmation: jest.fn(),
  getTransactionStatus: jest.fn(),
  getCurrentBlockHeight: jest.fn()
}));

// Mock Nostr multi-relay client
jest.unstable_mockModule('../../src/nostr/multiRelayClient.js', () => ({
  publishFragment: jest.fn()
}));

// Import after mock setup - use dynamic imports
const { broadcastTransaction, waitForConfirmation, getTransactionStatus } =
  await import('../../src/bitcoin/testnetClient.js');
const { publishFragment } = await import('../../src/nostr/multiRelayClient.js');

const {
  TwoPhaseCoordinator,
  CommitState,
  executeTwoPhaseCommit
} = await import('../../src/bitcoin/twoPhaseCoordinator.js');

// Valid Bitcoin transaction hex for testing (minimal valid transaction)
const VALID_TX_HEX = '0100000001abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890000000006b483045022100abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890220abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789001210312345678901234567890123456789012345678901234567890123456789012ffffffff0100e1f505000000001976a914123456789012345678901234567890123456789088ac00000000';

describe('TwoPhaseCoordinator - State Management', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new TwoPhaseCoordinator();
    jest.clearAllMocks();
  });

  test('should initialize in PENDING state', () => {
    expect(coordinator.state).toBe(CommitState.PENDING);
    expect(coordinator.bitcoinTxid).toBeNull();
    expect(coordinator.phase1Result).toBeNull();
    expect(coordinator.phase2Results).toEqual([]);
  });

  test('should track state transitions', async () => {
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'abc123def456',
      confirmationUrl: 'https://blockstream.info/testnet/tx/abc123def456',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123',
      blockTime: Math.floor(Date.now() / 1000)
    });

    await coordinator.executePhase1(VALID_TX_HEX);

    expect(coordinator.stateHistory.length).toBeGreaterThan(0);
    expect(coordinator.stateHistory[0].from).toBe(CommitState.PENDING);
    expect(coordinator.stateHistory[0].to).toBe(CommitState.PHASE1_BROADCASTING);
  });

  test('should return current status', () => {
    const status = coordinator.getStatus();

    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('bitcoinTxid');
    expect(status).toHaveProperty('phase1Complete');
    expect(status).toHaveProperty('phase2Complete');
    expect(status).toHaveProperty('stateHistory');
    expect(status.state).toBe(CommitState.PENDING);
  });
});

describe('TwoPhaseCoordinator - Phase 1 (Bitcoin)', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new TwoPhaseCoordinator({
      minBitcoinConfirmations: 1,
      bitcoinConfirmationTimeout: 60000,
      bitcoinPollInterval: 5000
    });
    jest.clearAllMocks();
  });

  test('should successfully execute Phase 1', async () => {
    const mockTxid = 'abc123def456';

    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: mockTxid,
      confirmationUrl: `https://blockstream.info/testnet/tx/${mockTxid}`,
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123',
      blockTime: Math.floor(Date.now() / 1000)
    });

    const result = await coordinator.executePhase1(VALID_TX_HEX);

    expect(result.success).toBe(true);
    expect(result.txid).toBe(mockTxid);
    expect(coordinator.state).toBe(CommitState.PHASE1_CONFIRMED);
    expect(coordinator.bitcoinTxid).toBe(mockTxid);
  });

  test('should fail Phase 1 if broadcast fails', async () => {
    broadcastTransaction.mockRejectedValue(new Error('Network error'));

    await expect(coordinator.executePhase1(VALID_TX_HEX))
      .rejects.toThrow('Phase 1 failed');

    expect(coordinator.state).toBe(CommitState.FAILED);
    expect(coordinator.error).toBeTruthy();
  });

  test('should fail Phase 1 if confirmation times out', async () => {
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'abc123',
      confirmationUrl: 'https://blockstream.info/testnet/tx/abc123',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockRejectedValue(
      new Error('Transaction abc123 not confirmed after 60s')
    );

    await expect(coordinator.executePhase1(VALID_TX_HEX))
      .rejects.toThrow('Phase 1 failed');

    expect(coordinator.state).toBe(CommitState.FAILED);
  });

  test('should reject Phase 1 if not in PENDING state', async () => {
    coordinator.state = CommitState.PHASE1_CONFIRMED;

    await expect(coordinator.executePhase1(VALID_TX_HEX))
      .rejects.toThrow('Cannot execute Phase 1 from state PHASE1_CONFIRMED');
  });
});

describe('TwoPhaseCoordinator - Phase 2 (Nostr)', () => {
  let coordinator;

  beforeEach(async () => {
    coordinator = new TwoPhaseCoordinator({
      nostrMinSuccessCount: 5
    });

    // Set up Phase 1 as complete
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'abc123',
      confirmationUrl: 'https://blockstream.info/testnet/tx/abc123',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    await coordinator.executePhase1(VALID_TX_HEX);
    jest.clearAllMocks();
  });

  test('should successfully execute Phase 2', async () => {
    const switchId = 'switch123';
    const fragmentData = [
      {
        index: 0,
        encryptedData: { ciphertext: Buffer.from('ct0'), iv: Buffer.from('iv0'), authTag: Buffer.from('at0') },
        metadata: { salt: Buffer.from('salt0'), iterations: 600000 }
      },
      {
        index: 1,
        encryptedData: { ciphertext: Buffer.from('ct1'), iv: Buffer.from('iv1'), authTag: Buffer.from('at1') },
        metadata: { salt: Buffer.from('salt1'), iterations: 600000 }
      }
    ];

    const nostrKeys = {
      privkey: new Uint8Array(32),
      pubkey: new Uint8Array(32)
    };

    const relayUrls = [
      'wss://relay1.com', 'wss://relay2.com', 'wss://relay3.com',
      'wss://relay4.com', 'wss://relay5.com', 'wss://relay6.com',
      'wss://relay7.com'
    ];

    const expiryTimestamp = Math.floor(Date.now() / 1000) + 86400;

    publishFragment.mockResolvedValue({
      eventId: 'event123',
      successCount: 7,
      failures: []
    });

    const result = await coordinator.executePhase2(
      switchId,
      fragmentData,
      nostrKeys,
      relayUrls,
      expiryTimestamp
    );

    expect(result.success).toBe(true);
    expect(result.fragmentsPublished).toBe(2);
    expect(coordinator.state).toBe(CommitState.COMMITTED);
    expect(publishFragment).toHaveBeenCalledTimes(2);

    // Verify Bitcoin TXID was linked
    expect(publishFragment).toHaveBeenCalledWith(
      switchId,
      expect.any(Number),
      expect.any(Object),
      expect.any(Object),
      nostrKeys,
      relayUrls,
      expiryTimestamp,
      'abc123' // Bitcoin TXID from Phase 1
    );
  });

  test('should fail Phase 2 if insufficient relay success', async () => {
    const switchId = 'switch123';
    const fragmentData = [{
      index: 0,
      encryptedData: { ciphertext: Buffer.from('ct'), iv: Buffer.from('iv'), authTag: Buffer.from('at') },
      metadata: { salt: Buffer.from('salt'), iterations: 600000 }
    }];

    publishFragment.mockResolvedValue({
      eventId: 'event123',
      successCount: 3, // Less than required 5
      failures: [{ url: 'wss://relay4.com', error: 'Timeout' }]
    });

    await expect(coordinator.executePhase2(
      switchId,
      fragmentData,
      { privkey: new Uint8Array(32), pubkey: new Uint8Array(32) },
      Array(7).fill('wss://relay.com'),
      Math.floor(Date.now() / 1000)
    )).rejects.toThrow(/insufficient relay success/i);

    expect(coordinator.state).toBe(CommitState.FAILED);
  });

  test('should reject Phase 2 if Phase 1 not confirmed', async () => {
    const newCoordinator = new TwoPhaseCoordinator();

    await expect(newCoordinator.executePhase2(
      'switch123',
      [],
      {},
      [],
      123456
    )).rejects.toThrow('Cannot execute Phase 2 from state PENDING');
  });

  test('should reject Phase 2 without Bitcoin TXID by default', async () => {
    const newCoordinator = new TwoPhaseCoordinator({
      allowNostrPublishWithoutBitcoin: false
    });

    // Manually set state to bypass Phase 1
    newCoordinator.state = CommitState.PHASE1_CONFIRMED;

    await expect(newCoordinator.executePhase2(
      'switch123',
      [],
      {},
      [],
      123456
    )).rejects.toThrow('Cannot publish to Nostr without Bitcoin TXID');
  });
});

describe('TwoPhaseCoordinator - Full Commit', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new TwoPhaseCoordinator({
      minBitcoinConfirmations: 1,
      nostrMinSuccessCount: 5
    });
    jest.clearAllMocks();
  });

  test('should execute full two-phase commit successfully', async () => {
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'fullcommit123',
      confirmationUrl: 'https://blockstream.info/testnet/tx/fullcommit123',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    publishFragment.mockResolvedValue({
      eventId: 'event123',
      successCount: 7,
      failures: []
    });

    const params = {
      txHex: VALID_TX_HEX,
      txMetadata: { amount: 100000, fee: 1000 },
      switchId: 'switch123',
      fragmentData: [{
        index: 0,
        encryptedData: { ciphertext: Buffer.from('ct'), iv: Buffer.from('iv'), authTag: Buffer.from('at') },
        metadata: { salt: Buffer.from('salt'), iterations: 600000 }
      }],
      nostrKeys: { privkey: new Uint8Array(32), pubkey: new Uint8Array(32) },
      relayUrls: Array(7).fill('wss://relay.com'),
      expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
    };

    const result = await coordinator.commit(params);

    expect(result.success).toBe(true);
    expect(result.state).toBe(CommitState.COMMITTED);
    expect(result.bitcoinTxid).toBe('fullcommit123');
    expect(result.phase1).toBeTruthy();
    expect(result.phase2).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);
  });

  test('should handle Phase 1 failure gracefully', async () => {
    broadcastTransaction.mockRejectedValue(new Error('Broadcast failed'));

    const params = {
      txHex: VALID_TX_HEX,
      txMetadata: {},
      switchId: 'switch123',
      fragmentData: [],
      nostrKeys: {},
      relayUrls: [],
      expiryTimestamp: 123456
    };

    const result = await coordinator.commit(params);

    expect(result.success).toBe(false);
    expect(result.state).toBe(CommitState.FAILED);
    expect(result.error).toMatch(/Phase 1 failed/);
  });

  test('should handle Phase 2 failure gracefully', async () => {
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'phase2fail123',
      confirmationUrl: 'https://blockstream.info/testnet/tx/phase2fail123',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000
    });

    publishFragment.mockRejectedValue(new Error('Relay connection failed'));

    const params = {
      txHex: VALID_TX_HEX,
      txMetadata: {},
      switchId: 'switch123',
      fragmentData: [{
        index: 0,
        encryptedData: { ciphertext: Buffer.from('ct'), iv: Buffer.from('iv'), authTag: Buffer.from('at') },
        metadata: { salt: Buffer.from('salt'), iterations: 600000 }
      }],
      nostrKeys: { privkey: new Uint8Array(32), pubkey: new Uint8Array(32) },
      relayUrls: Array(7).fill('wss://relay.com'),
      expiryTimestamp: 123456
    };

    const result = await coordinator.commit(params);

    expect(result.success).toBe(false);
    expect(result.state).toBe(CommitState.FAILED);
    expect(result.error).toMatch(/Phase 2 failed/);
    expect(result.bitcoinTxid).toBe('phase2fail123'); // Bitcoin tx succeeded
  });
});

describe('TwoPhaseCoordinator - Rollback', () => {
  test('should allow rollback from failed state', async () => {
    const coordinator = new TwoPhaseCoordinator();
    coordinator.state = CommitState.FAILED;
    coordinator.bitcoinTxid = 'failed123';

    const result = await coordinator.rollback();

    expect(result.success).toBe(true);
    expect(result.bitcoinTxid).toBe('failed123');
    expect(coordinator.state).toBe(CommitState.ROLLED_BACK);
  });

  test('should reject rollback from committed state', async () => {
    const coordinator = new TwoPhaseCoordinator();
    coordinator.state = CommitState.COMMITTED;

    await expect(coordinator.rollback())
      .rejects.toThrow('Cannot rollback committed transaction');
  });
});

describe('TwoPhaseCoordinator - Helper Functions', () => {
  test('should check if committed', () => {
    const coordinator = new TwoPhaseCoordinator();
    expect(coordinator.isCommitted()).toBe(false);

    coordinator.state = CommitState.COMMITTED;
    expect(coordinator.isCommitted()).toBe(true);
  });

  test('should check if failed', () => {
    const coordinator = new TwoPhaseCoordinator();
    expect(coordinator.isFailed()).toBe(false);

    coordinator.state = CommitState.FAILED;
    expect(coordinator.isFailed()).toBe(true);
  });
});

describe('executeTwoPhaseCommit - Simplified Interface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute commit with default options', async () => {
    broadcastTransaction.mockResolvedValue({
      success: true,
      txid: 'simplified123',
      confirmationUrl: 'https://blockstream.info/testnet/tx/simplified123',
      broadcastedAt: new Date().toISOString()
    });

    waitForConfirmation.mockResolvedValue({
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000
    });

    publishFragment.mockResolvedValue({
      eventId: 'event123',
      successCount: 7,
      failures: []
    });

    const params = {
      txHex: VALID_TX_HEX,
      txMetadata: {},
      switchId: 'switch123',
      fragmentData: [{
        index: 0,
        encryptedData: { ciphertext: Buffer.from('ct'), iv: Buffer.from('iv'), authTag: Buffer.from('at') },
        metadata: { salt: Buffer.from('salt'), iterations: 600000 }
      }],
      nostrKeys: { privkey: new Uint8Array(32), pubkey: new Uint8Array(32) },
      relayUrls: Array(7).fill('wss://relay.com'),
      expiryTimestamp: 123456
    };

    const result = await executeTwoPhaseCommit(params);

    expect(result.success).toBe(true);
    expect(result.bitcoinTxid).toBe('simplified123');
  });
});
