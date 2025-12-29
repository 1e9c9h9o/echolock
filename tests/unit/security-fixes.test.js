'use strict';

/**
 * Security tests for P0 critical fixes
 * Tests HMAC authentication, atomic storage, and integrity verification
 */

import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';
import {
  splitAndAuthenticateSecret,
  combineAuthenticatedShares,
  authenticateShare,
  verifyShare,
  deriveAuthenticationKey
} from '../../src/crypto/secretSharing.js';
import {
  createFragmentPayload,
  verifyFragmentPayload,
  serializePayload,
  deserializeAndVerify,
  stableStringify
} from '../../src/nostr/fragmentFormat.js';
import { encrypt, decrypt } from '../../src/crypto/encryption.js';

describe('HMAC Authentication for Shamir Shares', () => {
  test('should authenticate shares with HMAC', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    expect(shares).toHaveLength(5);
    shares.forEach((authShare, index) => {
      expect(authShare).toHaveProperty('share');
      expect(authShare).toHaveProperty('hmac');
      expect(authShare).toHaveProperty('index');
      expect(authShare.index).toBe(index);
      expect(authShare.share).toBeInstanceOf(Buffer);
      expect(authShare.hmac).toBeInstanceOf(Buffer);
      expect(authShare.hmac).toHaveLength(32); // SHA-256 HMAC
    });

    expect(authKey).toBeInstanceOf(Buffer);
    expect(authKey).toHaveLength(32);
  });

  test('should verify valid share HMAC', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Verify each share
    shares.forEach(authShare => {
      expect(() => verifyShare(authShare, authKey)).not.toThrow();
    });
  });

  test('should reject corrupted share HMAC', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Corrupt the share data
    const corruptedShare = {
      ...shares[0],
      share: crypto.randomBytes(32) // Replace with random data
    };

    expect(() => verifyShare(corruptedShare, authKey)).toThrow(/HMAC verification failed/);
  });

  test('should reject forged share HMAC', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Forge a fake HMAC
    const forgedShare = {
      ...shares[0],
      hmac: crypto.randomBytes(32) // Fake HMAC
    };

    expect(() => verifyShare(forgedShare, authKey)).toThrow(/HMAC verification failed/);
  });

  test('should prevent share reordering attacks', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Try to swap indices (attack)
    const swappedShare = {
      ...shares[0],
      index: 1 // Wrong index
    };

    // HMAC includes the index, so this should fail
    expect(() => verifyShare(swappedShare, authKey)).toThrow(/HMAC verification failed/);
  });

  test('should enforce minimum threshold', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Try to reconstruct with only 2 shares (should fail)
    await expect(combineAuthenticatedShares(shares.slice(0, 2), authKey))
      .rejects.toThrow(/Insufficient shares.*need at least 3.*got 2/);
  });

  test('should successfully reconstruct with sufficient shares', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Reconstruct with exactly 3 shares
    const reconstructed = await combineAuthenticatedShares(shares.slice(0, 3), authKey);

    expect(reconstructed).toBeInstanceOf(Buffer);
    expect(reconstructed).toHaveLength(32);
    expect(reconstructed.equals(Buffer.from(secret))).toBe(true);
  });

  test('should reconstruct with any valid 3-of-5 subset', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Test different combinations
    const combinations = [
      [0, 1, 2],
      [0, 2, 4],
      [1, 3, 4],
      [2, 3, 4]
    ];

    for (const combo of combinations) {
      const subset = combo.map(i => shares[i]);
      const reconstructed = await combineAuthenticatedShares(subset, authKey);
      expect(reconstructed.equals(Buffer.from(secret))).toBe(true);
    }
  });

  test('should fail fast on corrupted share in reconstruction', async () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const { shares, authKey } = await splitAndAuthenticateSecret(secret, 5, 3);

    // Corrupt one share in the middle
    const corruptedShares = [
      shares[0],
      { ...shares[1], share: crypto.randomBytes(32) }, // Corrupted
      shares[2]
    ];

    await expect(combineAuthenticatedShares(corruptedShares, authKey))
      .rejects.toThrow(/HMAC verification failed/);
  });
});

