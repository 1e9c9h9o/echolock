'use strict';

/**
 * Tests for Bitcoin Transaction Monitor
 * Tests transaction monitoring, dropped tx detection, and event emission
 */

import { describe, test, expect, jest, beforeEach, afterEach, beforeAll } from '@jest/globals';

// Mock Bitcoin testnet client - MUST be before dynamic imports
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  getTransactionStatus: jest.fn(),
  getTransaction: jest.fn(),
  getCurrentBlockHeight: jest.fn()
}));

// Import after mock setup
const { getTransactionStatus, getCurrentBlockHeight } =
  await import('../../src/bitcoin/testnetClient.js');

const {
  TransactionMonitor,
  MultiTransactionMonitor,
  monitorTransaction,
  MonitorEvent,
  TxStatus
} = await import('../../src/bitcoin/transactionMonitor.js');

describe('TransactionMonitor - Initialization', () => {
  test('should initialize with default options', () => {
    const monitor = new TransactionMonitor('abc123');

    expect(monitor.txid).toBe('abc123');
    expect(monitor.status).toBe(TxStatus.PENDING);
    expect(monitor.confirmations).toBe(0);
    expect(monitor.isMonitoring).toBe(false);
    expect(monitor.statusHistory.length).toBe(1); // Initial status
  });

  test('should initialize with custom options', () => {
    const monitor = new TransactionMonitor('abc123', {
      pollInterval: 10000,
      targetConfirmations: 6,
      maxMonitorTime: 3600000
    });

    expect(monitor.options.pollInterval).toBe(10000);
    expect(monitor.options.targetConfirmations).toBe(6);
    expect(monitor.options.maxMonitorTime).toBe(3600000);
  });

  test('should track status history', () => {
    const monitor = new TransactionMonitor('abc123');

    expect(monitor.statusHistory[0]).toHaveProperty('status', TxStatus.PENDING);
    expect(monitor.statusHistory[0]).toHaveProperty('reason', 'Monitor initialized');
    expect(monitor.statusHistory[0]).toHaveProperty('timestamp');
  });
});

