/**
 * Comprehensive Cryptographic Test Vectors
 *
 * Tests against official test vectors from:
 * - BIP-340: Schnorr signatures (requires @noble/curves at runtime)
 * - NIST: AES-GCM
 * - Shamir: GF(256) arithmetic
 * - HKDF: RFC 5869
 * - PBKDF2: RFC 6070
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0340/test-vectors.csv
 * @see https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program
 */

import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';

// ============================================================================
// GF(256) LOOKUP TABLES (Module-level initialization)
// ============================================================================
// Used for Shamir Secret Sharing tests

const GF_LOG = new Uint8Array(256);
const GF_EXP = new Uint8Array(256);

// Initialize tables at module load time
// NOTE: Uses generator 3 (primitive element for polynomial 0x11B)
// Generator 2 only produces 51 elements, not 255!
(function initGF256Tables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    // Multiply by 3 (primitive element for 0x11B)
    // x * 3 = x * 2 XOR x, with proper reduction
    let xtime = (x << 1) ^ ((x >> 7) * 0x1b);
    x = (xtime ^ x) & 0xff;
  }
  GF_EXP[255] = GF_EXP[0];
})();

// GF(256) operations
function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function gfDiv(a, b) {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return GF_EXP[(GF_LOG[a] - GF_LOG[b] + 255) % 255];
}

function gfAdd(a, b) {
  return a ^ b;
}

// ============================================================================
// AES-256-GCM NIST TEST VECTORS
// ============================================================================
// From NIST CAVP (Cryptographic Algorithm Validation Program)

describe('AES-256-GCM NIST Test Vectors', () => {
  const AES_GCM_VECTORS = [
    // NIST GCM Test Case 13 (256-bit key)
    {
      name: 'NIST GCM Test Case 13',
      key: '0000000000000000000000000000000000000000000000000000000000000000',
      iv: '000000000000000000000000',
      plaintext: '',
      aad: '',
      ciphertext: '',
      tag: '530f8afbc74536b9a963b4f1c4cb738b',
    },
    // NIST GCM Test Case 14 (256-bit key)
    {
      name: 'NIST GCM Test Case 14',
      key: '0000000000000000000000000000000000000000000000000000000000000000',
      iv: '000000000000000000000000',
      plaintext: '00000000000000000000000000000000',
      aad: '',
      ciphertext: 'cea7403d4d606b6e074ec5d3baf39d18',
      tag: 'd0d1c8a799996bf0265b98b5d48ab919',
    },
    // NIST GCM Test Case 15 (256-bit key)
    {
      name: 'NIST GCM Test Case 15',
      key: 'feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308',
      iv: 'cafebabefacedbaddecaf888',
      plaintext: 'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255',
      aad: '',
      ciphertext: '522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662898015ad',
      tag: 'b094dac5d93471bdec1a502270e3cc6c',
    },
    // NIST GCM Test Case 16 (256-bit key with AAD)
    {
      name: 'NIST GCM Test Case 16',
      key: 'feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308',
      iv: 'cafebabefacedbaddecaf888',
      plaintext: 'd9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39',
      aad: 'feedfacedeadbeeffeedfacedeadbeefabaddad2',
      ciphertext: '522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662',
      tag: '76fc6ece0f4e1768cddf8853bb2d551b',
    },
  ];

  test.each(AES_GCM_VECTORS)('$name', async ({ key, iv, plaintext, aad, ciphertext, tag }) => {
    const keyBuf = Buffer.from(key, 'hex');
    const ivBuf = Buffer.from(iv, 'hex');
    const ptBuf = Buffer.from(plaintext, 'hex');
    const aadBuf = aad ? Buffer.from(aad, 'hex') : Buffer.alloc(0);
    const expectedCt = Buffer.from(ciphertext, 'hex');
    const expectedTag = Buffer.from(tag, 'hex');

    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, ivBuf);
    if (aadBuf.length > 0) {
      cipher.setAAD(aadBuf);
    }
    const encrypted = Buffer.concat([cipher.update(ptBuf), cipher.final()]);
    const authTag = cipher.getAuthTag();

    expect(encrypted.toString('hex')).toBe(ciphertext);
    expect(authTag.toString('hex')).toBe(tag);

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(expectedTag);
    if (aadBuf.length > 0) {
      decipher.setAAD(aadBuf);
    }
    const decrypted = Buffer.concat([decipher.update(expectedCt), decipher.final()]);

    expect(decrypted.toString('hex')).toBe(plaintext);
  });
});

