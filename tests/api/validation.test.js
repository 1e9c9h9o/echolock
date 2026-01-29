/**
 * EchoLock API Validation Tests
 *
 * Tests for validation middleware functions that don't require database.
 * These run standalone without the full Express app.
 */

import {
  isValidEmail,
  isValidPassword,
  sanitizeString
} from '../../src/api/middleware/validate.js';

describe('Input Validation', () => {
  // ==========================================
  // EMAIL VALIDATION
  // ==========================================

  describe('isValidEmail', () => {
    it('should accept valid standard emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user@domain.org')).toBe(true);
      expect(isValidEmail('name@company.co.uk')).toBe(true);
    });

    it('should accept emails with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
      expect(isValidEmail('user.name.here@domain.com')).toBe(true);
    });

    it('should accept emails with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('test+filter@domain.org')).toBe(true);
    });

    it('should accept emails with numbers', () => {
      expect(isValidEmail('user123@example.com')).toBe(true);
      expect(isValidEmail('123user@domain.com')).toBe(true);
    });

    it('should reject emails without @', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('nodomain.com')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });

    it('should reject emails without TLD', () => {
      expect(isValidEmail('user@domain')).toBe(false);
    });

    it('should reject emails with invalid TLD (too short)', () => {
      expect(isValidEmail('user@domain.a')).toBe(false);
    });

    it('should reject empty and null values', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail({})).toBe(false);
      expect(isValidEmail([])).toBe(false);
    });

    it('should reject emails exceeding max length', () => {
      const longLocal = 'a'.repeat(65) + '@example.com';
      expect(isValidEmail(longLocal)).toBe(false);

      const longEmail = 'user@' + 'a'.repeat(250) + '.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.co')).toBe(true);
      expect(isValidEmail('test@sub.domain.example.com')).toBe(true);
    });
  });

  // ==========================================
  // PASSWORD VALIDATION
  // ==========================================

  describe('isValidPassword', () => {
    it('should accept valid passwords', () => {
      expect(isValidPassword('Password1').valid).toBe(true);
      expect(isValidPassword('MySecure123').valid).toBe(true);
      expect(isValidPassword('Test1234').valid).toBe(true);
    });

    it('should accept passwords with special characters', () => {
      expect(isValidPassword('Password1!').valid).toBe(true);
      expect(isValidPassword('Secure@123').valid).toBe(true);
      expect(isValidPassword('P@$$w0rd!').valid).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = isValidPassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject passwords without uppercase', () => {
      const result = isValidPassword('password123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = isValidPassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = isValidPassword('PasswordOnly');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept minimum valid password', () => {
      expect(isValidPassword('Abcdefg1').valid).toBe(true);
    });

    it('should accept long passwords', () => {
      const longPassword = 'Password1' + 'a'.repeat(100);
      expect(isValidPassword(longPassword).valid).toBe(true);
    });
  });

  // ==========================================
  // STRING SANITIZATION
  // ==========================================

  describe('sanitizeString', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('\n\ttest\n')).toBe('test');
      expect(sanitizeString('   spaced   ')).toBe('spaced');
    });

    it('should truncate strings exceeding max length', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizeString(longString, 255).length).toBe(255);
      expect(sanitizeString(longString, 100).length).toBe(100);
    });

    it('should use default max length of 255', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizeString(longString).length).toBe(255);
    });

    it('should return empty string for non-strings', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });

    it('should preserve content within limit', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
      expect(sanitizeString('test')).toBe('test');
    });

    it('should handle custom max length', () => {
      expect(sanitizeString('hello world', 5)).toBe('hello');
      expect(sanitizeString('abc', 10)).toBe('abc');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });
});

// ==========================================
// TOKEN GENERATION AND VERIFICATION
// ==========================================