describe('TransactionMonitor - Status Checking', () => {
  let monitor;

  beforeEach(() => {
    monitor = new TransactionMonitor('abc123');
    jest.clearAllMocks();
  });

  test('should check status successfully', async () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    const status = await monitor.checkStatus();

    expect(status.status).toBe('pending');
    expect(monitor.checkCount).toBe(1);
    expect(monitor.lastCheckTime).toBeTruthy();
  });

  test('should update confirmations on confirming status', async () => {
    // Create monitor with higher target to test CONFIRMING state
    const confirmingMonitor = new TransactionMonitor('abc123', {
      targetConfirmations: 6 // Need 6, but only have 1
    });

    getTransactionStatus.mockResolvedValue({
      status: 'confirming',
      txid: 'abc123',
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    await confirmingMonitor.checkStatus();

    expect(confirmingMonitor.confirmations).toBe(1);
    expect(confirmingMonitor.blockHeight).toBe(2500000);
    expect(confirmingMonitor.status).toBe(TxStatus.CONFIRMING);
  });

  test('should mark as confirmed when target reached', async () => {
    getTransactionStatus.mockResolvedValue({
      status: 'confirmed',
      txid: 'abc123',
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    let confirmedEventFired = false;
    monitor.on(MonitorEvent.CONFIRMED, () => {
      confirmedEventFired = true;
    });

    await monitor.checkStatus();

    expect(monitor.status).toBe(TxStatus.CONFIRMED);
    expect(confirmedEventFired).toBe(true);
    expect(monitor.isMonitoring).toBe(false); // Should stop automatically
  });

  test('should detect dropped transaction', async () => {
    // Create monitor with short dropped threshold
    const shortMonitor = new TransactionMonitor('abc123', {
      droppedThreshold: 100 // 100ms
    });

    // Wait for threshold to pass
    await new Promise(resolve => setTimeout(resolve, 150));

    getTransactionStatus.mockResolvedValue({
      status: 'not_found',
      txid: 'abc123'
    });

    let droppedEventFired = false;
    shortMonitor.on(MonitorEvent.DROPPED, () => {
      droppedEventFired = true;
    });

    await shortMonitor.checkStatus();

    expect(shortMonitor.status).toBe(TxStatus.DROPPED);
    expect(droppedEventFired).toBe(true);
  });

  test('should handle check errors gracefully', async () => {
    getTransactionStatus.mockRejectedValue(new Error('API error'));

    let errorEventFired = false;
    monitor.on(MonitorEvent.ERROR, () => {
      errorEventFired = true;
    });

    const status = await monitor.checkStatus();

    expect(status.status).toBe('error');
    expect(monitor.status).toBe(TxStatus.ERROR);
    expect(errorEventFired).toBe(true);
  });
});

describe('TransactionMonitor - Monitoring Lifecycle', () => {
  let monitor;

  beforeEach(() => {
    monitor = new TransactionMonitor('abc123', {
      pollInterval: 100, // Fast polling for tests
      targetConfirmations: 1
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (monitor.isMonitoring) {
      monitor.stopMonitoring();
    }
  });

  test('should start monitoring', async () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    monitor.startMonitoring();

    expect(monitor.isMonitoring).toBe(true);
    expect(monitor.monitorInterval).toBeTruthy();

    // Wait for initial check to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(getTransactionStatus).toHaveBeenCalled();
  });

  test('should stop monitoring', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    monitor.startMonitoring();
    expect(monitor.isMonitoring).toBe(true);

    monitor.stopMonitoring();
    expect(monitor.isMonitoring).toBe(false);
    expect(monitor.monitorInterval).toBeNull();
  });

  test('should not start monitoring twice', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    monitor.startMonitoring();
    const firstInterval = monitor.monitorInterval;

    monitor.startMonitoring();
    expect(monitor.monitorInterval).toBe(firstInterval);
  });

  test('should timeout after max monitor time', async () => {
    const shortMonitor = new TransactionMonitor('abc123', {
      pollInterval: 50,
      maxMonitorTime: 100 // 100ms max
    });

    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    let timeoutFired = false;
    shortMonitor.on(MonitorEvent.TIMEOUT, () => {
      timeoutFired = true;
    });

    shortMonitor.startMonitoring();

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(timeoutFired).toBe(true);
    expect(shortMonitor.isMonitoring).toBe(false);
  });
});

describe('TransactionMonitor - waitForConfirmation', () => {
  let monitor;

  beforeEach(() => {
    monitor = new TransactionMonitor('abc123', {
      pollInterval: 50,
      targetConfirmations: 1,
      maxMonitorTime: 10000
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (monitor.isMonitoring) {
      monitor.stopMonitoring();
    }
  });

  test('should resolve when confirmed', async () => {
    // Start with pending, then confirm
    getTransactionStatus
      .mockResolvedValueOnce({
        status: 'pending',
        txid: 'abc123',
        confirmed: false,
        confirmations: 0
      })
      .mockResolvedValue({
        status: 'confirmed',
        txid: 'abc123',
        confirmed: true,
        confirmations: 1,
        blockHeight: 2500000,
        blockHash: 'block123'
      });

    const result = await monitor.waitForConfirmation();

    expect(result.txid).toBe('abc123');
    expect(result.confirmations).toBe(1);
  }, 15000);

  test('should reject when dropped', async () => {
    const shortMonitor = new TransactionMonitor('abc123', {
      pollInterval: 50,
      droppedThreshold: 100,
      maxMonitorTime: 5000
    });

    await new Promise(resolve => setTimeout(resolve, 150));

    getTransactionStatus.mockResolvedValue({
      status: 'not_found',
      txid: 'abc123'
    });

    await expect(shortMonitor.waitForConfirmation())
      .rejects.toThrow(/Transaction dropped/);
  }, 10000);

  test('should reject on timeout', async () => {
    const shortMonitor = new TransactionMonitor('abc123', {
      pollInterval: 50,
      maxMonitorTime: 150
    });

    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'abc123',
      confirmed: false,
      confirmations: 0
    });

    await expect(shortMonitor.waitForConfirmation())
      .rejects.toThrow(/Monitoring timeout/);
  }, 5000);
});

describe('TransactionMonitor - Status Reporting', () => {
  test('should return comprehensive status', () => {
    const monitor = new TransactionMonitor('abc123', {
      targetConfirmations: 6
    });

    monitor.confirmations = 3;
    monitor.blockHeight = 2500000;
    monitor.checkCount = 5;

    const status = monitor.getStatus();

    expect(status.txid).toBe('abc123');
    expect(status.status).toBe(TxStatus.PENDING);
    expect(status.confirmations).toBe(3);
    expect(status.blockHeight).toBe(2500000);
    expect(status.checkCount).toBe(5);
    expect(status.monitorDuration).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(status.statusHistory)).toBe(true);
  });
});

describe('MultiTransactionMonitor', () => {
  let multiMonitor;

  beforeEach(() => {
    multiMonitor = new MultiTransactionMonitor({
      pollInterval: 100,
      targetConfirmations: 1
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    multiMonitor.stopAll();
  });

  test('should add and track multiple transactions', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'tx1',
      confirmed: false,
      confirmations: 0
    });

    const monitor1 = multiMonitor.addTransaction('tx1', 'Transaction 1');
    const monitor2 = multiMonitor.addTransaction('tx2', 'Transaction 2');

    expect(multiMonitor.monitors.size).toBe(2);
    expect(monitor1).toBeInstanceOf(TransactionMonitor);
    expect(monitor2).toBeInstanceOf(TransactionMonitor);
  });

  test('should not duplicate monitors for same txid', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      confirmed: false,
      confirmations: 0
    });

    const monitor1 = multiMonitor.addTransaction('tx1');
    const monitor2 = multiMonitor.addTransaction('tx1');

    expect(monitor1).toBe(monitor2);
    expect(multiMonitor.monitors.size).toBe(1);
  });

  test('should emit proxied events', async () => {
    getTransactionStatus.mockResolvedValue({
      status: 'confirmed',
      txid: 'tx1',
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    // Set up listener BEFORE adding transaction (which starts monitoring)
    const confirmedPromise = new Promise((resolve) => {
      multiMonitor.on(MonitorEvent.CONFIRMED, (data) => {
        expect(data.txid).toBe('tx1');
        expect(data.label).toBe('Test TX');
        resolve(true);
      });
    });

    multiMonitor.addTransaction('tx1', 'Test TX');

    // Wait for event with timeout
    const confirmedEventFired = await Promise.race([
      confirmedPromise,
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]);

    expect(confirmedEventFired).toBe(true);
  }, 5000);

  test('should remove transaction', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      confirmed: false,
      confirmations: 0
    });

    multiMonitor.addTransaction('tx1');
    expect(multiMonitor.monitors.size).toBe(1);

    multiMonitor.removeTransaction('tx1');
    expect(multiMonitor.monitors.size).toBe(0);
  });

  test('should stop all monitors', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      confirmed: false,
      confirmations: 0
    });

    const monitor1 = multiMonitor.addTransaction('tx1');
    const monitor2 = multiMonitor.addTransaction('tx2');

    expect(monitor1.isMonitoring).toBe(true);
    expect(monitor2.isMonitoring).toBe(true);

    multiMonitor.stopAll();

    expect(monitor1.isMonitoring).toBe(false);
    expect(monitor2.isMonitoring).toBe(false);
  });

  test('should get status of all transactions', () => {
    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      confirmed: false,
      confirmations: 0
    });

    multiMonitor.addTransaction('tx1');
    multiMonitor.addTransaction('tx2');

    const statuses = multiMonitor.getAllStatus();

    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toHaveProperty('txid');
    expect(statuses[1]).toHaveProperty('txid');
  });
});

describe('monitorTransaction - Helper Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should monitor transaction successfully', async () => {
    getTransactionStatus.mockResolvedValue({
      status: 'confirmed',
      txid: 'tx1',
      confirmed: true,
      confirmations: 1,
      blockHeight: 2500000,
      blockHash: 'block123'
    });

    const result = await monitorTransaction('tx1', {
      pollInterval: 50,
      targetConfirmations: 1,
      maxMonitorTime: 5000
    });

    expect(result.txid).toBe('tx1');
    expect(result.confirmations).toBe(1);
  }, 10000);

  test('should handle monitoring failure', async () => {
    const shortOptions = {
      pollInterval: 50,
      maxMonitorTime: 200
    };

    getTransactionStatus.mockResolvedValue({
      status: 'pending',
      txid: 'tx1',
      confirmed: false,
      confirmations: 0
    });

    await expect(monitorTransaction('tx1', shortOptions))
      .rejects.toThrow(/Monitoring timeout/);
  }, 5000);
});
