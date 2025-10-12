'use strict';

// Property-based tests for cryptographic modules
// Uses fast-check for property-based testing (QuickCheck-style)
//
// Property-based testing verifies that certain invariants hold for
// a wide range of randomly generated inputs, catching edge cases
// that traditional unit tests might miss.

import { describe, test, expect } from '@jest/globals';
import fc from 'fast-check';
import crypto from 'crypto';
import * as encryption from '../../src/crypto/encryption.js';
import * as keyDerivation from '../../src/crypto/keyDerivation.js';
import { split, combine } from 'shamir-secret-sharing';

describe('Property-Based Tests - AES-256-GCM Encryption', () => {
  test('property: encrypt then decrypt always returns original plaintext', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1024 }), // Random plaintext
        (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const key = crypto.randomBytes(32);

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);
          const decrypted = encryption.decrypt(ciphertext, key, iv, authTag);

          expect(decrypted).toEqual(plaintext);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('property: same plaintext + different keys = different ciphertexts', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 16, maxLength: 256 }),
        (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const key1 = crypto.randomBytes(32);
          const key2 = crypto.randomBytes(32);

          // Ensure keys are different
          fc.pre(!key1.equals(key2));

          const result1 = encryption.encrypt(plaintext, key1);
          const result2 = encryption.encrypt(plaintext, key2);

          // Different keys should produce different ciphertexts
          expect(result1.ciphertext).not.toEqual(result2.ciphertext);
          expect(result1.iv).not.toEqual(result2.iv); // IVs should be random
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: encryption output length is consistent', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const key = crypto.randomBytes(32);

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

          // IV is always 12 bytes (96 bits) for GCM
          expect(iv.length).toBe(12);
          // Auth tag is always 16 bytes (128 bits) for GCM
          expect(authTag.length).toBe(16);
          // Ciphertext length equals plaintext length (GCM is stream cipher)
          expect(ciphertext.length).toBe(plaintext.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('property: tampering with ciphertext always fails decryption', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 16, maxLength: 256 }),
        fc.integer({ min: 0, max: 255 }), // Position to tamper
        fc.integer({ min: 1, max: 255 }), // XOR value (non-zero)
        (plaintextArray, tamperIndex, xorValue) => {
          const plaintext = Buffer.from(plaintextArray);
          const key = crypto.randomBytes(32);

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

          // Tamper with a random byte in ciphertext
          const tamperPosition = tamperIndex % ciphertext.length;
          const tamperedCiphertext = Buffer.from(ciphertext);
          tamperedCiphertext[tamperPosition] ^= xorValue;

          // Decryption should fail with tampered ciphertext
          expect(() => {
            encryption.decrypt(tamperedCiphertext, key, iv, authTag);
          }).toThrow('Decryption failed');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: tampering with auth tag always fails decryption', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 16, maxLength: 256 }),
        fc.integer({ min: 0, max: 15 }), // Auth tag position
        fc.integer({ min: 1, max: 255 }), // XOR value
        (plaintextArray, tamperPos, xorValue) => {
          const plaintext = Buffer.from(plaintextArray);
          const key = crypto.randomBytes(32);

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key);

          // Tamper with auth tag
          const tamperedAuthTag = Buffer.from(authTag);
          tamperedAuthTag[tamperPos] ^= xorValue;

          // Decryption should fail
          expect(() => {
            encryption.decrypt(ciphertext, key, iv, tamperedAuthTag);
          }).toThrow('Decryption failed');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: wrong key always fails decryption', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const correctKey = crypto.randomBytes(32);
          const wrongKey = crypto.randomBytes(32);

          // Ensure keys are different
          fc.pre(!correctKey.equals(wrongKey));

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, correctKey);

          expect(() => {
            encryption.decrypt(ciphertext, wrongKey, iv, authTag);
          }).toThrow('Decryption failed');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: AAD (additional authenticated data) must match', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 128 }),
        fc.uint8Array({ minLength: 1, maxLength: 64 }),
        (plaintextArray, aadArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const aad = Buffer.from(aadArray);
          const wrongAad = crypto.randomBytes(aad.length);
          const key = crypto.randomBytes(32);

          fc.pre(!aad.equals(wrongAad));

          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, key, aad);

          // Decryption with correct AAD should succeed
          const decrypted = encryption.decrypt(ciphertext, key, iv, authTag, aad);
          expect(decrypted).toEqual(plaintext);

          // Decryption with wrong AAD should fail
          expect(() => {
            encryption.decrypt(ciphertext, key, iv, authTag, wrongAad);
          }).toThrow('Decryption failed');
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property-Based Tests - PBKDF2 Key Derivation', () => {
  test('property: same password + same salt = same key', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 128 }),
        (password) => {
          const salt = crypto.randomBytes(32);

          const result1 = keyDerivation.deriveKey(password, salt);
          const result2 = keyDerivation.deriveKey(password, salt);

          expect(result1.key).toEqual(result2.key);
          expect(result1.salt).toEqual(salt);
          expect(result2.salt).toEqual(salt);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: same password + different salts = different keys', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 128 }),
        (password) => {
          const result1 = keyDerivation.deriveKey(password);
          const result2 = keyDerivation.deriveKey(password);

          // Different salts should be generated
          expect(result1.salt).not.toEqual(result2.salt);
          // Therefore, keys should be different
          expect(result1.key).not.toEqual(result2.key);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: different passwords = different keys (even with same salt)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 128 }),
        fc.string({ minLength: 8, maxLength: 128 }),
        (password1, password2) => {
          // Ensure passwords are different
          fc.pre(password1 !== password2);

          const salt = crypto.randomBytes(32);

          const result1 = keyDerivation.deriveKey(password1, salt);
          const result2 = keyDerivation.deriveKey(password2, salt);

          expect(result1.key).not.toEqual(result2.key);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: derived keys are always 32 bytes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 256 }),
        (password) => {
          const { key, salt } = keyDerivation.deriveKey(password);

          expect(key.length).toBe(32); // 256 bits
          expect(salt.length).toBe(32); // 256 bits
          expect(key).toBeInstanceOf(Buffer);
          expect(salt).toBeInstanceOf(Buffer);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: password verification is consistent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 128 }),
        fc.string({ minLength: 8, maxLength: 128 }),
        (correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);

          const { key, salt } = keyDerivation.deriveKey(correctPassword);

          // Correct password should verify
          expect(keyDerivation.verifyPassword(correctPassword, salt, key)).toBe(true);

          // Wrong password should not verify
          expect(keyDerivation.verifyPassword(wrongPassword, salt, key)).toBe(false);
        }
      ),
      { numRuns: 30 } // Reduced runs due to PBKDF2 being slow
    );
  });

  test('property: small password changes result in completely different keys', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 64 }),
        fc.integer({ min: 0, max: 25 }), // Letter to append
        (password, letterIndex) => {
          const password1 = password;
          const password2 = password + String.fromCharCode(97 + letterIndex); // a-z

          const salt = crypto.randomBytes(32);

          const key1 = keyDerivation.deriveKey(password1, salt).key;
          const key2 = keyDerivation.deriveKey(password2, salt).key;

          // Even one character difference should result in completely different key
          expect(key1).not.toEqual(key2);

          // Check Hamming distance is significant (avalanche effect)
          let differentBits = 0;
          for (let i = 0; i < key1.length; i++) {
            differentBits += (key1[i] ^ key2[i]).toString(2).split('1').length - 1;
          }

          // Expect significant difference (at least 25% of bits different)
          // This demonstrates good avalanche effect
          expect(differentBits).toBeGreaterThan(64); // 256 bits * 0.25 = 64 bits
        }
      ),
      { numRuns: 20 } // Slow due to PBKDF2
    );
  });
});

