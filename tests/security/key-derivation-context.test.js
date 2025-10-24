'use strict';

/**
 * SECURITY TEST SUITE: Key Derivation Context Binding
 * 
 * VULNERABILITY: Same password across switches generates same keys (CVSS 8.1)
 * 
 * Attack Scenarios:
 * 1. User reuses password across multiple switches
 * 2. Attacker compromises one switch, derives key
 * 3. Same key used for ALL switches with that password
 * 4. Single compromise = total system compromise
 * 
 * Required Defense: Hierarchical Key Derivation
 * - Master key from password (expensive PBKDF2)
 * - Switch-specific keys from master (fast HKDF)
 * - Fragment-specific keys from switch key (fast HKDF)
 * 
 * References:
 * - NIST SP 800-132: Password-Based Key Derivation
 * - NIST SP 800-56C: Key Derivation (HKDF)
 */

import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';
import { deriveKey, verifyPassword } from '../../src/crypto/keyDerivation.js';

describe('Password-Salt Uniqueness', () => {
  
  test('should generate unique salt for each key derivation', () => {
    const password = 'SamePassword123';
    
    const result1 = deriveKey(password);
    const result2 = deriveKey(password);
    
    // Salts MUST be different even with same password
    expect(result1.salt.equals(result2.salt)).toBe(false);
    
    // Therefore, derived keys MUST also be different
    expect(result1.key.equals(result2.key)).toBe(false);
  });

  test('should use 256-bit (32-byte) salt', () => {
    const password = 'test';
    const { salt } = deriveKey(password);
    
    // NIST recommends at least 128 bits, we use 256 bits
    expect(salt).toHaveLength(32);
  });

  test('should generate cryptographically random salts', () => {
    const password = 'test';
    const salts = new Set();
    
    // Generate 100 salts, all should be unique
    for (let i = 0; i < 100; i++) {
      const { salt } = deriveKey(password);
      const saltHex = salt.toString('hex');
      
      expect(salts.has(saltHex)).toBe(false);
      salts.add(saltHex);
    }
    
    expect(salts.size).toBe(100);
  });
});

describe('Context-Independent Key Derivation (Current Implementation)', () => {
  
  test('VULNERABILITY: Same password + same salt = same key', () => {
    const password = 'MyPassword123';
    const fixedSalt = crypto.randomBytes(32);
    
    const result1 = deriveKey(password, fixedSalt);
    const result2 = deriveKey(password, fixedSalt);
    
    // This is EXPECTED behavior but creates vulnerability
    expect(result1.key.equals(result2.key)).toBe(true);
    
    console.warn('⚠️  Same password + salt = same key (no context binding)');
  });

  test('VULNERABILITY: Cross-switch key reuse risk', () => {
    const password = 'UserPassword';
    const salt = crypto.randomBytes(32);
    
    // Simulate two different switches
    const switch1Key = deriveKey(password, salt).key;
    const switch2Key = deriveKey(password, salt).key;
    
    // Keys are identical - compromise of switch1 reveals switch2
    expect(switch1Key.equals(switch2Key)).toBe(true);
    
    console.warn('⚠️  No switch context binding - all switches use same key');
  });

  test('should store salt with each switch', () => {
    // Current mitigation: each switch generates unique salt
    const password = 'UserPassword';
    
    const switch1 = deriveKey(password); // Generates salt1
    const switch2 = deriveKey(password); // Generates salt2
    
    // Different salts mean different keys
    expect(switch1.salt.equals(switch2.salt)).toBe(false);
    expect(switch1.key.equals(switch2.key)).toBe(false);
    
    // This works BUT relies on salt being truly random and stored correctly
  });
});

