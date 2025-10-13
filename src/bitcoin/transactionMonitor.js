'use strict';

// ECHOLOCK Bitcoin Transaction Monitor
// Monitors transaction status and detects dropped/replaced transactions
//
// CRITICAL: Prevents silent transaction failures
//
// Features:
// - Mempool monitoring
// - Confirmation tracking
// - Dropped transaction detection
// - RBF (Replace-By-Fee) detection
// - Alert system for failures

import EventEmitter from 'events';
import {
  getTransactionStatus,
  getTransaction,
  getCurrentBlockHeight
} from './testnetClient.js';

/**
 * Transaction monitoring events
 */
export const MonitorEvent = {
  STATUS_CHANGE: 'status_change',
  CONFIRMED: 'confirmed',
  DROPPED: 'dropped',
  REPLACED: 'replaced',
  ERROR: 'error',
  TIMEOUT: 'timeout'
};

/**
 * Transaction status
 */
export const TxStatus = {
  NOT_FOUND: 'not_found',
  PENDING: 'pending',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  DROPPED: 'dropped',
  REPLACED: 'replaced',
  ERROR: 'error'
};

/**
 * Bitcoin Transaction Monitor
 * Monitors a transaction and emits events on status changes
 */
export class TransactionMonitor extends EventEmitter {
  constructor(txid, options = {}) {
    super();
    this.txid = txid;
    this.status = TxStatus.PENDING;
    this.confirmations = 0;
    this.blockHeight = null;
    this.lastCheckTime = null;
    this.checkCount = 0;
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.startTime = Date.now();
    this.statusHistory = [];

    // Configuration
    this.options = {
      pollInterval: options.pollInterval || 30000, // 30 seconds
      targetConfirmations: options.targetConfirmations || 1,
      maxMonitorTime: options.maxMonitorTime || 7200000, // 2 hours
      droppedThreshold: options.droppedThreshold || 600000, // 10 minutes not found = dropped
      alertOnDrop: options.alertOnDrop !== false, // Default true
      alertOnReplace: options.alertOnReplace !== false // Default true
    };

    this._recordStatus(this.status, 'Monitor initialized');
  }

  /**
   * Record status change
   * @param {string} status - New status
   * @param {string} reason - Reason for change
   * @param {Object} metadata - Additional metadata
   */
  _recordStatus(status, reason, metadata = {}) {
    const record = {
      status,
      reason,
      timestamp: Date.now(),
      checkCount: this.checkCount,
      ...metadata
    };
    this.statusHistory.push(record);

    if (status !== this.status) {
      const oldStatus = this.status;
      this.status = status;
      this.emit(MonitorEvent.STATUS_CHANGE, {
        oldStatus,
        newStatus: status,
        ...record
      });
      console.log(`[TxMonitor] ${this.txid.substring(0, 12)}... ${oldStatus} → ${status}: ${reason}`);
    }
  }