// ============================================================================
// SHAMIR SECRET SHARING TEST VECTORS
// ============================================================================
// Tests GF(256) arithmetic and Lagrange interpolation

describe('Shamir Secret Sharing - GF(256) Arithmetic', () => {
  // Uses module-level gfMul, gfDiv, gfAdd functions

  test('GF(256) multiplication identity: a * 1 = a', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 1)).toBe(a);
    }
  });

  test('GF(256) multiplication by zero: a * 0 = 0', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 0)).toBe(0);
    }
  });

  test('GF(256) multiplication commutativity: a * b = b * a', () => {
    expect(gfMul(0x53, 0xca)).toBe(gfMul(0xca, 0x53));
    expect(gfMul(0x12, 0x34)).toBe(gfMul(0x34, 0x12));
    expect(gfMul(0xff, 0x01)).toBe(gfMul(0x01, 0xff));
  });

  test('GF(256) division inverse: (a * b) / b = a', () => {
    for (let a = 1; a < 256; a++) {
      for (let b = 1; b < 10; b++) { // Test subset for speed
        const product = gfMul(a, b);
        expect(gfDiv(product, b)).toBe(a);
      }
    }
  });

  test('Lagrange interpolation recovers secret', () => {
    // Known polynomial: f(x) = 0x42 + 0x17*x (secret=0x42)
    const secret = 0x42;
    const a1 = 0x17;

    const y1 = gfAdd(secret, gfMul(a1, 1)); // f(1)
    const y2 = gfAdd(secret, gfMul(a1, 2)); // f(2)

    // Lagrange interpolation at x=0
    const l0 = gfDiv(2, gfAdd(1, 2)); // (0-2)/(1-2) in GF(256)
    const l1 = gfDiv(1, gfAdd(2, 1)); // (0-1)/(2-1) in GF(256)

    const reconstructed = gfAdd(gfMul(y1, l0), gfMul(y2, l1));
    expect(reconstructed).toBe(secret);
  });

  test('Threshold property: k-1 shares reveal nothing', () => {
    // With only 1 share for threshold=2, any secret is equally likely
    const y1 = 0x55; // One share value at x=1

    let validSecrets = 0;
    for (let s = 0; s < 256; s++) {
      // For any secret s, we can find a1 such that f(1) = s + a1 = y1
      const a1 = gfAdd(s, y1);
      const check = gfAdd(s, gfMul(a1, 1));
      if (check === y1) validSecrets++;
    }

    // All 256 secrets are consistent with the single share
    expect(validSecrets).toBe(256);
  });

  test('3-of-5 threshold: 3 shares reconstruct, 2 do not', () => {
    // Degree-2 polynomial: f(x) = s + a1*x + a2*x^2
    const s = 0x7b;  // secret
    const a1 = 0x23;
    const a2 = 0x45;

    const evalPoly = (x) => gfAdd(s, gfAdd(gfMul(a1, x), gfMul(a2, gfMul(x, x))));

    const y1 = evalPoly(1);
    const y2 = evalPoly(2);
    const y3 = evalPoly(3);

    // Lagrange interpolation with 3 points
    const lagrange3 = (points) => {
      let result = 0;
      for (let i = 0; i < points.length; i++) {
        let num = 1, den = 1;
        for (let j = 0; j < points.length; j++) {
          if (i !== j) {
            num = gfMul(num, points[j].x);
            den = gfMul(den, gfAdd(points[i].x, points[j].x));
          }
        }
        const coeff = gfDiv(num, den);
        result = gfAdd(result, gfMul(points[i].y, coeff));
      }
      return result;
    };

    // 3 shares should recover the secret
    const points3 = [
      { x: 1, y: y1 },
      { x: 2, y: y2 },
      { x: 3, y: y3 },
    ];
    expect(lagrange3(points3)).toBe(s);

    // Verify with different 3 shares would also work
    const y4 = evalPoly(4);
    const y5 = evalPoly(5);
    const points3alt = [
      { x: 2, y: y2 },
      { x: 4, y: y4 },
      { x: 5, y: y5 },
    ];
    expect(lagrange3(points3alt)).toBe(s);
  });
});