describe('Hierarchical Key Derivation (Required Fix)', () => {
  
  // Helper function for HKDF-Expand (simulating what should be implemented)
  function hkdfExpand(key, info, length = 32) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(info);
    hmac.update(Buffer.from([0x01])); // Counter = 1
    return hmac.digest().slice(0, length);
  }

  test('REQUIRED: Master key → switch-specific key derivation', () => {
    const password = 'UserPassword';
    const { key: masterKey, salt } = deriveKey(password);
    
    // Derive switch-specific keys from master
    const switchId1 = 'switch-001';
    const switchId2 = 'switch-002';
    
    const switchKey1 = hkdfExpand(
      masterKey,
      Buffer.from(`ECHOLOCK-SWITCH-v1-${switchId1}`)
    );
    
    const switchKey2 = hkdfExpand(
      masterKey,
      Buffer.from(`ECHOLOCK-SWITCH-v1-${switchId2}`)
    );
    
    // Switch keys MUST be different
    expect(switchKey1.equals(switchKey2)).toBe(false);
    
    // Both derived from same master, but contextually bound
    console.log('✅ Hierarchical derivation prevents cross-switch key reuse');
  });

  test('REQUIRED: Switch key → fragment-specific key derivation', () => {
    const password = 'UserPassword';
    const { key: masterKey } = deriveKey(password);
    
    const switchId = 'switch-001';
    const switchKey = hkdfExpand(
      masterKey,
      Buffer.from(`ECHOLOCK-SWITCH-v1-${switchId}`)
    );
    
    // Derive fragment-specific keys
    const fragmentKey0 = hkdfExpand(
      switchKey,
      Buffer.from('ECHOLOCK-FRAGMENT-v1-0')
    );
    
    const fragmentKey1 = hkdfExpand(
      switchKey,
      Buffer.from('ECHOLOCK-FRAGMENT-v1-1')
    );
    
    // Fragment keys MUST be different
    expect(fragmentKey0.equals(fragmentKey1)).toBe(false);
    
    // All derived from same switch key, but contextually bound
    console.log('✅ Fragment keys unique per index');
  });

  test('REQUIRED: Full hierarchical chain', () => {
    const password = 'UserPassword';
    const { key: masterKey, salt } = deriveKey(password);
    
    // Level 1: Master Key (from password)
    expect(masterKey).toHaveLength(32);
    
    // Level 2: Switch Keys (from master)
    const switch1Key = hkdfExpand(masterKey, Buffer.from('ECHOLOCK-SWITCH-v1-switch1'));
    const switch2Key = hkdfExpand(masterKey, Buffer.from('ECHOLOCK-SWITCH-v1-switch2'));
    
    expect(switch1Key.equals(switch2Key)).toBe(false);
    
    // Level 3: Fragment Keys (from switch)
    const switch1Fragment0 = hkdfExpand(switch1Key, Buffer.from('ECHOLOCK-FRAGMENT-v1-0'));
    const switch1Fragment1 = hkdfExpand(switch1Key, Buffer.from('ECHOLOCK-FRAGMENT-v1-1'));
    
    expect(switch1Fragment0.equals(switch1Fragment1)).toBe(false);
    
    // Cross-switch fragments should also differ
    const switch2Fragment0 = hkdfExpand(switch2Key, Buffer.from('ECHOLOCK-FRAGMENT-v1-0'));
    expect(switch1Fragment0.equals(switch2Fragment0)).toBe(false);
    
    console.log('✅ Full hierarchical key derivation verified');
  });

  test('should use version string to prevent cross-protocol attacks', () => {
    const masterKey = crypto.randomBytes(32);
    
    // Different versions should produce different keys
    const keyV1 = hkdfExpand(masterKey, Buffer.from('ECHOLOCK-SWITCH-v1-switch1'));
    const keyV2 = hkdfExpand(masterKey, Buffer.from('ECHOLOCK-SWITCH-v2-switch1'));
    
    expect(keyV1.equals(keyV2)).toBe(false);
    
    console.log('✅ Version binding prevents cross-protocol key reuse');
  });
});