describe('Property-Based Tests - Shamir Secret Sharing', () => {
  test('property: split then combine always returns original secret', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 128 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);

          // 3-of-5 threshold
          const shares = await split(secret, 5, 3);
          const reconstructed = await combine([shares[0], shares[2], shares[4]]);

          expect(new Uint8Array(reconstructed)).toEqual(secret);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: any K shares can reconstruct secret', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 64 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);
          const totalShares = 5;
          const threshold = 3;

          const shares = await split(secret, totalShares, threshold);

          // Test all possible combinations of 3 shares
          const combinations = [
            [0, 1, 2],
            [0, 1, 3],
            [0, 2, 4],
            [1, 2, 3],
            [2, 3, 4],
          ];

          for (const indices of combinations) {
            const selectedShares = indices.map((i) => shares[i]);
            const reconstructed = await combine(selectedShares);
            expect(new Uint8Array(reconstructed)).toEqual(secret);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('property: fewer than K shares produces incorrect result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 64 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);

          const shares = await split(secret, 5, 3);
          // Use only 2 shares (need 3)
          const incorrectResult = await combine([shares[0], shares[1]]);

          // Should NOT match the original secret
          expect(new Uint8Array(incorrectResult)).not.toEqual(secret);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('property: different thresholds work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 64 }),
        fc.integer({ min: 2, max: 5 }), // threshold
        async (secretArray, threshold) => {
          const secret = Uint8Array.from(secretArray);
          const totalShares = 7;

          fc.pre(threshold <= totalShares);

          const shares = await split(secret, totalShares, threshold);
          // Take exactly threshold shares
          const selectedShares = shares.slice(0, threshold);
          const reconstructed = await combine(selectedShares);

          expect(new Uint8Array(reconstructed)).toEqual(secret);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('property: share size is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 128 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);

          const shares = await split(secret, 5, 3);

          // All shares should be Uint8Array
          shares.forEach((share) => {
            expect(share instanceof Uint8Array).toBe(true);
          });

          // All shares should have same length
          const firstShareLength = shares[0].length;
          shares.forEach((share) => {
            expect(share.length).toBe(firstShareLength);
          });

          // Share length should be greater than secret length
          // (includes metadata like share index)
          expect(shares[0].length).toBeGreaterThan(secret.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('property: shares are unique (no duplicates)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 64 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);

          const shares = await split(secret, 5, 3);

          // No two shares should be identical
          for (let i = 0; i < shares.length; i++) {
            for (let j = i + 1; j < shares.length; j++) {
              expect(new Uint8Array(shares[i])).not.toEqual(new Uint8Array(shares[j]));
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('property: extra shares beyond threshold do not affect reconstruction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 16, maxLength: 64 }),
        async (secretArray) => {
          const secret = Uint8Array.from(secretArray);

          const shares = await split(secret, 5, 3);

          // Reconstruct with minimum threshold (3)
          const result1 = await combine([shares[0], shares[1], shares[2]]);

          // Reconstruct with more than threshold (4)
          const result2 = await combine([shares[0], shares[1], shares[2], shares[3]]);

          // Reconstruct with all shares (5)
          const result3 = await combine(shares);

          // All should produce the same original secret
          expect(new Uint8Array(result1)).toEqual(secret);
          expect(new Uint8Array(result2)).toEqual(secret);
          expect(new Uint8Array(result3)).toEqual(secret);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property-Based Tests - Full Encryption + Secret Sharing Flow', () => {
  test('property: encrypt + split + combine + decrypt preserves original data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        async (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const masterKey = crypto.randomBytes(32);

          // Step 1: Encrypt plaintext
          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, masterKey);

          // Step 2: Split master key using Shamir
          const keyShares = await split(Uint8Array.from(masterKey), 5, 3);

          // Step 3: Reconstruct master key from 3 shares
          const reconstructedKeyBuffer = await combine([keyShares[0], keyShares[2], keyShares[4]]);
          const reconstructedKey = Buffer.from(reconstructedKeyBuffer);

          // Step 4: Decrypt with reconstructed key
          const decrypted = encryption.decrypt(ciphertext, reconstructedKey, iv, authTag);

          // Final result should match original plaintext
          expect(decrypted).toEqual(plaintext);
        }
      ),
      { numRuns: 30 }
    );
  });

  test('property: insufficient shares prevent decryption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 128 }),
        async (plaintextArray) => {
          const plaintext = Buffer.from(plaintextArray);
          const masterKey = crypto.randomBytes(32);

          // Encrypt
          const { ciphertext, iv, authTag } = encryption.encrypt(plaintext, masterKey);

          // Split key
          const keyShares = await split(Uint8Array.from(masterKey), 5, 3);

          // Try to reconstruct with only 2 shares (need 3)
          const wrongKeyBuffer = await combine([keyShares[0], keyShares[1]]);
          const wrongKey = Buffer.from(wrongKeyBuffer);

          // Decryption should fail with wrong key
          expect(() => {
            encryption.decrypt(ciphertext, wrongKey, iv, authTag);
          }).toThrow('Decryption failed');
        }
      ),
      { numRuns: 20 }
    );
  });
});