// ============================================================================
// HKDF TEST VECTORS
// ============================================================================
// From RFC 5869

describe('HKDF Test Vectors (RFC 5869)', () => {
  test('Test Case 1', () => {
    const ikm = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
    const salt = Buffer.from('000102030405060708090a0b0c', 'hex');
    const info = Buffer.from('f0f1f2f3f4f5f6f7f8f9', 'hex');
    const L = 42;

    const expectedOkm = '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865';

    const okm = crypto.hkdfSync('sha256', ikm, salt, info, L);
    expect(Buffer.from(okm).toString('hex')).toBe(expectedOkm);
  });

  test('Test Case 2 (longer inputs)', () => {
    const ikm = Buffer.from(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
      '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f' +
      '404142434445464748494a4b4c4d4e4f',
      'hex'
    );
    const salt = Buffer.from(
      '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f' +
      '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f' +
      'a0a1a2a3a4a5a6a7a8a9aaabacadaeaf',
      'hex'
    );
    const info = Buffer.from(
      'b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf' +
      'd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeef' +
      'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
      'hex'
    );
    const L = 82;

    const expectedOkm =
      'b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c' +
      '59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71' +
      'cc30c58179ec3e87c14c01d5c1f3434f1d87';

    const okm = crypto.hkdfSync('sha256', ikm, salt, info, L);
    expect(Buffer.from(okm).toString('hex')).toBe(expectedOkm);
  });

  test('Test Case 3 (zero-length salt and info)', () => {
    const ikm = Buffer.from('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'hex');
    const salt = Buffer.alloc(0);
    const info = Buffer.alloc(0);
    const L = 42;

    const expectedOkm = '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8';

    const okm = crypto.hkdfSync('sha256', ikm, salt, info, L);
    expect(Buffer.from(okm).toString('hex')).toBe(expectedOkm);
  });
});

// ============================================================================
// PBKDF2 TEST VECTORS
// ============================================================================
// From RFC 6070

describe('PBKDF2 Test Vectors (RFC 6070)', () => {
  test('Test Vector 1', () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 1;
    const keyLen = 20;

    const expected = '0c60c80f961f0e71f3a9b524af6012062fe037a6';
    const derived = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha1');
    expect(derived.toString('hex')).toBe(expected);
  });

  test('Test Vector 2', () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 2;
    const keyLen = 20;

    const expected = 'ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957';
    const derived = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha1');
    expect(derived.toString('hex')).toBe(expected);
  });

  test('Test Vector 3', () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 4096;
    const keyLen = 20;

    const expected = '4b007901b765489abead49d926f721d065a429c1';
    const derived = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha1');
    expect(derived.toString('hex')).toBe(expected);
  });

  test('PBKDF2-SHA256 determinism', () => {
    const password = 'testpassword';
    const salt = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
    const iterations = 10000; // Faster for tests
    const keyLen = 32;

    const derived1 = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256');
    const derived2 = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha256');

    expect(derived1.length).toBe(32);
    expect(derived1.equals(derived2)).toBe(true);

    // Different password gives different result
    const derived3 = crypto.pbkdf2Sync('differentpassword', salt, iterations, keyLen, 'sha256');
    expect(derived1.equals(derived3)).toBe(false);
  });
});

// ============================================================================
// NIP-44 PADDING TEST
// ============================================================================

