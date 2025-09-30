'use strict';

// Unit tests for cryptographic modules
// CRITICAL: 100% test coverage required for crypto module

import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';
import * as secretSharing from '../../src/crypto/secretSharing.js';
import * as encryption from '../../src/crypto/encryption.js';
import * as keyDerivation from '../../src/crypto/keyDerivation.js';
import { split, combine } from 'shamir-secret-sharing';

describe('Crypto Module - Imports', () => {
  test('secretSharing module exports expected functions', () => {
    expect(typeof secretSharing.splitSecret).toBe('function');
    expect(typeof secretSharing.reconstructSecret).toBe('function');
  });

  test('encryption module exports expected functions', () => {
    expect(typeof encryption.encrypt).toBe('function');
    expect(typeof encryption.decrypt).toBe('function');
  });

  test('keyDerivation module exports expected functions', () => {
    expect(typeof keyDerivation.deriveKey).toBe('function');
    expect(typeof keyDerivation.verifyPassword).toBe('function');
  });
});

describe('Shamir Secret Sharing Library - Integration Test', () => {
  test('should split and combine a secret using shamir-secret-sharing library', async () => {
    // Create a test secret (32 bytes / 256 bits)
    const secret = new Uint8Array(crypto.randomBytes(32));

    // Split into 5 shares, requiring 3 to reconstruct
    const shares = await split(secret, 5, 3);

    // Verify we got 5 shares
    expect(shares).toHaveLength(5);
    expect(Array.isArray(shares)).toBe(true);

    // Each share should be a Uint8Array
    shares.forEach(share => {
      expect(share instanceof Uint8Array).toBe(true);
    });

    // Reconstruct using exactly 3 shares
    const reconstructed = await combine([shares[0], shares[2], shares[4]]);

    // Verify reconstructed secret matches original
    expect(new Uint8Array(reconstructed)).toEqual(secret);
  });

  test('should produce incorrect result with insufficient shares', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const shares = await split(secret, 5, 3);

    // Reconstruct with only 2 shares (need 3)
    // NOTE: The library doesn't throw, but produces incorrect result
    const incorrectResult = await combine([shares[0], shares[1]]);

    // Result should not match the original secret
    expect(new Uint8Array(incorrectResult)).not.toEqual(secret);
  });

  test('should work with any valid subset of shares', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const shares = await split(secret, 5, 3);

    // Test different combinations of 3 shares
    const combo1 = await combine([shares[0], shares[1], shares[2]]);
    const combo2 = await combine([shares[1], shares[3], shares[4]]);
    const combo3 = await combine([shares[0], shares[2], shares[4]]);

    expect(new Uint8Array(combo1)).toEqual(secret);
    expect(new Uint8Array(combo2)).toEqual(secret);
    expect(new Uint8Array(combo3)).toEqual(secret);
  });

  test('should handle different threshold values', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));

    // 2-of-3 scheme
    const shares1 = await split(secret, 3, 2);
    const reconstructed1 = await combine([shares1[0], shares1[2]]);
    expect(new Uint8Array(reconstructed1)).toEqual(secret);

    // 7-of-10 scheme
    const shares2 = await split(secret, 10, 7);
    const reconstructed2 = await combine(shares2.slice(0, 7));
    expect(new Uint8Array(reconstructed2)).toEqual(secret);
  });
});