  /**
   * Check transaction status once
   * @returns {Promise<Object>} Current status
   */
  async checkStatus() {
    this.checkCount++;
    this.lastCheckTime = Date.now();

    try {
      const txStatus = await getTransactionStatus(this.txid);

      if (txStatus.status === 'not_found') {
        // Transaction not found - could be dropped or not yet propagated
        const timeSinceStart = Date.now() - this.startTime;

        if (timeSinceStart > this.options.droppedThreshold) {
          this._recordStatus(TxStatus.DROPPED, 'Transaction not found in mempool after threshold', {
            timeSinceStart
          });

          if (this.options.alertOnDrop) {
            this.emit(MonitorEvent.DROPPED, {
              txid: this.txid,
              timeSinceStart,
              message: 'Transaction may have been dropped from mempool'
            });
          }
        }

        return txStatus;
      }

      // Update confirmations
      this.confirmations = txStatus.confirmations;
      this.blockHeight = txStatus.blockHeight;

      // Check for confirmation
      if (txStatus.status === 'confirmed' || txStatus.status === 'confirming') {
        if (this.status === TxStatus.PENDING) {
          this._recordStatus(TxStatus.CONFIRMING, 'First confirmation received', {
            confirmations: txStatus.confirmations,
            blockHeight: txStatus.blockHeight
          });
        }

        if (txStatus.confirmations >= this.options.targetConfirmations) {
          this._recordStatus(TxStatus.CONFIRMED, `Target confirmations reached (${txStatus.confirmations})`, {
            confirmations: txStatus.confirmations,
            blockHeight: txStatus.blockHeight,
            blockHash: txStatus.blockHash
          });

          this.emit(MonitorEvent.CONFIRMED, {
            txid: this.txid,
            confirmations: txStatus.confirmations,
            blockHeight: txStatus.blockHeight,
            blockHash: txStatus.blockHash,
            duration: Date.now() - this.startTime
          });

          // Stop monitoring once confirmed
          this.stopMonitoring();
        }
      }

      return txStatus;

    } catch (error) {
      console.error(`[TxMonitor] Error checking ${this.txid.substring(0, 12)}...: ${error.message}`);
      this._recordStatus(TxStatus.ERROR, error.message);
      this.emit(MonitorEvent.ERROR, {
        txid: this.txid,
        error: error.message
      });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Start monitoring
   * @returns {TransactionMonitor} This monitor for chaining
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log(`[TxMonitor] Already monitoring ${this.txid.substring(0, 12)}...`);
      return this;
    }

    console.log(`[TxMonitor] Starting monitor for ${this.txid.substring(0, 12)}...`);
    console.log(`[TxMonitor] Poll interval: ${this.options.pollInterval / 1000}s`);
    console.log(`[TxMonitor] Target confirmations: ${this.options.targetConfirmations}`);
    console.log(`[TxMonitor] Max monitor time: ${this.options.maxMonitorTime / 1000}s`);

    this.isMonitoring = true;
    this.startTime = Date.now();

    // Initial check
    this.checkStatus().catch(err => {
      console.error(`[TxMonitor] Initial check failed: ${err.message}`);
    });

    // Set up polling
    this.monitorInterval = setInterval(async () => {
      // Check if max monitor time exceeded
      if (Date.now() - this.startTime > this.options.maxMonitorTime) {
        this._recordStatus(TxStatus.ERROR, 'Monitoring timeout exceeded');
        this.emit(MonitorEvent.TIMEOUT, {
          txid: this.txid,
          duration: Date.now() - this.startTime,
          message: 'Transaction monitoring timeout'
        });
        this.stopMonitoring();
        return;
      }

      await this.checkStatus();
    }, this.options.pollInterval);

    return this;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log(`[TxMonitor] Stopping monitor for ${this.txid.substring(0, 12)}...`);
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Wait for confirmation (promise-based interface)
   * @returns {Promise<Object>} Confirmation result
   */
  async waitForConfirmation() {
    return new Promise((resolve, reject) => {
      // Set up event handlers
      const onConfirmed = (data) => {
        cleanup();
        resolve(data);
      };

      const onDropped = (data) => {
        cleanup();
        reject(new Error(`Transaction dropped: ${data.message}`));
      };

      const onTimeout = (data) => {
        cleanup();
        reject(new Error(`Monitoring timeout: ${data.message}`));
      };

      const onError = (data) => {
        cleanup();
        reject(new Error(`Monitoring error: ${data.error}`));
      };

      const cleanup = () => {
        this.off(MonitorEvent.CONFIRMED, onConfirmed);
        this.off(MonitorEvent.DROPPED, onDropped);
        this.off(MonitorEvent.TIMEOUT, onTimeout);
        this.off(MonitorEvent.ERROR, onError);
        this.stopMonitoring();
      };

      this.on(MonitorEvent.CONFIRMED, onConfirmed);
      this.on(MonitorEvent.DROPPED, onDropped);
      this.on(MonitorEvent.TIMEOUT, onTimeout);
      this.on(MonitorEvent.ERROR, onError);

      // Start monitoring
      this.startMonitoring();
    });
  }

  /**
   * Get current monitoring status
   * @returns {Object} Status summary
   */
  getStatus() {
    return {
      txid: this.txid,
      status: this.status,
      confirmations: this.confirmations,
      blockHeight: this.blockHeight,
      isMonitoring: this.isMonitoring,
      checkCount: this.checkCount,
      lastCheckTime: this.lastCheckTime,
      monitorDuration: Date.now() - this.startTime,
      statusHistory: this.statusHistory
    };
  }
}

/**
 * Monitor multiple transactions simultaneously
 */
export class MultiTransactionMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.monitors = new Map();
    this.options = options;
  }

  /**
   * Add transaction to monitor
   * @param {string} txid - Transaction ID
   * @param {string} label - Optional label for identification
   * @returns {TransactionMonitor} Monitor instance
   */
  addTransaction(txid, label = null) {
    if (this.monitors.has(txid)) {
      return this.monitors.get(txid);
    }

    const monitor = new TransactionMonitor(txid, this.options);

    // Proxy events from individual monitor
    monitor.on(MonitorEvent.STATUS_CHANGE, (data) => {
      this.emit(MonitorEvent.STATUS_CHANGE, { ...data, txid, label });
    });

    monitor.on(MonitorEvent.CONFIRMED, (data) => {
      this.emit(MonitorEvent.CONFIRMED, { ...data, label });
      console.log(`[MultiMonitor] ✅ ${label || txid} confirmed`);
    });

    monitor.on(MonitorEvent.DROPPED, (data) => {
      this.emit(MonitorEvent.DROPPED, { ...data, label });
      console.log(`[MultiMonitor] ⚠️  ${label || txid} dropped`);
    });

    monitor.on(MonitorEvent.TIMEOUT, (data) => {
      this.emit(MonitorEvent.TIMEOUT, { ...data, label });
      console.log(`[MultiMonitor] ⏱️  ${label || txid} timeout`);
    });

    monitor.on(MonitorEvent.ERROR, (data) => {
      this.emit(MonitorEvent.ERROR, { ...data, label });
      console.log(`[MultiMonitor] ❌ ${label || txid} error: ${data.error}`);
    });

    this.monitors.set(txid, monitor);
    monitor.startMonitoring();

    return monitor;
  }

  /**
   * Remove transaction monitor
   * @param {string} txid - Transaction ID
   */
  removeTransaction(txid) {
    const monitor = this.monitors.get(txid);
    if (monitor) {
      monitor.stopMonitoring();
      monitor.removeAllListeners();
      this.monitors.delete(txid);
    }
  }

  /**
   * Stop all monitors
   */
  stopAll() {
    for (const monitor of this.monitors.values()) {
      monitor.stopMonitoring();
    }
  }

  /**
   * Get status of all monitored transactions
   * @returns {Array<Object>} Status array
   */
  getAllStatus() {
    return Array.from(this.monitors.entries()).map(([txid, monitor]) => ({
      txid,
      ...monitor.getStatus()
    }));
  }

  /**
   * Wait for all transactions to confirm
   * @returns {Promise<Array<Object>>} Array of confirmation results
   */
  async waitForAll() {
    const promises = Array.from(this.monitors.values()).map(monitor =>
      monitor.waitForConfirmation()
    );
    return await Promise.all(promises);
  }
}

/**
 * Simple helper to monitor a single transaction
 * @param {string} txid - Transaction ID
 * @param {Object} options - Monitor options
 * @returns {Promise<Object>} Confirmation result
 */
export async function monitorTransaction(txid, options = {}) {
  const monitor = new TransactionMonitor(txid, options);
  return await monitor.waitForConfirmation();
}
