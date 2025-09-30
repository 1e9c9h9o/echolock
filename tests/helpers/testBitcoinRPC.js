'use strict';

// Mock Bitcoin RPC/API for Testing
// Simulates Blockstream API responses without network calls

let mockBlockHeight = 2500000; // Starting testnet block height
let mockTransactions = new Map(); // txid -> transaction data
let mockUTXOs = new Map(); // address -> UTXOs
let mockFeeRates = {
  fastest: 20,
  halfHour: 15,
  hour: 10,
  economy: 5
};

/**
 * Set the current mock block height
 */
export function setMockBlockHeight(height) {
  mockBlockHeight = height;
}

/**
 * Get the current mock block height
 */
export function getMockBlockHeight() {
  return mockBlockHeight;
}

/**
 * Advance block height by N blocks
 */
export function advanceBlocks(count) {
  mockBlockHeight += count;
}

/**
 * Add UTXOs for a specific address
 */
export function addMockUTXOs(address, utxos) {
  const existing = mockUTXOs.get(address) || [];
  mockUTXOs.set(address, [...existing, ...utxos]);
}

/**
 * Get UTXOs for an address
 */
export function getMockUTXOs(address) {
  return mockUTXOs.get(address) || [];
}

/**
 * Clear all mock UTXOs
 */
export function clearMockUTXOs() {
  mockUTXOs.clear();
}

/**
 * Add a mock transaction
 */
export function addMockTransaction(txid, txData) {
  mockTransactions.set(txid, txData);
}

/**
 * Get a mock transaction
 */
export function getMockTransaction(txid) {
  return mockTransactions.get(txid);
}

/**
 * Clear all mock transactions
 */
export function clearMockTransactions() {
  mockTransactions.clear();
}

/**
 * Set mock fee rates
 */
export function setMockFeeRates(rates) {
  mockFeeRates = { ...mockFeeRates, ...rates };
}

/**
 * Reset all mock data
 */
export function resetMockBitcoin() {
  mockBlockHeight = 2500000;
  mockTransactions.clear();
  mockUTXOs.clear();
  mockFeeRates = {
    fastest: 20,
    halfHour: 15,
    hour: 10,
    economy: 5
  };
}

/**
 * Mock Blockstream API client
 */
export class MockBlockstreamAPI {
  constructor(options = {}) {
    this.shouldFail = options.shouldFail || false;
    this.latency = options.latency || 0;
  }

  async getCurrentBlockHeight() {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to fetch block height');
    }

    return mockBlockHeight;
  }

  async getBlockAtHeight(height) {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to fetch block');
    }

    return {
      height,
      id: `mock_block_${height}`,
      timestamp: Math.floor(Date.now() / 1000),
      tx_count: 100
    };
  }

  async getTransaction(txid) {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to fetch transaction');
    }

    const tx = mockTransactions.get(txid);
    if (!tx) {
      return { found: false };
    }

    return { found: true, ...tx };
  }

  async getUTXOs(address) {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to fetch UTXOs');
    }

    return getMockUTXOs(address);
  }

  async broadcastTransaction(txHex) {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to broadcast transaction');
    }

    // Generate mock txid
    const txid = `mock_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store transaction
    mockTransactions.set(txid, {
      txid,
      hex: txHex,
      broadcasted: true,
      timestamp: Date.now()
    });

    return txid;
  }

  async getFeeEstimates() {
    await this._delay(this.latency);

    if (this.shouldFail) {
      throw new Error('Failed to fetch fee estimates');
    }

    return mockFeeRates;
  }

  setFailureMode(shouldFail) {
    this.shouldFail = shouldFail;
  }

  _delay(ms) {
    if (ms === 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create mock Bitcoin client for testing
 */
export function createMockBitcoinClient(options = {}) {
  return new MockBlockstreamAPI(options);
}