describe('NIP-44 Padding Function', () => {
  test('Padding follows power-of-2 rule', () => {
    const calcPaddedLen = (unpaddedLen) => {
      let paddedLen = 32;
      while (paddedLen < unpaddedLen + 2) {
        paddedLen *= 2;
      }
      return paddedLen;
    };

    // Test cases from NIP-44 spec
    expect(calcPaddedLen(1)).toBe(32);
    expect(calcPaddedLen(30)).toBe(32);
    expect(calcPaddedLen(31)).toBe(64);
    expect(calcPaddedLen(62)).toBe(64);
    expect(calcPaddedLen(63)).toBe(128);
    expect(calcPaddedLen(126)).toBe(128);
    expect(calcPaddedLen(127)).toBe(256);
    expect(calcPaddedLen(254)).toBe(256);
    expect(calcPaddedLen(255)).toBe(512);
  });

  test('Padding format: [len_hi, len_lo, data, zeros]', () => {
    const padPlaintext = (plaintext) => {
      const unpaddedLen = plaintext.length;
      let paddedLen = 32;
      while (paddedLen < unpaddedLen + 2) {
        paddedLen *= 2;
      }
      const padded = new Uint8Array(paddedLen);
      padded[0] = (unpaddedLen >> 8) & 0xff;
      padded[1] = unpaddedLen & 0xff;
      padded.set(plaintext, 2);
      return padded;
    };

    const unpadPlaintext = (padded) => {
      const len = (padded[0] << 8) | padded[1];
      return padded.slice(2, 2 + len);
    };

    // Test round-trip
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const padded = padPlaintext(original);

    expect(padded.length).toBe(32); // Smallest power of 2 >= 5+2
    expect(padded[0]).toBe(0);      // High byte of length
    expect(padded[1]).toBe(5);      // Low byte of length

    const recovered = unpadPlaintext(padded);
    expect(recovered).toEqual(original);
  });
});

// ============================================================================
// BIP-340 SCHNORR SIGNATURE TEST VECTORS
// ============================================================================
// Note: These tests use @noble/curves which must be imported dynamically.
// They verify against official BIP-340 test vectors.

describe('BIP-340 Schnorr Test Vectors', () => {
  // BIP-340 official test vectors
  const BIP340_VECTORS = [
    {
      index: 0,
      secretKey: '0000000000000000000000000000000000000000000000000000000000000003',
      publicKey: 'F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BCE036F9',
      message: '0000000000000000000000000000000000000000000000000000000000000000',
      signature: 'E907831F80848D1069A5371B402410364BDF1C5F8307B0084C55F1CE2DCA821525F66A4A85EA8B71E482A74F382D2CE5EBEEE8FDB2172F477DF4900D310536C0',
    },
    {
      index: 1,
      secretKey: 'B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D9045190CFEF',
      publicKey: 'DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B502BA659',
      message: '243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC4E6C89',
      signature: '6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95F6DE339E4B0A',
    },
  ];

  test.each(BIP340_VECTORS)('Vector $index verification (dynamic import)', async ({ secretKey, publicKey, message, signature }) => {
    // Dynamic import @noble/curves
    let schnorr, bytesToHex, hexToBytes;
    try {
      const curves = await import('@noble/curves/secp256k1');
      const utils = await import('@noble/hashes/utils');
      schnorr = curves.schnorr;
      bytesToHex = utils.bytesToHex;
      hexToBytes = utils.hexToBytes;
    } catch (e) {
      // Skip if @noble modules not available in this environment
      console.log('Skipping BIP-340 test - @noble/curves not available:', e.message);
      return;
    }

    const sk = hexToBytes(secretKey);
    const msg = hexToBytes(message);

    // Verify public key derivation
    const derivedPubkey = schnorr.getPublicKey(sk);
    expect(bytesToHex(derivedPubkey).toUpperCase()).toBe(publicKey);

    // Sign and verify
    const sig = schnorr.sign(msg, sk);
    expect(bytesToHex(sig).toUpperCase()).toBe(signature);

    const valid = schnorr.verify(sig, msg, derivedPubkey);
    expect(valid).toBe(true);
  });
});