describe('Authentication Tokens', () => {
  let generateAccessToken, generateRefreshToken, verifyToken;

  beforeAll(async () => {
    const auth = await import('../../src/api/middleware/auth.js');
    generateAccessToken = auth.generateAccessToken;
    generateRefreshToken = auth.generateRefreshToken;
    verifyToken = auth.verifyToken;
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT', () => {
      const user = { id: 'test-id', email: 'test@example.com' };
      const token = generateAccessToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    it('should include user info in payload', () => {
      const user = { id: 'user-123', email: 'user@test.com' };
      const token = generateAccessToken(user);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('user@test.com');
      expect(decoded.type).toBe('access');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT', () => {
      const user = { id: 'test-id', email: 'test@example.com' };
      const token = generateRefreshToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should have refresh type in payload', () => {
      const user = { id: 'user-123', email: 'user@test.com' };
      const token = generateRefreshToken(user);
      const decoded = verifyToken(token);

      expect(decoded.type).toBe('refresh');
    });

    it('should have longer expiry than access token', () => {
      const user = { id: 'test-id', email: 'test@example.com' };
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const accessDecoded = verifyToken(accessToken);
      const refreshDecoded = verifyToken(refreshToken);

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid tokens', () => {
      const user = { id: 'test-id', email: 'test@example.com' };
      const token = generateAccessToken(user);

      expect(() => verifyToken(token)).not.toThrow();
    });

    it('should reject malformed tokens', () => {
      expect(() => verifyToken('invalid.token')).toThrow();
      expect(() => verifyToken('not-a-jwt')).toThrow();
    });

    it('should reject tampered tokens', () => {
      const user = { id: 'test-id', email: 'test@example.com' };
      const token = generateAccessToken(user);
      const parts = token.split('.');
      parts[2] = 'tampered-signature';
      const tamperedToken = parts.join('.');

      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });
});

// ==========================================
// RATE LIMITING
// ==========================================

describe('Rate Limiting', () => {
  let checkRateLimit, stopRateLimitCleanup;

  beforeAll(async () => {
    const auth = await import('../../src/api/middleware/auth.js');
    checkRateLimit = auth.checkRateLimit;
    stopRateLimitCleanup = auth.stopRateLimitCleanup;
  });

  afterAll(() => {
    if (stopRateLimitCleanup) {
      stopRateLimitCleanup();
    }
  });

  describe('checkRateLimit', () => {
    it('should allow actions within limit', () => {
      const userId = `test-user-${Date.now()}-1`;
      const action = 'test_action';

      // First action should be allowed
      expect(checkRateLimit(userId, action, 5, 60000)).toBe(false);

      // More actions within limit
      expect(checkRateLimit(userId, action, 5, 60000)).toBe(false);
      expect(checkRateLimit(userId, action, 5, 60000)).toBe(false);
    });

    it('should block when limit exceeded', () => {
      const userId = `test-user-${Date.now()}-2`;
      const action = 'limited_action';

      // Exhaust limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(userId, action, 3, 60000);
      }

      // Should be blocked now
      expect(checkRateLimit(userId, action, 3, 60000)).toBe(true);
    });

    it('should track different actions separately', () => {
      const userId = `test-user-${Date.now()}-3`;

      // Exhaust limit for action1
      for (let i = 0; i < 2; i++) {
        checkRateLimit(userId, 'action1', 2, 60000);
      }

      // action1 blocked
      expect(checkRateLimit(userId, 'action1', 2, 60000)).toBe(true);

      // action2 still allowed
      expect(checkRateLimit(userId, 'action2', 2, 60000)).toBe(false);
    });

    it('should track different users separately', () => {
      const baseId = Date.now();

      // Exhaust limit for user1
      for (let i = 0; i < 2; i++) {
        checkRateLimit(`user1-${baseId}`, 'action', 2, 60000);
      }

      // user1 blocked
      expect(checkRateLimit(`user1-${baseId}`, 'action', 2, 60000)).toBe(true);

      // user2 still allowed
      expect(checkRateLimit(`user2-${baseId}`, 'action', 2, 60000)).toBe(false);
    });
  });
});

// ==========================================
// PASSWORD HASHING
// ==========================================

describe('Password Hashing', () => {
  let hashPassword, verifyPassword;

  beforeAll(async () => {
    const crypto = await import('../../src/api/utils/crypto.js');
    hashPassword = crypto.hashPassword;
    verifyPassword = crypto.verifyPassword;
  });

  describe('hashPassword', () => {
    it('should hash passwords', async () => {
      const hash = await hashPassword('TestPassword123!');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('TestPassword123!');
    });

    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword('SamePassword123!');
      const hash2 = await hashPassword('SamePassword123!');

      expect(hash1).not.toBe(hash2); // Due to salt
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('CorrectPassword123!');

      const isValid = await verifyPassword('WrongPassword123!', hash);
      expect(isValid).toBe(false);
    });

    it('should reject similar passwords', async () => {
      const hash = await hashPassword('Password123!');

      expect(await verifyPassword('Password123', hash)).toBe(false);
      expect(await verifyPassword('password123!', hash)).toBe(false);
      expect(await verifyPassword('Password124!', hash)).toBe(false);
    });
  });
});
