'use strict';

// Tests for Bitcoin Testnet Client module
import { jest } from '@jest/globals';
import * as testnetClient from '../../src/bitcoin/testnetClient.js';

describe('Bitcoin Testnet Client', () => {
  // Mock global fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getCurrentBlockHeight', () => {
    test('should fetch current block height successfully', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => 2500000
      });

      const height = await testnetClient.getCurrentBlockHeight();
      expect(height).toBe(2500000);
    });

    test('should handle API timeout', async () => {
      fetch.mockRejectedValue(new Error('Request timeout'));

      await expect(testnetClient.getCurrentBlockHeight()).rejects.toThrow('Blockstream API error: Request timeout');
    });

    test('should handle API 500 error', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(testnetClient.getCurrentBlockHeight()).rejects.toThrow('Blockstream API error: HTTP 500: Internal Server Error');
    });

    test('should handle API 503 error (service unavailable)', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(testnetClient.getCurrentBlockHeight()).rejects.toThrow('Blockstream API error: HTTP 503: Service Unavailable');
    });

    test('should handle network error (ECONNREFUSED)', async () => {
      fetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(testnetClient.getCurrentBlockHeight()).rejects.toThrow('Blockstream API error: ECONNREFUSED');
    });

    test('should handle malformed JSON response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      await expect(testnetClient.getCurrentBlockHeight()).rejects.toThrow('Blockstream API error: Unexpected token in JSON');
    });
  });

  describe('getTransaction', () => {
    test('should fetch transaction successfully', async () => {
      const mockTx = {
        txid: 'abc123',
        size: 250,
        version: 2
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockTx
      });

      const result = await testnetClient.getTransaction('abc123');
      expect(result.found).toBe(true);
      expect(result.txid).toBe('abc123');
    });

    test('should handle transaction not found', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await testnetClient.getTransaction('invalid');
      expect(result.found).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    test('should handle API timeout when fetching transaction', async () => {
      fetch.mockRejectedValue(new Error('Request timeout'));

      const result = await testnetClient.getTransaction('abc123');
      expect(result.found).toBe(false);
      expect(result.error).toContain('Request timeout');
    });
  });

  describe('broadcastTransaction', () => {
    test('should broadcast transaction successfully', async () => {
      fetch.mockResolvedValue({
        ok: true,
        text: async () => 'abc123txid'
      });

      const txid = await testnetClient.broadcastTransaction('0200000001...');
      expect(txid).toBe('abc123txid');
    });

    test('should handle broadcast rejection (insufficient fee)', async () => {
      fetch.mockResolvedValue({
        ok: false,
        text: async () => 'insufficient fee'
      });

      await expect(testnetClient.broadcastTransaction('0200000001...')).rejects.toThrow('Broadcast failed: insufficient fee');
    });

    test('should handle broadcast rejection (bad-txns-inputs-missingorspent)', async () => {
      fetch.mockResolvedValue({
        ok: false,
        text: async () => 'bad-txns-inputs-missingorspent'
      });

      await expect(testnetClient.broadcastTransaction('0200000001...')).rejects.toThrow('Broadcast failed: bad-txns-inputs-missingorspent');
    });

    test('should handle broadcast rejection (non-BIP68-final)', async () => {
      fetch.mockResolvedValue({
        ok: false,
        text: async () => 'non-BIP68-final (code 64)'
      });

      await expect(testnetClient.broadcastTransaction('0200000001...')).rejects.toThrow('Broadcast failed: non-BIP68-final');
    });

    test('should handle network error during broadcast', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(testnetClient.broadcastTransaction('0200000001...')).rejects.toThrow('Failed to broadcast: Network error');
    });

    test('should handle timeout during broadcast', async () => {
      fetch.mockRejectedValue(new Error('Request timeout'));

      await expect(testnetClient.broadcastTransaction('0200000001...')).rejects.toThrow('Failed to broadcast: Request timeout');
    });
  });

  describe('getFeeEstimates', () => {
    test('should fetch fee estimates successfully', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          '1': 20.5,
          '3': 15.2,
          '6': 10.8,
          '144': 5.1
        })
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(21); // Ceiled
      expect(fees.halfHour).toBe(16);
      expect(fees.hour).toBe(11);
      expect(fees.economy).toBe(6);
    });

    test('should return fallback fees on API error', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(20);
      expect(fees.halfHour).toBe(15);
      expect(fees.hour).toBe(10);
      expect(fees.economy).toBe(5);
      expect(fees.note).toBe('Fallback fees (API unavailable)');
    });

    test('should return fallback fees on timeout', async () => {
      fetch.mockRejectedValue(new Error('Request timeout'));

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.note).toBe('Fallback fees (API unavailable)');
    });

    test('should handle missing fee data (use fallback values)', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}) // Empty response
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(20);
      expect(fees.halfHour).toBe(15);
    });

    test('should handle partial fee data', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          '1': 25.5
          // Missing other fields
        })
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(26);
      expect(fees.halfHour).toBe(15); // Fallback
    });

    test('should ceil fractional fee rates', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          '1': 20.1,
          '3': 15.9,
          '6': 10.5,
          '144': 5.1
        })
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(21);
      expect(fees.halfHour).toBe(16);
      expect(fees.hour).toBe(11);
      expect(fees.economy).toBe(6);
    });

    test('should handle network congestion (high fees)', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          '1': 100,
          '3': 80,
          '6': 60,
          '144': 40
        })
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(100);
      expect(fees.economy).toBe(40);
    });

    test('should handle low congestion (low fees)', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          '1': 2,
          '3': 1.5,
          '6': 1,
          '144': 1
        })
      });

      const fees = await testnetClient.getFeeEstimates();
      expect(fees.fastest).toBe(2);
      expect(fees.economy).toBe(1);
    });
  });

  describe('createTimelockScript', () => {
    test('should create script for block-height locktime', () => {
      const locktime = 100;
      const publicKey = Buffer.alloc(33, 0x02);

      const script = testnetClient.createTimelockScript(locktime, publicKey);
      expect(Buffer.isBuffer(script)).toBe(true);
      expect(script.length).toBeGreaterThan(0);
    });

    test('should create script for timestamp locktime', () => {
      const locktime = 1700000000;
      const publicKey = Buffer.alloc(33, 0x03);

      const script = testnetClient.createTimelockScript(locktime, publicKey);
      expect(Buffer.isBuffer(script)).toBe(true);
    });

    test('should create different scripts for different locktimes', () => {
      const publicKey = Buffer.alloc(33, 0x02);
      const script1 = testnetClient.createTimelockScript(100, publicKey);
      const script2 = testnetClient.createTimelockScript(200, publicKey);

      expect(script1.toString('hex')).not.toBe(script2.toString('hex'));
    });

    test('should create different scripts for different public keys', () => {
      const locktime = 100;
      const pubKey1 = Buffer.alloc(33, 0x02);
      const pubKey2 = Buffer.alloc(33, 0x03);

      const script1 = testnetClient.createTimelockScript(locktime, pubKey1);
      const script2 = testnetClient.createTimelockScript(locktime, pubKey2);

      expect(script1.toString('hex')).not.toBe(script2.toString('hex'));
    });
  });

  describe('isValidTestnetAddress', () => {
    test('should validate valid testnet P2PKH address', () => {
      const result = testnetClient.isValidTestnetAddress('mq7se9wy2egettFxPbmn99cK8v5AFq55Lx');
      expect(result).toBe(true);
    });

    test('should validate valid testnet P2SH address', () => {
      const result = testnetClient.isValidTestnetAddress('2N3oefVeg6stiTb5Kh3ozCSkaqmx91FDbsm');
      expect(result).toBe(true);
    });

    test('should validate valid testnet bech32 address', () => {
      const result = testnetClient.isValidTestnetAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
      expect(result).toBe(true);
    });

    test('should reject mainnet address', () => {
      const result = testnetClient.isValidTestnetAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(result).toBe(false);
    });

    test('should reject invalid address', () => {
      const result = testnetClient.isValidTestnetAddress('invalid_address');
      expect(result).toBe(false);
    });

    test('should reject empty string', () => {
      const result = testnetClient.isValidTestnetAddress('');
      expect(result).toBe(false);
    });

    test('should reject null', () => {
      const result = testnetClient.isValidTestnetAddress(null);
      expect(result).toBe(false);
    });
  });

  describe('getTestnetFaucets', () => {
    test('should return array of faucet URLs', () => {
      const faucets = testnetClient.getTestnetFaucets();
      expect(Array.isArray(faucets)).toBe(true);
      expect(faucets.length).toBeGreaterThan(0);
    });

    test('should return valid URLs', () => {
      const faucets = testnetClient.getTestnetFaucets();
      faucets.forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });
  });
});