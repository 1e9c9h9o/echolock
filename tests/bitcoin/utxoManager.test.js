'use strict';

// Tests for Bitcoin UTXO Manager module
import { jest } from '@jest/globals';
import { getUTXOs, selectUTXOs, estimateTxSize } from '../../src/bitcoin/utxoManager.js';

describe('Bitcoin UTXO Manager', () => {
  describe('getUTXOs', () => {
    // Mock global fetch
    global.fetch = jest.fn();

    beforeEach(() => {
      fetch.mockClear();
    });

    test('should fetch and transform UTXOs successfully', async () => {
      const mockAddress = 'tb1qtest123';
      const mockUTXOs = [
        {
          txid: 'abc123',
          vout: 0,
          value: 100000,
          status: { confirmed: true }
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockUTXOs
      });

      const result = await getUTXOs(mockAddress);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        txid: 'abc123',
        vout: 0,
        value: 100000,
        confirmed: true
      });
    });

    test('should handle API errors (404 not found)', async () => {
      const mockAddress = 'tb1qinvalid';

      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(getUTXOs(mockAddress)).rejects.toThrow('Failed to fetch UTXOs: 404 Not Found');
    });

    test('should handle API errors (500 server error)', async () => {
      const mockAddress = 'tb1qtest123';

      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(getUTXOs(mockAddress)).rejects.toThrow('Failed to fetch UTXOs: 500 Internal Server Error');
    });

    test('should handle network errors (timeout)', async () => {
      const mockAddress = 'tb1qtest123';

      fetch.mockRejectedValue(new Error('Network timeout'));

      await expect(getUTXOs(mockAddress)).rejects.toThrow('UTXO fetch failed: Network timeout');
    });

    test('should handle network errors (connection refused)', async () => {
      const mockAddress = 'tb1qtest123';

      fetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(getUTXOs(mockAddress)).rejects.toThrow('UTXO fetch failed: ECONNREFUSED');
    });

    test('should handle malformed JSON response', async () => {
      const mockAddress = 'tb1qtest123';

      fetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      await expect(getUTXOs(mockAddress)).rejects.toThrow('UTXO fetch failed: Unexpected token in JSON');
    });

    test('should handle empty UTXO list', async () => {
      const mockAddress = 'tb1qempty';

      fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const result = await getUTXOs(mockAddress);
      expect(result).toEqual([]);
    });

    test('should default confirmed to false when status missing', async () => {
      const mockAddress = 'tb1qtest123';
      const mockUTXOs = [
        {
          txid: 'abc123',
          vout: 0,
          value: 100000
          // status is missing
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockUTXOs
      });

      const result = await getUTXOs(mockAddress);
      expect(result[0].confirmed).toBe(false);
    });

    test('should handle API rate limiting (429)', async () => {
      const mockAddress = 'tb1qtest123';

      fetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(getUTXOs(mockAddress)).rejects.toThrow('Failed to fetch UTXOs: 429 Too Many Requests');
    });
  });

  describe('selectUTXOs', () => {
    test('should select sufficient UTXOs for target amount', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 50000, confirmed: true },
        { txid: 'tx2', vout: 0, value: 30000, confirmed: true },
        { txid: 'tx3', vout: 0, value: 20000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 60000);

      expect(result.totalValue).toBeGreaterThanOrEqual(60000);
      expect(result.selectedUTXOs).toContainEqual(expect.objectContaining({ txid: 'tx1' }));
      expect(result.change).toBe(result.totalValue - 60000);
    });

    test('should throw error for insufficient funds', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 10000, confirmed: true },
        { txid: 'tx2', vout: 0, value: 20000, confirmed: true }
      ];

      expect(() => selectUTXOs(utxos, 50000)).toThrow('Insufficient funds: have 30000 sats, need 50000 sats');
    });

    test('should throw error when no UTXOs available', () => {
      expect(() => selectUTXOs([], 10000)).toThrow('No UTXOs available for selection');
    });

    test('should throw error when UTXOs is null', () => {
      expect(() => selectUTXOs(null, 10000)).toThrow('No UTXOs available for selection');
    });

    test('should throw error when UTXOs is undefined', () => {
      expect(() => selectUTXOs(undefined, 10000)).toThrow('No UTXOs available for selection');
    });

    test('should throw error for zero target amount', () => {
      const utxos = [{ txid: 'tx1', vout: 0, value: 10000, confirmed: true }];
      expect(() => selectUTXOs(utxos, 0)).toThrow('Target amount must be positive');
    });

    test('should throw error for negative target amount', () => {
      const utxos = [{ txid: 'tx1', vout: 0, value: 10000, confirmed: true }];
      expect(() => selectUTXOs(utxos, -1000)).toThrow('Target amount must be positive');
    });

    test('should only select confirmed UTXOs', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 50000, confirmed: true },
        { txid: 'tx2', vout: 0, value: 100000, confirmed: false }, // unconfirmed
        { txid: 'tx3', vout: 0, value: 30000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 60000);

      expect(result.selectedUTXOs.every(u => u.confirmed)).toBe(true);
      expect(result.selectedUTXOs).not.toContainEqual(expect.objectContaining({ txid: 'tx2' }));
    });

    test('should throw error when no confirmed UTXOs available', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 50000, confirmed: false },
        { txid: 'tx2', vout: 0, value: 100000, confirmed: false }
      ];

      expect(() => selectUTXOs(utxos, 60000)).toThrow('No confirmed UTXOs available');
    });

    test('should prefer larger UTXOs first (efficiency)', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 10000, confirmed: true },
        { txid: 'tx2', vout: 0, value: 50000, confirmed: true },
        { txid: 'tx3', vout: 0, value: 30000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 45000);

      // Should select the largest UTXO (50000) first
      expect(result.selectedUTXOs[0].txid).toBe('tx2');
      expect(result.selectedUTXOs).toHaveLength(1);
    });

    test('should handle exact amount match (no change)', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 50000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 50000);

      expect(result.totalValue).toBe(50000);
      expect(result.change).toBe(0);
    });

    test('should calculate correct change amount', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 100000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 30000);

      expect(result.change).toBe(70000);
    });

    test('should handle dust amounts (very small UTXOs)', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 546, confirmed: true }, // Bitcoin dust limit
        { txid: 'tx2', vout: 0, value: 1000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 1500);

      expect(result.totalValue).toBeGreaterThanOrEqual(1500);
      expect(result.selectedUTXOs).toHaveLength(2);
    });

    test('should handle very large amounts (millions of sats)', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 10000000, confirmed: true },
        { txid: 'tx2', vout: 0, value: 5000000, confirmed: true }
      ];

      const result = selectUTXOs(utxos, 12000000);

      expect(result.totalValue).toBe(15000000);
      expect(result.change).toBe(3000000);
    });

    test('should fail when only dust UTXOs available for large amount', () => {
      const utxos = [
        { txid: 'tx1', vout: 0, value: 546, confirmed: true },
        { txid: 'tx2', vout: 0, value: 600, confirmed: true }
      ];

      expect(() => selectUTXOs(utxos, 10000)).toThrow('Insufficient funds: have 1146 sats, need 10000 sats');
    });
  });

  describe('estimateTxSize', () => {
    test('should estimate size for single input/output', () => {
      const size = estimateTxSize(1, 1);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(109); // 10 + 68 + 31
    });

    test('should estimate size for multiple inputs', () => {
      const size1 = estimateTxSize(1, 1);
      const size2 = estimateTxSize(2, 1);

      expect(size2).toBe(size1 + 68); // One additional input
    });

    test('should estimate size for multiple outputs', () => {
      const size1 = estimateTxSize(1, 1);
      const size2 = estimateTxSize(1, 2);

      expect(size2).toBe(size1 + 31); // One additional output
    });

    test('should scale proportionally with inputs and outputs', () => {
      const size = estimateTxSize(3, 2);
      const expected = 10 + (3 * 68) + (2 * 31);

      expect(size).toBe(expected);
    });

    test('should handle zero inputs (edge case)', () => {
      const size = estimateTxSize(0, 1);
      expect(size).toBe(41); // 10 + 31
    });

    test('should handle zero outputs (edge case)', () => {
      const size = estimateTxSize(1, 0);
      expect(size).toBe(78); // 10 + 68
    });

    test('should handle large transaction (100 inputs)', () => {
      const size = estimateTxSize(100, 2);
      expect(size).toBe(10 + (100 * 68) + (2 * 31));
      expect(size).toBe(6872);
    });
  });
});
