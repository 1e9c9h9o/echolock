'use strict';

/**
 * HKDF (Hierarchical Key Derivation Function) Test Suite
 *
 * Tests for RFC 5869 compliant HKDF implementation
 * and the hierarchical key derivation system
 */

import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';
import {
  hkdf,
  deriveSwitchKey,
  derivePurposeKey,
  deriveFragmentKey,
  deriveKeyHierarchy,
  reconstructKeyHierarchy,
  deriveKey
} from '../../src/crypto/keyDerivation.js';

describe('HKDF Implementation', () => {

  test('should produce 32-byte output by default', () => {
    const ikm = crypto.randomBytes(32);
    const result = hkdf(ikm, 'test-info');

    expect(result).toBeInstanceOf(Buffer);
    expect(result).toHaveLength(32);
  });

  test('should produce different outputs for different info strings', () => {
    const ikm = crypto.randomBytes(32);

    const key1 = hkdf(ikm, 'info-1');
    const key2 = hkdf(ikm, 'info-2');

    expect(key1.equals(key2)).toBe(false);
  });

  test('should produce same output for same inputs (deterministic)', () => {
    const ikm = Buffer.from('0'.repeat(64), 'hex');
    const info = 'consistent-info';

    const key1 = hkdf(ikm, info);
    const key2 = hkdf(ikm, info);

    expect(key1.equals(key2)).toBe(true);
  });

  test('should produce different outputs for different IKM', () => {
    const ikm1 = crypto.randomBytes(32);
    const ikm2 = crypto.randomBytes(32);
    const info = 'same-info';

    const key1 = hkdf(ikm1, info);
    const key2 = hkdf(ikm2, info);

    expect(key1.equals(key2)).toBe(false);
  });

  test('should support custom output lengths', () => {
    const ikm = crypto.randomBytes(32);

    const key16 = hkdf(ikm, 'test', null, 16);
    const key64 = hkdf(ikm, 'test', null, 64);

    expect(key16).toHaveLength(16);
    expect(key64).toHaveLength(64);
  });

  test('should incorporate salt when provided', () => {
    const ikm = crypto.randomBytes(32);
    const salt1 = crypto.randomBytes(32);
    const salt2 = crypto.randomBytes(32);
    const info = 'test-info';

    const key1 = hkdf(ikm, info, salt1);
    const key2 = hkdf(ikm, info, salt2);
    const keyNoSalt = hkdf(ikm, info, null);

    expect(key1.equals(key2)).toBe(false);
    expect(key1.equals(keyNoSalt)).toBe(false);
  });
});

describe('Switch Key Derivation', () => {

  test('should derive unique keys for different switches', () => {
    const masterKey = crypto.randomBytes(32);

    const switchKey1 = deriveSwitchKey(masterKey, 'switch-001');
    const switchKey2 = deriveSwitchKey(masterKey, 'switch-002');

    expect(switchKey1.equals(switchKey2)).toBe(false);
  });

  test('should derive same key for same switch ID (deterministic)', () => {
    const masterKey = crypto.randomBytes(32);
    const switchId = 'my-switch';

    const key1 = deriveSwitchKey(masterKey, switchId);
    const key2 = deriveSwitchKey(masterKey, switchId);

    expect(key1.equals(key2)).toBe(true);
  });

  test('should reject invalid master key', () => {
    expect(() => deriveSwitchKey(null, 'switch-1')).toThrow('Master key must be 32 bytes');
    expect(() => deriveSwitchKey(Buffer.alloc(16), 'switch-1')).toThrow('Master key must be 32 bytes');
  });

  test('should reject invalid switch ID', () => {
    const masterKey = crypto.randomBytes(32);

    expect(() => deriveSwitchKey(masterKey, '')).toThrow('Switch ID must be a non-empty string');
    expect(() => deriveSwitchKey(masterKey, null)).toThrow('Switch ID must be a non-empty string');
  });
});

describe('Purpose Key Derivation', () => {

  test('should derive unique keys for different purposes', () => {
    const switchKey = crypto.randomBytes(32);

    const encKey = derivePurposeKey(switchKey, 'encryption');
    const authKey = derivePurposeKey(switchKey, 'auth');
    const btcKey = derivePurposeKey(switchKey, 'bitcoin');
    const nostrKey = derivePurposeKey(switchKey, 'nostr');

    // All should be unique
    const keys = [encKey, authKey, btcKey, nostrKey];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        expect(keys[i].equals(keys[j])).toBe(false);
      }
    }
  });

  test('should reject unknown purpose', () => {
    const switchKey = crypto.randomBytes(32);

    expect(() => derivePurposeKey(switchKey, 'invalid')).toThrow('Unknown purpose');
  });
});

describe('Fragment Key Derivation', () => {

  test('should derive unique keys for different fragment indices', () => {
    const encryptionKey = crypto.randomBytes(32);

    const frag0 = deriveFragmentKey(encryptionKey, 0);
    const frag1 = deriveFragmentKey(encryptionKey, 1);
    const frag2 = deriveFragmentKey(encryptionKey, 2);

    expect(frag0.equals(frag1)).toBe(false);
    expect(frag1.equals(frag2)).toBe(false);
    expect(frag0.equals(frag2)).toBe(false);
  });

  test('should reject invalid fragment index', () => {
    const encryptionKey = crypto.randomBytes(32);

    expect(() => deriveFragmentKey(encryptionKey, -1)).toThrow('Fragment index must be 0-255');
    expect(() => deriveFragmentKey(encryptionKey, 256)).toThrow('Fragment index must be 0-255');
    expect(() => deriveFragmentKey(encryptionKey, 'zero')).toThrow('Fragment index must be 0-255');
  });
});