describe('Atomic Cryptographic Storage', () => {
  test('should create atomic fragment payload', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);

    expect(payload).toHaveProperty('version', 1);
    expect(payload).toHaveProperty('ciphertext');
    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('authTag');
    expect(payload).toHaveProperty('salt');
    expect(payload).toHaveProperty('iterations', 600000);
    expect(payload).toHaveProperty('algorithm', 'AES-256-GCM');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('integrity');

    // Verify integrity hash exists and is hex string
    expect(payload.integrity).toMatch(/^[0-9a-f]{64}$/);
  });

  test('should verify valid payload integrity', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);
    const verified = verifyFragmentPayload(payload);

    expect(verified).toHaveProperty('ciphertext');
    expect(verified).toHaveProperty('iv');
    expect(verified).toHaveProperty('authTag');
    expect(verified).toHaveProperty('salt');
    expect(verified).toHaveProperty('iterations', 600000);

    // All fields should be Buffers
    expect(verified.ciphertext).toBeInstanceOf(Buffer);
    expect(verified.iv).toBeInstanceOf(Buffer);
    expect(verified.authTag).toBeInstanceOf(Buffer);
    expect(verified.salt).toBeInstanceOf(Buffer);
  });

  test('should detect corrupted IV', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);

    // Corrupt the IV
    payload.iv = Buffer.from(crypto.randomBytes(12)).toString('base64');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Fragment integrity verification failed/);
  });

  test('should detect corrupted authTag', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);

    // Corrupt the authTag
    payload.authTag = Buffer.from(crypto.randomBytes(16)).toString('base64');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Fragment integrity verification failed/);
  });

  test('should detect corrupted salt', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);

    // Corrupt the salt
    payload.salt = Buffer.from(crypto.randomBytes(32)).toString('base64');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Fragment integrity verification failed/);
  });

  test('should detect tampered ciphertext', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);

    // Tamper with ciphertext
    const tamperedCiphertext = Buffer.from(payload.ciphertext, 'base64');
    tamperedCiphertext[0] ^= 0xFF; // Flip bits
    payload.ciphertext = tamperedCiphertext.toString('base64');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Fragment integrity verification failed/);
  });

  test('should reject missing required fields', () => {
    // Create a minimal valid payload first
    const plaintext = Buffer.from('test');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);
    const metadata = { salt: crypto.randomBytes(32), iterations: 600000 };
    const payload = createFragmentPayload(encryptedData, metadata);

    // Now delete a required field AFTER creating valid integrity
    delete payload.iv;

    // Re-compute integrity for the corrupted payload using stableStringify
    const payloadForHash = { ...payload };
    delete payloadForHash.integrity;
    payload.integrity = crypto.createHash('sha256')
      .update(stableStringify(payloadForHash))
      .digest('hex');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Missing required field/);
  });

  test('should reject unsupported version', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);
    payload.version = 99; // Unsupported version

    // Need to recompute integrity for the test using stableStringify
    const payloadForHash = { ...payload };
    delete payloadForHash.integrity;
    payload.integrity = crypto.createHash('sha256')
      .update(stableStringify(payloadForHash))
      .digest('hex');

    expect(() => verifyFragmentPayload(payload))
      .toThrow(/Unsupported payload version/);
  });

  test('should serialize and deserialize correctly', () => {
    const plaintext = Buffer.from('test data');
    const key = crypto.randomBytes(32);
    const encryptedData = encrypt(plaintext, key);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };

    const payload = createFragmentPayload(encryptedData, metadata);
    const serialized = serializePayload(payload);

    expect(typeof serialized).toBe('string');

    const deserialized = deserializeAndVerify(serialized);

    expect(deserialized.ciphertext.equals(encryptedData.ciphertext)).toBe(true);
    expect(deserialized.iv.equals(encryptedData.iv)).toBe(true);
    expect(deserialized.authTag.equals(encryptedData.authTag)).toBe(true);
    expect(deserialized.salt.equals(metadata.salt)).toBe(true);
    expect(deserialized.iterations).toBe(600000);
  });
});

describe('End-to-End Security Flow', () => {
  test('should complete full encryption + HMAC + atomic storage workflow', async () => {
    // 1. Create secret and split with HMAC
    const originalSecret = new Uint8Array(crypto.randomBytes(32));
    const { shares: authenticatedShares, authKey } = await splitAndAuthenticateSecret(
      originalSecret,
      5,
      3
    );

    // 2. Encrypt each authenticated share
    const fragmentKey = crypto.randomBytes(32);
    const encryptedFragments = authenticatedShares.map(authShare => {
      // Serialize: share + hmac + index
      const shareData = Buffer.concat([
        authShare.share,
        authShare.hmac,
        Buffer.from([authShare.index])
      ]);

      return encrypt(shareData, fragmentKey);
    });

    // 3. Create atomic storage payloads
    const salt = crypto.randomBytes(32);
    const payloads = encryptedFragments.map(encData =>
      createFragmentPayload(encData, { salt, iterations: 600000 })
    );

    // 4. Serialize for storage
    const serialized = payloads.map(p => serializePayload(p));

    // 5. RETRIEVAL: Deserialize and verify integrity
    const retrievedPayloads = serialized.map(s => deserializeAndVerify(s));

    // 6. Decrypt shares
    const decryptedShares = retrievedPayloads.slice(0, 3).map(payload => {
      const shareData = decrypt(
        payload.ciphertext,
        fragmentKey,
        payload.iv,
        payload.authTag
      );

      // Deserialize: share (33 bytes for Shamir) + hmac (32 bytes) + index (1 byte)
      const shareLength = shareData.length - 32 - 1; // Total - HMAC - index
      return {
        share: shareData.slice(0, shareLength),
        hmac: shareData.slice(shareLength, shareLength + 32),
        index: shareData[shareLength + 32]
      };
    });

    // 7. Verify HMAC and reconstruct
    const reconstructedSecret = await combineAuthenticatedShares(decryptedShares, authKey);

    // 8. Verify reconstruction succeeded
    expect(reconstructedSecret.equals(Buffer.from(originalSecret))).toBe(true);
  });

  test('should fail on corrupted fragment in full workflow', async () => {
    const originalSecret = new Uint8Array(crypto.randomBytes(32));
    const { shares: authenticatedShares, authKey } = await splitAndAuthenticateSecret(
      originalSecret,
      5,
      3
    );

    const fragmentKey = crypto.randomBytes(32);
    const encryptedFragments = authenticatedShares.map(authShare => {
      const shareData = Buffer.concat([
        authShare.share,
        authShare.hmac,
        Buffer.from([authShare.index])
      ]);
      return encrypt(shareData, fragmentKey);
    });

    const salt = crypto.randomBytes(32);
    const payloads = encryptedFragments.map(encData =>
      createFragmentPayload(encData, { salt, iterations: 600000 })
    );

    const serialized = payloads.map(p => serializePayload(p));

    // CORRUPT one payload
    const corruptedSerialized = [...serialized];
    const corruptedPayload = JSON.parse(corruptedSerialized[1]);
    corruptedPayload.iv = Buffer.from(crypto.randomBytes(12)).toString('base64');
    corruptedSerialized[1] = JSON.stringify(corruptedPayload);

    // Should fail on integrity verification
    expect(() => deserializeAndVerify(corruptedSerialized[1]))
      .toThrow(/Fragment integrity verification failed/);
  });
});