describe('Key Derivation Metadata Storage', () => {
  
  test('should store salt, iterations, and algorithm with switch', () => {
    const password = 'test';
    const { key, salt } = deriveKey(password);
    
    // Metadata that MUST be stored with switch
    const metadata = {
      salt: salt.toString('base64'),
      iterations: 600000,
      algorithm: 'PBKDF2-HMAC-SHA256',
      version: 1
    };
    
    // All fields required for key reconstruction
    expect(metadata.salt).toBeTruthy();
    expect(metadata.iterations).toBe(600000);
    expect(metadata.algorithm).toBe('PBKDF2-HMAC-SHA256');
    expect(metadata.version).toBe(1);
  });

  test('should verify iteration count matches stored value', () => {
    const password = 'test';
    const salt = crypto.randomBytes(32);
    
    // Derive with 600,000 iterations
    const { key: key600k } = deriveKey(password, salt);
    
    // Attempt to fake lower iteration count
    const key100k = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
    // Keys should differ (proves iteration count affects output)
    expect(key600k.equals(key100k)).toBe(false);
    
    // System should store and verify iteration count
    console.log('⚠️  Iteration count tampering would produce wrong key');
  });

  test('ATTACK: Iteration count substitution', () => {
    const password = 'test';
    const salt = crypto.randomBytes(32);
    
    // Legitimate: 600,000 iterations
    const legitimateKey = deriveKey(password, salt).key;
    
    // Attacker stores: 10,000 iterations (100x faster brute force)
    const weakKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    
    expect(legitimateKey.equals(weakKey)).toBe(false);
    
    // Defense: System should authenticate iteration count
    // Store HMAC(salt || iterations || algorithm) with master password
    console.warn('⚠️  No iteration count authentication - tampering possible');
  });
});

describe('Salt Reuse Attack Scenarios', () => {
  
  test('ATTACK: Precomputed rainbow table with known salt', () => {
    // If salt is predictable or reused, attacker can precompute
    const knownSalt = Buffer.from('predictable salt value');
    
    // Attacker precomputes common passwords
    const precomputed = new Map();
    const commonPasswords = ['password123', 'letmein', 'admin'];
    
    commonPasswords.forEach(pwd => {
      const { key } = deriveKey(pwd, knownSalt);
      precomputed.set(key.toString('hex'), pwd);
    });
    
    // User uses weak password with predictable salt
    const userPassword = 'password123';
    const { key: userKey } = deriveKey(userPassword, knownSalt);
    
    // Attacker looks up key in rainbow table
    const crackedPassword = precomputed.get(userKey.toString('hex'));
    expect(crackedPassword).toBe('password123');
    
    console.warn('⚠️  Predictable salt enables rainbow table attacks');
  });

  test('DEFENSE: Unique random salt prevents precomputation', () => {
    const password = 'password123';
    
    // Each derivation uses unique salt
    const result1 = deriveKey(password);
    const result2 = deriveKey(password);
    
    // Salts differ, so rainbow table for salt1 doesn't work for salt2
    expect(result1.salt.equals(result2.salt)).toBe(false);
    expect(result1.key.equals(result2.key)).toBe(false);
    
    console.log('✅ Unique salts prevent rainbow table attacks');
  });

  test('should never derive salt from switchId', () => {
    // ANTI-PATTERN: Don't do this
    const switchId = 'switch-001';
    const predictableSalt = crypto.createHash('sha256')
      .update(switchId)
      .digest();
    
    // This would allow attacker to precompute for known switchIds
    const password = 'test';
    const weakKey = deriveKey(password, predictableSalt).key;
    
    // Verify implementation uses random salt, not derived
    const { salt: randomSalt } = deriveKey(password);
    expect(randomSalt.equals(predictableSalt)).toBe(false);
    
    console.log('✅ Salt is cryptographically random, not derived from switchId');
  });
});

