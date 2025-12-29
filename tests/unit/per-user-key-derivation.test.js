'use strict';

/**
 * Unit tests for per-user key derivation
 *
 * SECURITY TESTS:
 * - Key isolation: different users get different keys
 * - Key versioning: different versions produce different keys
 * - UUID validation: rejects invalid user IDs
 * - Encrypt/decrypt round-trip: data integrity verified
 * - Cross-user isolation: can't decrypt with wrong user key
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import crypto from 'crypto';

// Set up test environment before importing module
beforeAll(() => {
  // Set a deterministic master key for testing
  process.env.SERVICE_MASTER_KEY = crypto.randomBytes(32).toString('hex');
});

// Import after setting env var
let cryptoUtils;

describe('Per-User Key Derivation', () => {
  beforeAll(async () => {
    // Dynamic import to pick up env var
    cryptoUtils = await import('../../src/api/utils/crypto.js');
  });

  describe('deriveUserKey', () => {
    test('should derive a 32-byte key from valid UUID', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const key = cryptoUtils.deriveUserKey(userId);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    test('should produce different keys for different users', () => {
      const user1 = '550e8400-e29b-41d4-a716-446655440001';
      const user2 = '550e8400-e29b-41d4-a716-446655440002';

      const key1 = cryptoUtils.deriveUserKey(user1);
      const key2 = cryptoUtils.deriveUserKey(user2);

      // Keys should be different
      expect(key1.equals(key2)).toBe(false);

      // But both should be valid 32-byte keys
      expect(key1.length).toBe(32);
      expect(key2.length).toBe(32);
    });

    test('should produce different keys for different versions', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const keyV1 = cryptoUtils.deriveUserKey(userId, 1);
      const keyV2 = cryptoUtils.deriveUserKey(userId, 2);

      expect(keyV1.equals(keyV2)).toBe(false);
    });

    test('should produce consistent keys for same userId and version', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const key1 = cryptoUtils.deriveUserKey(userId, 1);
      const key2 = cryptoUtils.deriveUserKey(userId, 1);

      expect(key1.equals(key2)).toBe(true);
    });

    test('should reject empty userId', () => {
      expect(() => cryptoUtils.deriveUserKey('')).toThrow('userId must be a non-empty string');
      expect(() => cryptoUtils.deriveUserKey(null)).toThrow('userId must be a non-empty string');
      expect(() => cryptoUtils.deriveUserKey(undefined)).toThrow('userId must be a non-empty string');
    });

    test('should reject invalid UUID format', () => {
      expect(() => cryptoUtils.deriveUserKey('not-a-uuid')).toThrow('userId must be a valid UUID');
      expect(() => cryptoUtils.deriveUserKey('12345')).toThrow('userId must be a valid UUID');
      expect(() => cryptoUtils.deriveUserKey('550e8400-e29b-41d4-a716')).toThrow('userId must be a valid UUID');
    });

    test('should reject invalid key versions', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      expect(() => cryptoUtils.deriveUserKey(userId, 0)).toThrow('keyVersion must be an integer between 1 and 255');
      expect(() => cryptoUtils.deriveUserKey(userId, -1)).toThrow('keyVersion must be an integer between 1 and 255');
      expect(() => cryptoUtils.deriveUserKey(userId, 256)).toThrow('keyVersion must be an integer between 1 and 255');
      expect(() => cryptoUtils.deriveUserKey(userId, 'one')).toThrow('keyVersion must be an integer between 1 and 255');
    });

    test('should handle case-insensitive UUIDs', () => {
      const lowerUuid = '550e8400-e29b-41d4-a716-446655440000';
      const upperUuid = '550E8400-E29B-41D4-A716-446655440000';

      // Both should be valid (but produce same key since context is case-sensitive)
      expect(() => cryptoUtils.deriveUserKey(lowerUuid)).not.toThrow();
      expect(() => cryptoUtils.deriveUserKey(upperUuid)).not.toThrow();
    });
  });

  describe('deriveSwitchKey', () => {
    test('should derive switch-specific key from user key', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const switchId = '660f9500-f39c-52e5-b827-557766550001';

      const userKey = cryptoUtils.deriveUserKey(userId);
      const switchKey = cryptoUtils.deriveSwitchKey(userKey, switchId);

      expect(switchKey).toBeInstanceOf(Buffer);
      expect(switchKey.length).toBe(32);
    });

    test('should produce different keys for different switches', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const switch1 = '660f9500-f39c-52e5-b827-557766550001';
      const switch2 = '660f9500-f39c-52e5-b827-557766550002';

      const userKey = cryptoUtils.deriveUserKey(userId);
      const switchKey1 = cryptoUtils.deriveSwitchKey(userKey, switch1);
      const switchKey2 = cryptoUtils.deriveSwitchKey(userKey, switch2);

      expect(switchKey1.equals(switchKey2)).toBe(false);
    });

    test('should reject invalid user key', () => {
      expect(() => cryptoUtils.deriveSwitchKey(null, 'switch-1')).toThrow('userKey must be a 32-byte Buffer');
      expect(() => cryptoUtils.deriveSwitchKey(Buffer.alloc(16), 'switch-1')).toThrow('userKey must be a 32-byte Buffer');
    });

    test('should reject empty switchId', () => {
      const userKey = cryptoUtils.deriveUserKey('550e8400-e29b-41d4-a716-446655440000');
      expect(() => cryptoUtils.deriveSwitchKey(userKey, '')).toThrow('switchId must be a non-empty string');
    });
  });

  describe('encryptForUser / decryptForUser', () => {
    test('should encrypt and decrypt data correctly', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = 'Super secret message for testing';

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('keyVersion');
      expect(encrypted.keyVersion).toBe(1);

      const decrypted = cryptoUtils.decryptForUser(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        userId,
        encrypted.keyVersion
      );

      expect(decrypted.toString('utf8')).toBe(plaintext);
    });

    test('should encrypt Buffer data correctly', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = crypto.randomBytes(64);

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId);
      const decrypted = cryptoUtils.decryptForUser(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        userId,
        encrypted.keyVersion
      );

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    test('should fail decryption with wrong user', () => {
      const user1 = '550e8400-e29b-41d4-a716-446655440001';
      const user2 = '550e8400-e29b-41d4-a716-446655440002';
      const plaintext = 'Secret data';

      const encrypted = cryptoUtils.encryptForUser(plaintext, user1);

      // Attempt to decrypt with wrong user should fail
      expect(() => {
        cryptoUtils.decryptForUser(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          user2,
          encrypted.keyVersion
        );
      }).toThrow(); // GCM auth tag verification will fail
    });

    test('should fail decryption with wrong key version', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = 'Secret data';

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId, 1);

      // Attempt to decrypt with wrong version should fail
      expect(() => {
        cryptoUtils.decryptForUser(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          userId,
          2 // Wrong version
        );
      }).toThrow();
    });

    test('should fail decryption with tampered ciphertext', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = 'Secret data';

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId);

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xFF;

      expect(() => {
        cryptoUtils.decryptForUser(
          tamperedCiphertext.toString('base64'),
          encrypted.iv,
          encrypted.authTag,
          userId,
          encrypted.keyVersion
        );
      }).toThrow();
    });

    test('should produce different ciphertext for same plaintext (random IV)', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = 'Same message twice';

      const encrypted1 = cryptoUtils.encryptForUser(plaintext, userId);
      const encrypted2 = cryptoUtils.encryptForUser(plaintext, userId);

      // IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // Ciphertexts should be different
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

      // But both should decrypt to same plaintext
      const decrypted1 = cryptoUtils.decryptForUser(
        encrypted1.ciphertext, encrypted1.iv, encrypted1.authTag, userId, encrypted1.keyVersion
      );
      const decrypted2 = cryptoUtils.decryptForUser(
        encrypted2.ciphertext, encrypted2.iv, encrypted2.authTag, userId, encrypted2.keyVersion
      );

      expect(decrypted1.toString()).toBe(plaintext);
      expect(decrypted2.toString()).toBe(plaintext);
    });

    test('should handle empty string', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = '';

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId);
      const decrypted = cryptoUtils.decryptForUser(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        userId,
        encrypted.keyVersion
      );

      expect(decrypted.toString('utf8')).toBe('');
    });

    test('should handle large data', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const plaintext = crypto.randomBytes(1024 * 1024); // 1MB

      const encrypted = cryptoUtils.encryptForUser(plaintext, userId);
      const decrypted = cryptoUtils.decryptForUser(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        userId,
        encrypted.keyVersion
      );

      expect(decrypted.equals(plaintext)).toBe(true);
    });
  });

  describe('Key Isolation Security', () => {
    test('user keys should have high entropy', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const key = cryptoUtils.deriveUserKey(userId);

      // Count unique bytes (should be high for random-looking key)
      const uniqueBytes = new Set(key).size;

      // For 32 bytes, we expect roughly 25-32 unique values
      expect(uniqueBytes).toBeGreaterThan(20);
    });

    test('derived keys should not reveal master key', () => {
      // Generate keys for many users
      const keys = [];
      for (let i = 0; i < 100; i++) {
        const uuid = `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`;
        keys.push(cryptoUtils.deriveUserKey(uuid));
      }

      // XOR all keys together - should not reveal anything useful
      const xored = Buffer.alloc(32, 0);
      for (const key of keys) {
        for (let i = 0; i < 32; i++) {
          xored[i] ^= key[i];
        }
      }

      // Result should still look random (not all zeros or predictable)
      const uniqueXored = new Set(xored).size;
      expect(uniqueXored).toBeGreaterThan(10);
    });

    test('keys should be independent (no correlation)', () => {
      const user1 = '550e8400-e29b-41d4-a716-446655440001';
      const user2 = '550e8400-e29b-41d4-a716-446655440002';

      const key1 = cryptoUtils.deriveUserKey(user1);
      const key2 = cryptoUtils.deriveUserKey(user2);

      // Count matching bytes (should be very low)
      let matchingBytes = 0;
      for (let i = 0; i < 32; i++) {
        if (key1[i] === key2[i]) matchingBytes++;
      }

      // Statistically, ~0.125 bytes should match by chance (32 * 1/256)
      // Allow up to 4 matching bytes (very conservative)
      expect(matchingBytes).toBeLessThan(5);
    });
  });
});

describe('Backward Compatibility', () => {
  let cryptoUtils;

  beforeAll(async () => {
    cryptoUtils = await import('../../src/api/utils/crypto.js');
  });

  test('encryptWithServiceKey should still work', () => {
    const plaintext = 'Legacy encryption test';

    const encrypted = cryptoUtils.encryptWithServiceKey(plaintext);

    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');

    const decrypted = cryptoUtils.decryptWithServiceKey(
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag
    );

    expect(decrypted.toString('utf8')).toBe(plaintext);
  });

  test('legacy and per-user encryption should be independent', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const plaintext = 'Test message';

    const legacyEncrypted = cryptoUtils.encryptWithServiceKey(plaintext);
    const userEncrypted = cryptoUtils.encryptForUser(plaintext, userId);

    // Legacy decryption should work
    const legacyDecrypted = cryptoUtils.decryptWithServiceKey(
      legacyEncrypted.ciphertext,
      legacyEncrypted.iv,
      legacyEncrypted.authTag
    );
    expect(legacyDecrypted.toString()).toBe(plaintext);

    // Per-user decryption should work
    const userDecrypted = cryptoUtils.decryptForUser(
      userEncrypted.ciphertext,
      userEncrypted.iv,
      userEncrypted.authTag,
      userId,
      userEncrypted.keyVersion
    );
    expect(userDecrypted.toString()).toBe(plaintext);

    // Cross-decryption should fail
    expect(() => {
      cryptoUtils.decryptForUser(
        legacyEncrypted.ciphertext,
        legacyEncrypted.iv,
        legacyEncrypted.authTag,
        userId,
        1
      );
    }).toThrow();
  });
});
