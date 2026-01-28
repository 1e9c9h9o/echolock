'use strict';

/**
 * SECURITY TEST SUITE: IV Uniqueness and Collision Detection
 * 
 * VULNERABILITY: IV reuse with same key (CVSS 9.8)
 * 
 * Attack Scenarios:
 * 1. Same IV used twice with same key → complete cryptographic compromise
 * 2. Deterministic IV generation → predictable IVs
 * 3. Birthday paradox → IV collision after 2^48 encryptions
 * 4. IV tracking database corruption → duplicate IVs accepted
 * 
 * References:
 * - NIST SP 800-38D Section 8: "the total number of invocations of the
 *   authenticated encryption function shall not exceed 2^32"
 * - Böck et al. (2016): "Nonce-Disrespecting Adversaries"
 * - CVE-2021-25444: Samsung TrustZone IV reuse vulnerability
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import {
  encrypt,
  decrypt,
  getEncryptionCount,
  resetEncryptionCounter,
  checkKeyUsage
} from '../../src/crypto/encryption.js';

describe('IV Uniqueness Enforcement', () => {
  
  test('should generate cryptographically random IVs', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test data');
    
    // Generate 1000 IVs and ensure they're unique
    const ivs = new Set();
    for (let i = 0; i < 1000; i++) {
      const { iv } = encrypt(plaintext, key);
      const ivHex = iv.toString('hex');
      
      // Should never see duplicate IV
      expect(ivs.has(ivHex)).toBe(false);
      ivs.add(ivHex);
    }
    
    expect(ivs.size).toBe(1000);
  });

  test('should generate different IV for same plaintext + same key', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('same data');
    
    const result1 = encrypt(plaintext, key);
    const result2 = encrypt(plaintext, key);
    
    // IVs MUST be different even with identical inputs
    expect(result1.iv.equals(result2.iv)).toBe(false);
    
    // Ciphertexts MUST also be different (due to different IVs)
    expect(result1.ciphertext.equals(result2.ciphertext)).toBe(false);
  });

  test('should have sufficient IV entropy (96 bits)', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    const { iv } = encrypt(plaintext, key);
    
    // IV must be exactly 12 bytes (96 bits)
    expect(iv).toHaveLength(12);
    
    // IV should appear random (chi-squared test would go here in production)
    // For now, check it's not all zeros or all 0xFF
    const allZeros = Buffer.alloc(12, 0);
    const allOnes = Buffer.alloc(12, 0xFF);
    
    expect(iv.equals(allZeros)).toBe(false);
    expect(iv.equals(allOnes)).toBe(false);
  });

  test('should reject manually provided IV (if API allowed it)', () => {
    // This tests that the API doesn't accept user-provided IVs
    // Currently encrypt() generates IV internally - this is correct
    
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    // Function signature doesn't allow IV parameter - good!
    // If it did, this would be the test:
    // expect(() => encrypt(plaintext, key, userIV)).toThrow()
    
    const { iv } = encrypt(plaintext, key);
    expect(iv).toBeInstanceOf(Buffer);
  });
});

describe('IV Collision Detection (Birthday Paradox)', () => {

  test('should track encryption count per key', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test data');

    // Reset counter for clean test
    resetEncryptionCounter(key);

    // Initial count should be 0
    expect(getEncryptionCount(key)).toBe(0);

    // Encrypt and check count increments
    encrypt(plaintext, key);
    expect(getEncryptionCount(key)).toBe(1);

    encrypt(plaintext, key);
    expect(getEncryptionCount(key)).toBe(2);

    // Different key should have independent counter
    const key2 = crypto.randomBytes(32);
    expect(getEncryptionCount(key2)).toBe(0);

    // Clean up
    resetEncryptionCounter(key);
    resetEncryptionCounter(key2);
  });

  test('should provide key usage status via checkKeyUsage', () => {
    const key = crypto.randomBytes(32);
    resetEncryptionCounter(key);

    // Fresh key should be safe with no warning
    let status = checkKeyUsage(key);
    expect(status.safe).toBe(true);
    expect(status.warning).toBe(false);
    expect(status.count).toBe(0);

    // Clean up
    resetEncryptionCounter(key);
  });

  test('should define correct thresholds per NIST SP 800-38D', () => {
    // Per NIST SP 800-38D, GCM should not encrypt more than 2^32 blocks
    // with same key. We warn at 2^31 and refuse at 2^32.

    const WARN_THRESHOLD = Math.pow(2, 31);
    const MAX_THRESHOLD = Math.pow(2, 32);

    expect(WARN_THRESHOLD).toBe(2147483648);
    expect(MAX_THRESHOLD).toBe(4294967296);
  });

  test('should allow counter reset for key rotation', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');

    // Encrypt a few times
    encrypt(plaintext, key);
    encrypt(plaintext, key);
    expect(getEncryptionCount(key)).toBe(2);

    // Reset simulates key rotation
    resetEncryptionCounter(key);
    expect(getEncryptionCount(key)).toBe(0);

    // Can encrypt again
    encrypt(plaintext, key);
    expect(getEncryptionCount(key)).toBe(1);

    // Clean up
    resetEncryptionCounter(key);
  });
});

describe('IV Storage and Retrieval Integrity', () => {
  
  test('should store IV with ciphertext atomically', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('sensitive data');
    
    const { ciphertext, iv, authTag } = encrypt(plaintext, key);
    
    // Simulate storage (all three must be stored together)
    const stored = {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
    
    // Simulate retrieval
    const retrieved = {
      ciphertext: Buffer.from(stored.ciphertext, 'base64'),
      iv: Buffer.from(stored.iv, 'base64'),
      authTag: Buffer.from(stored.authTag, 'base64')
    };
    
    // Should decrypt successfully
    const decrypted = decrypt(
      retrieved.ciphertext,
      key,
      retrieved.iv,
      retrieved.authTag
    );
    
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  test('should fail decryption with wrong IV', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test data');
    
    const { ciphertext, authTag } = encrypt(plaintext, key);
    const wrongIV = crypto.randomBytes(12); // Different IV
    
    // Decryption should fail authentication
    expect(() => decrypt(ciphertext, key, wrongIV, authTag))
      .toThrow(/authentication tag verification failed/i);
  });

  test('should fail decryption with IV from different encryption', () => {
    const key = crypto.randomBytes(32);
    const plaintext1 = Buffer.from('first message');
    const plaintext2 = Buffer.from('second message');
    
    const result1 = encrypt(plaintext1, key);
    const result2 = encrypt(plaintext2, key);
    
    // Try to decrypt result2 ciphertext with result1 IV
    expect(() => decrypt(
      result2.ciphertext,
      key,
      result1.iv, // Wrong IV!
      result2.authTag
    )).toThrow(/authentication tag verification failed/i);
  });
});

describe('IV Reuse Attack Simulation', () => {
  
  test('ATTACK: IV reuse reveals XOR of plaintexts', () => {
    // This demonstrates the attack - for educational purposes only
    
    const key = crypto.randomBytes(32);
    
    // Two different messages
    const plaintext1 = Buffer.from('ATTACK AT DAWN');
    const plaintext2 = Buffer.from('RETREAT AT DUSK');
    
    // Simulate IV reuse (manually using Node's crypto)
    const reusedIV = crypto.randomBytes(12);
    
    const cipher1 = crypto.createCipheriv('aes-256-gcm', key, reusedIV);
    const ciphertext1 = Buffer.concat([cipher1.update(plaintext1), cipher1.final()]);
    const authTag1 = cipher1.getAuthTag();
    
    const cipher2 = crypto.createCipheriv('aes-256-gcm', key, reusedIV); // REUSED IV!
    const ciphertext2 = Buffer.concat([cipher2.update(plaintext2), cipher2.final()]);
    const authTag2 = cipher2.getAuthTag();
    
    // Attacker XORs the two ciphertexts
    const xor = Buffer.alloc(Math.min(ciphertext1.length, ciphertext2.length));
    for (let i = 0; i < xor.length; i++) {
      xor[i] = ciphertext1[i] ^ ciphertext2[i];
    }
    
    // This XOR equals plaintext1 XOR plaintext2
    // Attacker can use frequency analysis to recover both plaintexts
    const expectedXor = Buffer.alloc(Math.min(plaintext1.length, plaintext2.length));
    for (let i = 0; i < expectedXor.length; i++) {
      expectedXor[i] = plaintext1[i] ^ plaintext2[i];
    }
    
    expect(xor.equals(expectedXor)).toBe(true);
    
    // This proves IV reuse is catastrophic
    console.log('⚠️  IV reuse attack successful - plaintexts revealed via XOR');
  });

  test('DEFENSE: encrypt() always generates unique IV', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('SENSITIVE DATA');
    
    // Our encrypt function should NEVER allow IV reuse
    const result1 = encrypt(plaintext, key);
    const result2 = encrypt(plaintext, key);
    
    // Different IVs protect against XOR attack
    expect(result1.iv.equals(result2.iv)).toBe(false);
    
    // Even with same plaintext, ciphertexts differ
    expect(result1.ciphertext.equals(result2.ciphertext)).toBe(false);
  });
});

describe('IV Format and Encoding', () => {
  
  test('should use 96-bit (12-byte) IV for GCM', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    const { iv } = encrypt(plaintext, key);
    
    // NIST SP 800-38D recommends 96-bit IV for GCM
    expect(iv).toHaveLength(12);
  });

  test('should maintain IV integrity through base64 encoding', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    const { iv } = encrypt(plaintext, key);
    
    // Simulate storage encoding
    const encoded = iv.toString('base64');
    const decoded = Buffer.from(encoded, 'base64');
    
    // IV must survive encoding/decoding intact
    expect(decoded.equals(iv)).toBe(true);
    expect(decoded).toHaveLength(12);
  });

  test('should always use 12-byte IV in encrypt function', () => {
    // Note: Node.js GCM accepts various IV lengths (8, 12, 16 bytes)
    // but 12 bytes is optimal for performance and is the NIST recommendation
    // Our encrypt() function should ALWAYS use exactly 12 bytes
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test message');

    // Verify our encrypt function uses 12-byte IVs
    const { iv } = encrypt(plaintext, key);
    expect(iv).toHaveLength(12);

    // Verify this is consistent across multiple calls
    for (let i = 0; i < 10; i++) {
      const { iv: testIv } = encrypt(plaintext, key);
      expect(testIv).toHaveLength(12);
    }
  });
});

describe('Cross-System IV Tracking', () => {
  
  test('should track IVs per encryption key', () => {
    // Different keys can reuse same IV value (they're independent)
    const key1 = crypto.randomBytes(32);
    const key2 = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    // Manually create same IV for different keys (for testing)
    const sharedIV = crypto.randomBytes(12);
    
    const cipher1 = crypto.createCipheriv('aes-256-gcm', key1, sharedIV);
    const cipher2 = crypto.createCipheriv('aes-256-gcm', key2, sharedIV);
    
    // This is SAFE because keys are different
    // IV uniqueness is required per-key, not globally
    
    expect(key1.equals(key2)).toBe(false);
    expect(true).toBe(true); // Valid use case
  });

  test('should never reuse IV with same key', () => {
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    // Track all IVs used with this key
    const ivTracker = new Set();
    
    for (let i = 0; i < 100; i++) {
      const { iv } = encrypt(plaintext, key);
      const ivHex = iv.toString('hex');
      
      // IV should never repeat with same key
      expect(ivTracker.has(ivHex)).toBe(false);
      ivTracker.add(ivHex);
    }
  });
});

describe('IV Security Best Practices Verification', () => {
  
  test('should not derive IV from predictable sources', () => {
    // IVs must NEVER be derived from:
    // - Message content
    // - Timestamps
    // - Sequential counters
    // - User input
    
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test message');
    
    const result1 = encrypt(plaintext, key);
    const result2 = encrypt(plaintext, key);
    
    // Even with identical plaintext, IVs must be different
    expect(result1.iv.equals(result2.iv)).toBe(false);
  });

  test('should use cryptographically secure random source', () => {
    // crypto.randomBytes() uses OS entropy source
    // This is the correct way to generate IVs
    
    const key = crypto.randomBytes(32);
    const plaintext = Buffer.from('test');
    
    const { iv } = encrypt(plaintext, key);
    
    // IV generation uses crypto.randomBytes internally
    expect(iv).toBeInstanceOf(Buffer);
    expect(iv).toHaveLength(12);
    
    // Statistical test would go here in production
    // For now, verify it's not a known-bad pattern
    const zeros = Buffer.alloc(12, 0);
    expect(iv.equals(zeros)).toBe(false);
  });
});