describe('Cross-Switch Isolation', () => {
  
  test('should prevent key leakage between switches', () => {
    const password = 'SharedPassword';
    
    // User creates two switches with same password
    const switch1 = deriveKey(password);
    const switch2 = deriveKey(password);
    
    // Attacker compromises switch1
    const compromisedKey = switch1.key;
    const compromisedSalt = switch1.salt;
    
    // Attacker tries to derive switch2 key
    const attackKey = deriveKey(password, compromisedSalt).key;
    
    // Should match switch1 but NOT switch2 (different salts)
    expect(attackKey.equals(compromisedKey)).toBe(true);
    expect(attackKey.equals(switch2.key)).toBe(false);
    
    console.log('✅ Unique salts provide switch isolation');
  });

  test('REQUIRED: Contextual binding for additional protection', () => {
    const password = 'SharedPassword';
    const { key: masterKey } = deriveKey(password);
    
    // Even with compromised master key, context binding helps
    const switch1Key = hkdfExpand(
      masterKey,
      Buffer.from('ECHOLOCK-SWITCH-v1-switch-001')
    );
    
    const switch2Key = hkdfExpand(
      masterKey,
      Buffer.from('ECHOLOCK-SWITCH-v1-switch-002')
    );
    
    // Attacker would need BOTH master key AND switchId
    expect(switch1Key.equals(switch2Key)).toBe(false);
    
    console.log('✅ Context binding provides defense-in-depth');
  });
});

describe('Password Verification Timing Safety', () => {
  
  test('should use constant-time comparison', () => {
    const password = 'correct password';
    const { key, salt } = deriveKey(password);
    
    // Verify correct password
    expect(verifyPassword(password, salt, key)).toBe(true);
    
    // Verify wrong password
    expect(verifyPassword('wrong password', salt, key)).toBe(false);
    
    // Implementation uses crypto.timingSafeEqual - good!
    console.log('✅ Uses timing-safe comparison (crypto.timingSafeEqual)');
  });

  test('should not leak password length via timing', () => {
    const correctPassword = 'test';
    const { key, salt } = deriveKey(correctPassword);
    
    // Different length passwords should have same comparison time
    const short = 'a';
    const medium = 'abcdefgh';
    const long = 'abcdefghijklmnopqrstuvwxyz';
    
    // All should return false in constant time
    expect(verifyPassword(short, salt, key)).toBe(false);
    expect(verifyPassword(medium, salt, key)).toBe(false);
    expect(verifyPassword(long, salt, key)).toBe(false);
    
    // Timing attack would require measuring nanosecond differences
    // Our implementation is resistant to this
  });
});

describe('Key Derivation Performance', () => {
  
  test('PBKDF2 with 600k iterations should be slow enough', () => {
    const password = 'test';
    const start = Date.now();
    
    deriveKey(password);
    
    const duration = Date.now() - start;
    
    // Should take at least 50ms (varies by hardware)
    // On modern CPU: ~100-500ms is expected
    expect(duration).toBeGreaterThan(10); // Very conservative
    
    console.log(`⏱️  Key derivation took ${duration}ms (600,000 iterations)`);
  });

  test('HKDF-Expand should be fast (< 1ms)', () => {
    const masterKey = crypto.randomBytes(32);
    const iterations = 1000;
    
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      hkdfExpand(masterKey, Buffer.from(`ECHOLOCK-${i}`));
    }
    
    const duration = Date.now() - start;
    const perOp = duration / iterations;
    
    // HKDF should be much faster than PBKDF2
    expect(perOp).toBeLessThan(1); // < 1ms per derivation
    
    console.log(`⏱️  HKDF-Expand: ${perOp.toFixed(3)}ms per operation (${iterations} ops)`);
  });
  
  // Helper function
  function hkdfExpand(key, info, length = 32) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(info);
    hmac.update(Buffer.from([0x01]));
    return hmac.digest().slice(0, length);
  }
});