describe('Encryption Module - AES-256-GCM', () => {
  test('should encrypt and decrypt data successfully', () => {
    const plaintext = Buffer.from('This is a secret message', 'utf8');
    const key = crypto.randomBytes(32); // 256-bit key

    const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

    // Verify encrypted output
    expect(ciphertext).toBeInstanceOf(Buffer);
    expect(iv).toBeInstanceOf(Buffer);
    expect(authTag).toBeInstanceOf(Buffer);
    expect(iv.length).toBe(12); // 96 bits
    expect(authTag.length).toBe(16); // 128 bits
    expect(ciphertext).not.toEqual(plaintext);

    // Decrypt and verify
    const decrypted = encryption.decrypt(ciphertext, key, iv, authTag);
    expect(decrypted).toEqual(plaintext);
    expect(decrypted.toString('utf8')).toBe('This is a secret message');
  });

  test('should fail decryption with wrong key', () => {
    const plaintext = Buffer.from('Secret data', 'utf8');
    const key = crypto.randomBytes(32);
    const wrongKey = crypto.randomBytes(32);

    const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

    expect(() => {
      encryption.decrypt(ciphertext, wrongKey, iv, authTag);
    }).toThrow('Decryption failed');
  });

  test('should fail with tampered ciphertext', () => {
    const plaintext = Buffer.from('Secret data', 'utf8');
    const key = crypto.randomBytes(32);

    const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

    // Tamper with ciphertext
    ciphertext[0] = ciphertext[0] ^ 0xFF;

    expect(() => {
      encryption.decrypt(ciphertext, key, iv, authTag);
    }).toThrow('Decryption failed');
  });

  test('should reject invalid key size', () => {
    const plaintext = Buffer.from('test', 'utf8');
    const shortKey = crypto.randomBytes(16); // Only 128 bits

    expect(() => {
      encryption.encrypt(plaintext, shortKey);
    }).toThrow('Key must be 32 bytes');
  });

  test('should support associated data (AEAD)', () => {
    const plaintext = Buffer.from('Secret payload', 'utf8');
    const key = crypto.randomBytes(32);
    const associatedData = Buffer.from('metadata', 'utf8');

    const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key, associatedData);

    // Should decrypt successfully with correct associated data
    const decrypted = encryption.decrypt(ciphertext, key, iv, authTag, associatedData);
    expect(decrypted).toEqual(plaintext);

    // Should fail with wrong associated data
    const wrongData = Buffer.from('wrong', 'utf8');
    expect(() => {
      encryption.decrypt(ciphertext, key, iv, authTag, wrongData);
    }).toThrow('Decryption failed');
  });
});

describe('Key Derivation Module - PBKDF2', () => {
  test('should derive key from password', () => {
    const password = 'my-secure-password';

    const { key, salt } = keyDerivation.deriveKey(password);

    expect(key).toBeInstanceOf(Buffer);
    expect(salt).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32); // 256 bits
    expect(salt.length).toBe(32); // 256 bits
  });

  test('should produce different keys with different passwords', () => {
    const password1 = 'password1';
    const password2 = 'password2';

    const result1 = keyDerivation.deriveKey(password1);
    const result2 = keyDerivation.deriveKey(password2);

    expect(result1.key).not.toEqual(result2.key);
  });

  test('should produce different keys with different salts', () => {
    const password = 'same-password';

    const result1 = keyDerivation.deriveKey(password);
    const result2 = keyDerivation.deriveKey(password);

    // Different salts should produce different keys
    expect(result1.salt).not.toEqual(result2.salt);
    expect(result1.key).not.toEqual(result2.key);
  });

  test('should produce same key with same password and salt', () => {
    const password = 'test-password';
    const salt = crypto.randomBytes(32);

    const result1 = keyDerivation.deriveKey(password, salt);
    const result2 = keyDerivation.deriveKey(password, salt);

    expect(result1.key).toEqual(result2.key);
  });

  test('should verify correct password', () => {
    const password = 'correct-password';
    const { key, salt } = keyDerivation.deriveKey(password);

    const isValid = keyDerivation.verifyPassword(password, salt, key);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', () => {
    const correctPassword = 'correct';
    const wrongPassword = 'wrong';

    const { key, salt } = keyDerivation.deriveKey(correctPassword);

    const isValid = keyDerivation.verifyPassword(wrongPassword, salt, key);
    expect(isValid).toBe(false);
  });

  test('should reject empty password', () => {
    expect(() => {
      keyDerivation.deriveKey('');
    }).toThrow('Password cannot be empty');
  });
});