describe('Complete Key Hierarchy', () => {

  test('should derive complete key hierarchy from password', () => {
    const password = 'test-password-123';
    const switchId = 'test-switch';

    const hierarchy = deriveKeyHierarchy(password, switchId);

    // Check all keys are present and 32 bytes
    expect(hierarchy.salt).toHaveLength(32);
    expect(hierarchy.encryptionKey).toHaveLength(32);
    expect(hierarchy.authKey).toHaveLength(32);
    expect(hierarchy.bitcoinKey).toHaveLength(32);
    expect(hierarchy.nostrKey).toHaveLength(32);
    expect(hierarchy.fragmentKeys).toHaveLength(5);

    hierarchy.fragmentKeys.forEach(key => {
      expect(key).toHaveLength(32);
    });

    // Check metadata
    expect(hierarchy.metadata.switchId).toBe(switchId);
    expect(hierarchy.metadata.version).toBe(1);
    expect(hierarchy.metadata.iterations).toBe(600000);
  });

  test('should produce unique hierarchies for different switches', () => {
    const password = 'same-password';

    const h1 = deriveKeyHierarchy(password, 'switch-1');
    const h2 = deriveKeyHierarchy(password, 'switch-2');

    // Salts are random, so different
    expect(h1.salt.equals(h2.salt)).toBe(false);

    // Keys should be different even if password is same
    expect(h1.encryptionKey.equals(h2.encryptionKey)).toBe(false);
    expect(h1.authKey.equals(h2.authKey)).toBe(false);
    expect(h1.bitcoinKey.equals(h2.bitcoinKey)).toBe(false);
  });

  test('should reconstruct identical hierarchy with same salt', () => {
    const password = 'test-password';
    const switchId = 'test-switch';

    // Create original hierarchy
    const original = deriveKeyHierarchy(password, switchId);

    // Reconstruct with same salt
    const reconstructed = reconstructKeyHierarchy(
      password,
      switchId,
      original.salt
    );

    // All keys should match
    expect(original.encryptionKey.equals(reconstructed.encryptionKey)).toBe(true);
    expect(original.authKey.equals(reconstructed.authKey)).toBe(true);
    expect(original.bitcoinKey.equals(reconstructed.bitcoinKey)).toBe(true);
    expect(original.nostrKey.equals(reconstructed.nostrKey)).toBe(true);

    for (let i = 0; i < 5; i++) {
      expect(original.fragmentKeys[i].equals(reconstructed.fragmentKeys[i])).toBe(true);
    }
  });

  test('should fail reconstruction with wrong password', () => {
    const switchId = 'test-switch';

    const original = deriveKeyHierarchy('correct-password', switchId);
    const wrong = reconstructKeyHierarchy('wrong-password', switchId, original.salt);

    // Keys should NOT match with wrong password
    expect(original.encryptionKey.equals(wrong.encryptionKey)).toBe(false);
  });

  test('should fail reconstruction with wrong switch ID', () => {
    const password = 'test-password';

    const original = deriveKeyHierarchy(password, 'switch-1');
    const wrong = reconstructKeyHierarchy(password, 'switch-2', original.salt);

    // Keys should NOT match with wrong switch ID
    expect(original.encryptionKey.equals(wrong.encryptionKey)).toBe(false);
  });
});

describe('Cross-Switch Isolation', () => {

  test('compromising one switch should not reveal another', () => {
    const password = 'shared-password';

    // User creates two switches with same password
    const switch1 = deriveKeyHierarchy(password, 'switch-1');
    const switch2 = deriveKeyHierarchy(password, 'switch-2');

    // Attacker compromises switch1's encryptionKey
    const compromisedKey = switch1.encryptionKey;

    // Attacker cannot derive switch2's keys from switch1's keys
    // because they don't have the master key or switch key
    expect(compromisedKey.equals(switch2.encryptionKey)).toBe(false);

    // Even with switch1's salt, attacker needs password AND switch ID
    const attemptedReconstruct = reconstructKeyHierarchy(
      password,
      'switch-1',
      switch1.salt
    );

    // This matches switch1, but NOT switch2
    expect(attemptedReconstruct.encryptionKey.equals(switch1.encryptionKey)).toBe(true);
    expect(attemptedReconstruct.encryptionKey.equals(switch2.encryptionKey)).toBe(false);
  });
});

describe('Version and Domain Separation', () => {

  test('should use versioned domain strings', () => {
    const password = 'test';
    const switchId = 'switch-1';

    const hierarchy = deriveKeyHierarchy(password, switchId);

    // The version is embedded in domain strings (v1)
    // This test verifies the hierarchy includes version info
    expect(hierarchy.metadata.version).toBe(1);
    expect(hierarchy.metadata.algorithm).toBe('PBKDF2-HKDF-SHA256');
  });
});
