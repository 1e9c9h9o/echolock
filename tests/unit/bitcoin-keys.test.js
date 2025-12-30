'use strict';

// Unit tests for Bitcoin private key encryption/decryption and UTXO management

import { describe, it, expect, beforeAll } from '@jest/globals';
import crypto from 'crypto';
import { encrypt, decrypt } from '../../src/crypto/encryption.js';
import { selectUTXOs, estimateTxSize } from '../../src/bitcoin/utxoManager.js';
import { decryptPrivateKey } from '../../src/bitcoin/timelockSpender.js';
import { PBKDF2_ITERATIONS } from '../../src/crypto/keyDerivation.js';

describe('Bitcoin Key Encryption/Decryption', () => {
  const testPassword = 'test-password-123';
  const testPrivateKey = crypto.randomBytes(32);

  it('should encrypt and decrypt a private key with password', async () => {
    // Derive master key from password using consistent iteration count
    const salt = crypto.randomBytes(16);
    const masterKey = crypto.pbkdf2Sync(testPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');

    // Encrypt private key
    const { ciphertext, iv, authTag } = encrypt(testPrivateKey, masterKey);

    // Decrypt private key
    const decryptedKey = decrypt(ciphertext, masterKey, iv, authTag);

    expect(decryptedKey).toEqual(testPrivateKey);
  });

  it('should fail decryption with wrong password', async () => {
    const salt = crypto.randomBytes(16);
    const masterKey = crypto.pbkdf2Sync(testPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    const { ciphertext, iv, authTag } = encrypt(testPrivateKey, masterKey);

    // Try with wrong password
    const wrongPassword = 'wrong-password';
    const wrongMasterKey = crypto.pbkdf2Sync(wrongPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');

    expect(() => {
      decrypt(ciphertext, wrongMasterKey, iv, authTag);
    }).toThrow();
  });

  it('should decrypt with decryptPrivateKey helper', async () => {
    const salt = crypto.randomBytes(16);
    const masterKey = crypto.pbkdf2Sync(testPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    const { ciphertext, iv, authTag } = encrypt(testPrivateKey, masterKey);

    const encryptedData = {
      encryptedPrivateKey: ciphertext.toString('base64'),
      privateKeyIV: iv.toString('base64'),
      privateKeyAuthTag: authTag.toString('base64'),
      privateKeySalt: salt.toString('base64')
    };

    const decryptedKey = await decryptPrivateKey(encryptedData, testPassword);

    expect(decryptedKey).toEqual(testPrivateKey);
  });

  it('should use consistent salt for same password', () => {
    const salt = crypto.randomBytes(16);
    const masterKey1 = crypto.pbkdf2Sync(testPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    const masterKey2 = crypto.pbkdf2Sync(testPassword, salt, PBKDF2_ITERATIONS, 32, 'sha256');

    expect(masterKey1).toEqual(masterKey2);
  });

  it('should use different salt for different encryptions', () => {
    const salt1 = crypto.randomBytes(16);
    const salt2 = crypto.randomBytes(16);

    expect(salt1).not.toEqual(salt2);
  });
});

describe('UTXO Selection Logic', () => {
  const mockUTXOs = [
    { txid: 'tx1', vout: 0, value: 100000, confirmed: true },
    { txid: 'tx2', vout: 0, value: 50000, confirmed: true },
    { txid: 'tx3', vout: 1, value: 25000, confirmed: true },
    { txid: 'tx4', vout: 0, value: 10000, confirmed: false }, // Unconfirmed
    { txid: 'tx5', vout: 2, value: 200000, confirmed: true }
  ];

  it('should select sufficient UTXOs for target amount', () => {
    const targetAmount = 120000;
    const result = selectUTXOs(mockUTXOs, targetAmount);

    expect(result.totalValue).toBeGreaterThanOrEqual(targetAmount);
    expect(result.selectedUTXOs.length).toBeGreaterThan(0);
    expect(result.change).toBeGreaterThanOrEqual(0);
  });

  it('should only select confirmed UTXOs', () => {
    const targetAmount = 50000;
    const result = selectUTXOs(mockUTXOs, targetAmount);

    result.selectedUTXOs.forEach(utxo => {
      expect(utxo.confirmed).toBe(true);
    });
  });

  it('should calculate correct change amount', () => {
    const targetAmount = 30000;
    const result = selectUTXOs(mockUTXOs, targetAmount);

    expect(result.change).toBe(result.totalValue - targetAmount);
  });

  it('should throw error if insufficient funds', () => {
    const targetAmount = 1000000; // More than available

    expect(() => {
      selectUTXOs(mockUTXOs, targetAmount);
    }).toThrow(/Insufficient funds/);
  });

  it('should throw error if no UTXOs available', () => {
    expect(() => {
      selectUTXOs([], 10000);
    }).toThrow(/No UTXOs available/);
  });

  it('should throw error if no confirmed UTXOs', () => {
    const unconfirmedOnly = [
      { txid: 'tx1', vout: 0, value: 100000, confirmed: false }
    ];

    expect(() => {
      selectUTXOs(unconfirmedOnly, 10000);
    }).toThrow(/No confirmed UTXOs available/);
  });

  it('should prefer larger UTXOs first', () => {
    const targetAmount = 10000;
    const result = selectUTXOs(mockUTXOs, targetAmount);

    // With our algorithm, it should select the largest UTXO first
    expect(result.selectedUTXOs[0].value).toBeGreaterThanOrEqual(
      result.selectedUTXOs[result.selectedUTXOs.length - 1]?.value || 0
    );
  });

  it('should handle exact amount match', () => {
    const exactUTXOs = [
      { txid: 'tx1', vout: 0, value: 100000, confirmed: true }
    ];
    const targetAmount = 100000;

    const result = selectUTXOs(exactUTXOs, targetAmount);

    expect(result.totalValue).toBe(targetAmount);
    expect(result.change).toBe(0);
  });
});

describe('Transaction Size Estimation', () => {
  it('should estimate size for single input/output', () => {
    const size = estimateTxSize(1, 1);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(200); // Reasonable upper bound
  });

  it('should estimate size for multiple inputs', () => {
    const size1 = estimateTxSize(1, 1);
    const size2 = estimateTxSize(2, 1);

    expect(size2).toBeGreaterThan(size1);
  });

  it('should estimate size for multiple outputs', () => {
    const size1 = estimateTxSize(1, 1);
    const size2 = estimateTxSize(1, 2);

    expect(size2).toBeGreaterThan(size1);
  });

  it('should estimate size proportionally', () => {
    const size_1_1 = estimateTxSize(1, 1);
    const size_2_2 = estimateTxSize(2, 2);

    // Size should roughly double
    expect(size_2_2).toBeGreaterThan(size_1_1 * 1.5);
    expect(size_2_2).toBeLessThan(size_1_1 * 2.5);
  });
});

describe('Bitcoin Key Storage Format', () => {
  it('should store all required encryption fields', () => {
    const password = 'test-password';
    const privateKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16);
    const masterKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    const { ciphertext, iv, authTag } = encrypt(privateKey, masterKey);

    const stored = {
      encryptedPrivateKey: ciphertext.toString('base64'),
      privateKeyIV: iv.toString('base64'),
      privateKeyAuthTag: authTag.toString('base64'),
      privateKeySalt: salt.toString('base64')
    };

    expect(stored.encryptedPrivateKey).toBeDefined();
    expect(stored.privateKeyIV).toBeDefined();
    expect(stored.privateKeyAuthTag).toBeDefined();
    expect(stored.privateKeySalt).toBeDefined();

    // All should be valid base64
    expect(() => Buffer.from(stored.encryptedPrivateKey, 'base64')).not.toThrow();
    expect(() => Buffer.from(stored.privateKeyIV, 'base64')).not.toThrow();
    expect(() => Buffer.from(stored.privateKeyAuthTag, 'base64')).not.toThrow();
    expect(() => Buffer.from(stored.privateKeySalt, 'base64')).not.toThrow();
  });

  it('should have correct buffer sizes', () => {
    const password = 'test-password';
    const privateKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16);
    const masterKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    const { ciphertext, iv, authTag } = encrypt(privateKey, masterKey);

    expect(ciphertext.length).toBe(32); // AES-256-GCM preserves length
    expect(iv.length).toBe(12); // Standard GCM IV size
    expect(authTag.length).toBe(16); // Standard GCM tag size
    expect(salt.length).toBe(16); // Our chosen salt size
  });
});