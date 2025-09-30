'use strict';

// Property-based tests for Bitcoin timelock script generation
import * as fc from 'fast-check';
import { estimateUnlockTime, validateTimelock } from '../../src/bitcoin/timelockScript.js';
import { createTimelockScript, createTimelockAddress } from '../../src/bitcoin/testnetClient.js';
import * as bitcoin from 'bitcoinjs-lib';
import { CURRENT_NETWORK } from '../../src/bitcoin/constants.js';

describe('Bitcoin Timelock Script - Property-Based Tests', () => {
  describe('estimateUnlockTime properties', () => {
    test('earliest <= expected <= latest for all locktimes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: Math.floor(Date.now() / 1000), max: 0x7FFFFFFF }),
          (locktime) => {
            const result = estimateUnlockTime(locktime);
            return (
              result.earliest <= result.expected &&
              result.expected <= result.latest
            );
          }
        )
      );
    });

    test('MTP window is exactly 2 hours (7200 seconds)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: Math.floor(Date.now() / 1000), max: 0x7FFFFFFF }),
          (locktime) => {
            const result = estimateUnlockTime(locktime);
            const window = result.latest - result.earliest;
            return window === 2 * 60 * 60 * 1000;
          }
        )
      );
    });

    test('earliest is always equal to locktime', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: Math.floor(Date.now() / 1000), max: 0x7FFFFFFF }),
          (locktime) => {
            const result = estimateUnlockTime(locktime);
            return result.earliest === locktime;
          }
        )
      );
    });

    test('expected is always midpoint between earliest and latest', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: Math.floor(Date.now() / 1000), max: 0x7FFFFFFF }),
          (locktime) => {
            const result = estimateUnlockTime(locktime);
            const midpoint = (result.earliest + result.latest) / 2;
            return Math.abs(result.expected - midpoint) < 1;
          }
        )
      );
    });
  });

  describe('validateTimelock properties', () => {
    test('should reject past timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Math.floor(Date.now() / 1000) - 1 }),
          (locktime) => {
            expect(() => validateTimelock(locktime)).toThrow('Timelock must be in the future');
          }
        )
      );
    });

    test('should reject timestamps less than 24 hours in future', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayFromNow = now + (24 * 60 * 60);

      fc.assert(
        fc.property(
          fc.integer({ min: now + 1, max: oneDayFromNow - 1 }),
          (locktime) => {
            expect(() => validateTimelock(locktime)).toThrow('Timelock must be at least 24 hours in the future');
          }
        )
      );
    });

    test('should accept timestamps at least 24 hours in future', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayFromNow = now + (24 * 60 * 60);

      fc.assert(
        fc.property(
          fc.integer({ min: oneDayFromNow, max: 0x7FFFFFFF }),
          (locktime) => {
            expect(() => validateTimelock(locktime)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject timestamps beyond year 2106', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0x7FFFFFFF + 1, max: 0xFFFFFFFF }),
          (locktime) => {
            expect(() => validateTimelock(locktime)).toThrow('Timelock exceeds Bitcoin timestamp limit');
          }
        )
      );
    });
  });

  describe('createTimelockScript properties', () => {
    test('should create valid Buffer for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(
            Buffer.alloc(33, 0x02), // Compressed pubkey starting with 02
            Buffer.alloc(33, 0x03)  // Compressed pubkey starting with 03
          ),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            return Buffer.isBuffer(script) && script.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create deterministic scripts (same inputs -> same output)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02), Buffer.alloc(33, 0x03)),
          (locktime, publicKey) => {
            const script1 = createTimelockScript(locktime, publicKey);
            const script2 = createTimelockScript(locktime, publicKey);
            return script1.toString('hex') === script2.toString('hex');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create different scripts for different locktimes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFE }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script1 = createTimelockScript(locktime, publicKey);
            const script2 = createTimelockScript(locktime + 1, publicKey);
            return script1.toString('hex') !== script2.toString('hex');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create different scripts for different public keys', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          (locktime) => {
            const pubKey1 = Buffer.alloc(33, 0x02);
            const pubKey2 = Buffer.alloc(33, 0x03);
            const script1 = createTimelockScript(locktime, pubKey1);
            const script2 = createTimelockScript(locktime, pubKey2);
            return script1.toString('hex') !== script2.toString('hex');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include locktime value in script', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            // First element should be the locktime
            const scriptLocktime = bitcoin.script.number.decode(decompiled[0]);
            return scriptLocktime === locktime;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include OP_CHECKLOCKTIMEVERIFY in script', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            return decompiled.includes(bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should include OP_CHECKSIG in script', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            return decompiled.includes(bitcoin.opcodes.OP_CHECKSIG);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should have correct script structure (5 elements)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            // <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
            return decompiled.length === 5;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('createTimelockAddress properties', () => {
    test('should create valid testnet address for all valid scripts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const address = createTimelockAddress(script);

            // Should be valid testnet address
            try {
              bitcoin.address.toOutputScript(address, CURRENT_NETWORK);
              return true;
            } catch {
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create deterministic addresses (same script -> same address)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const address1 = createTimelockAddress(script);
            const address2 = createTimelockAddress(script);
            return address1 === address2;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create different addresses for different scripts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFE }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script1 = createTimelockScript(locktime, publicKey);
            const script2 = createTimelockScript(locktime + 1, publicKey);
            const address1 = createTimelockAddress(script1);
            const address2 = createTimelockAddress(script2);
            return address1 !== address2;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should create P2SH testnet addresses (starting with 2 or tb1)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 0x7FFFFFFF }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const address = createTimelockAddress(script);
            return address.startsWith('2') || address.startsWith('tb1');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Script validation properties', () => {
    test('should handle very short locktimes (1-100 blocks)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            const scriptLocktime = bitcoin.script.number.decode(decompiled[0]);
            return scriptLocktime === locktime;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle very long timestamp locktimes (years in future)', () => {
      const yearInSeconds = 365 * 24 * 60 * 60;
      const now = Math.floor(Date.now() / 1000);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // 1-50 years
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (years, publicKey) => {
            const locktime = Math.min(now + (years * yearInSeconds), 0x7FFFFFFF);
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            const scriptLocktime = bitcoin.script.number.decode(decompiled[0]);
            return scriptLocktime === locktime;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle boundary between block height and timestamp (500000000)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(499999999, 500000000, 500000001),
          fc.constantFrom(Buffer.alloc(33, 0x02)),
          (locktime, publicKey) => {
            const script = createTimelockScript(locktime, publicKey);
            const decompiled = bitcoin.script.decompile(script);
            const scriptLocktime = bitcoin.script.number.decode(decompiled[0]);
            return scriptLocktime === locktime;
          }
        )
      );
    });
  });
});