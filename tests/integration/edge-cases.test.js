'use strict';

// Edge case tests for ECHOLOCK
// Tests boundary conditions, extreme inputs, and Unicode handling

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Mock dependencies
jest.unstable_mockModule('../../src/bitcoin/testnetClient.js', () => ({
  getCurrentBlockHeight: jest.fn().mockResolvedValue(1000),
  createTimelockTransaction: jest.fn().mockReturnValue({
    address: 'tb1qtest',
    script: 'abcd',
    scriptAsm: 'test script'
  }),
  getTimelockStatus: jest.fn().mockResolvedValue({
    isValid: false
  })
}));

jest.unstable_mockModule('../../src/nostr/multiRelayClient.js', () => ({
  publishFragment: jest.fn().mockResolvedValue({ success: true }),
  retrieveFragments: jest.fn().mockResolvedValue([])
}));

jest.unstable_mockModule('../../src/nostr/relayHealthCheck.js', () => ({
  filterHealthyRelays: jest.fn().mockResolvedValue([
    'wss://relay1.test',
    'wss://relay2.test',
    'wss://relay3.test'
  ])
}));

const { createSwitch } = await import('../../src/core/deadManSwitch.js');

describe('ECHOLOCK Edge Cases', () => {
  const SWITCHES_FILE = path.join(projectRoot, 'data/switches.json');
  const FRAGMENTS_FILE = path.join(projectRoot, 'data/fragments.json');
  const BACKUP_SWITCHES = path.join(projectRoot, 'data/switches.json.backup');
  const BACKUP_FRAGMENTS = path.join(projectRoot, 'data/fragments.json.backup');

  beforeEach(() => {
    // Backup existing files
    if (fs.existsSync(SWITCHES_FILE)) {
      fs.copyFileSync(SWITCHES_FILE, BACKUP_SWITCHES);
    }
    if (fs.existsSync(FRAGMENTS_FILE)) {
      fs.copyFileSync(FRAGMENTS_FILE, BACKUP_FRAGMENTS);
    }

    // Clean up test files
    if (fs.existsSync(SWITCHES_FILE)) fs.unlinkSync(SWITCHES_FILE);
    if (fs.existsSync(FRAGMENTS_FILE)) fs.unlinkSync(FRAGMENTS_FILE);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore backups
    if (fs.existsSync(BACKUP_SWITCHES)) {
      fs.copyFileSync(BACKUP_SWITCHES, SWITCHES_FILE);
      fs.unlinkSync(BACKUP_SWITCHES);
    }
    if (fs.existsSync(BACKUP_FRAGMENTS)) {
      fs.copyFileSync(BACKUP_FRAGMENTS, FRAGMENTS_FILE);
      fs.unlinkSync(BACKUP_FRAGMENTS);
    }
  });

  describe('Timelock duration edge cases', () => {
    test('should handle very short timelock (1 hour)', async () => {
      const result = await createSwitch('Test message', 1, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
      expect(result.checkInHours).toBe(1);
    });

    test('should handle edge of 24 hour minimum (24 hours)', async () => {
      const result = await createSwitch('Test message', 24, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(24);
    });

    test('should handle standard timelock (72 hours)', async () => {
      const result = await createSwitch('Test message', 72, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(72);
    });

    test('should handle long timelock (1 week / 168 hours)', async () => {
      const result = await createSwitch('Test message', 168, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(168);
    });

    test('should handle very long timelock (1 month / 720 hours)', async () => {
      const result = await createSwitch('Test message', 720, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(720);
    });

    test('should handle extreme timelock (1 year / 8760 hours)', async () => {
      const result = await createSwitch('Test message', 8760, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(8760);
    }, 30000);

    test('should handle fractional hours (0.5 hours / 30 minutes)', async () => {
      const result = await createSwitch('Test message', 0.5, false);

      expect(result).toBeDefined();
    });

    test('should handle fractional hours (0.1 hours / 6 minutes)', async () => {
      const result = await createSwitch('Test message', 0.1, false);

      expect(result).toBeDefined();
    });
  });

  describe('Message size edge cases', () => {
    test('should handle empty message', async () => {
      const result = await createSwitch('', 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle single character message', async () => {
      const result = await createSwitch('A', 72, false);

      expect(result).toBeDefined();
    });

    test('should handle small message (10 bytes)', async () => {
      const message = 'A'.repeat(10);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle medium message (1 KB)', async () => {
      const message = 'A'.repeat(1024);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle large message (10 KB)', async () => {
      const message = 'A'.repeat(10 * 1024);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    }, 15000);

    test('should handle large message (100 KB)', async () => {
      const message = 'A'.repeat(100 * 1024);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    }, 30000);

    test('should handle very large message (1 MB)', async () => {
      const message = 'A'.repeat(1024 * 1024);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    }, 60000);
  });

  describe('Unicode and special character handling', () => {
    test('should handle emoji in message', async () => {
      const message = '🔐 Secret 🔑 Password 🚀';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle complex emoji (skin tones, compound emoji)', async () => {
      const message = '👨‍👩‍👧‍👦 👍🏽 🏴‍☠️';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Chinese characters', async () => {
      const message = '这是一个秘密消息。密钥保护。';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Japanese characters (Hiragana, Katakana, Kanji)', async () => {
      const message = 'これは秘密のメッセージです。パスワード：鍵';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Arabic characters (RTL)', async () => {
      const message = 'هذه رسالة سرية. كلمة المرور: مفتاح';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Hebrew characters (RTL)', async () => {
      const message = 'זו הודעה סודית. סיסמה: מפתח';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Cyrillic characters', async () => {
      const message = 'Это секретное сообщение. Пароль: ключ';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Greek characters', async () => {
      const message = 'Αυτό είναι ένα μυστικό μήνυμα. Κωδικός: κλειδί';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Devanagari script (Hindi)', async () => {
      const message = 'यह एक गुप्त संदेश है। पासवर्ड: चाबी';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle Thai characters', async () => {
      const message = 'นี่คือข้อความลับ รหัสผ่าน: กุญแจ';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle mixed scripts (Latin + Chinese + Arabic + Emoji)', async () => {
      const message = 'Secret 秘密 السر 🔐';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle newlines and tabs', async () => {
      const message = 'Line 1\nLine 2\n\tTabbed line\nLast line';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle special whitespace characters', async () => {
      const message = 'Normal space\u00A0non-breaking\u2000en-quad\u200Bzero-width';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle control characters', async () => {
      const message = 'Test\x00null\x01SOH\x02STX\x03ETX';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle JSON-like content', async () => {
      const message = '{"key": "value", "nested": {"secret": "password"}}';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle XML-like content', async () => {
      const message = '<secret><key>value</key><password>test</password></secret>';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle SQL injection patterns (as data, not code)', async () => {
      const message = "'; DROP TABLE users; --";
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle path traversal patterns (as data, not code)', async () => {
      const message = '../../etc/passwd';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle shell command patterns (as data, not code)', async () => {
      const message = '$(rm -rf /) && echo "test"';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    });

    test('should handle very long single line (10000 chars)', async () => {
      const message = 'A'.repeat(10000);
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    }, 15000);

    test('should handle many short lines (1000 lines)', async () => {
      const message = Array(1000).fill('Line').join('\n');
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
    }, 15000);
  });

  describe('Block height vs timestamp timelocks', () => {
    test('should handle small block height (1 block)', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockResolvedValue(100);

      const result = await createSwitch('Test', 0.1, true, 'password123');

      expect(result).toBeDefined();
    });

    test('should handle medium block height (100 blocks)', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockResolvedValue(1000);

      const result = await createSwitch('Test', 16.67, true, 'password123');

      expect(result).toBeDefined();
    });

    test('should handle large block height (10000 blocks)', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockResolvedValue(1000);

      const result = await createSwitch('Test', 1666.67, true, 'password123');

      expect(result).toBeDefined();
    }, 15000);

    test('should handle boundary between block height and timestamp (499999999)', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockResolvedValue(100);

      // This would create a very large block height
      const result = await createSwitch('Test', 83333332, true, 'password123');

      expect(result).toBeDefined();
    }, 30000);

    test('should handle timestamp-based timelock (beyond 500000000)', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockResolvedValue(1000);

      // Very long timelock (years in future) should use timestamp
      const result = await createSwitch('Test', 365 * 24, true, 'password123');

      expect(result).toBeDefined();
    }, 15000);
  });

  describe('Concurrent operations', () => {
    test('should handle 5 concurrent switch creations', async () => {
      const promises = Array(5).fill(null).map((_, i) =>
        createSwitch(`Message ${i}`, 72, false)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      const ids = results.map(r => r.switchId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    test('should handle 10 concurrent switch creations', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        createSwitch(`Message ${i}`, 72, false)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      const ids = results.map(r => r.switchId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    }, 15000);

    test('should handle concurrent switches with different durations', async () => {
      const durations = [1, 24, 72, 168, 720];
      const promises = durations.map(hours =>
        createSwitch(`Message ${hours}h`, hours, false)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.checkInHours).toBe(durations[i]);
      });
    });

    test('should handle concurrent switches with different message sizes', async () => {
      const sizes = [10, 100, 1000, 10000];
      const promises = sizes.map(size =>
        createSwitch('A'.repeat(size), 72, false)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
    }, 15000);
  });

  describe('Password edge cases', () => {
    test('should handle very short password (1 char)', async () => {
      const result = await createSwitch('Test', 72, true, 'A');

      expect(result).toBeDefined();
    });

    test('should handle long password (100 chars)', async () => {
      const password = 'A'.repeat(100);
      const result = await createSwitch('Test', 72, true, password);

      expect(result).toBeDefined();
    });

    test('should handle password with special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const result = await createSwitch('Test', 72, true, password);

      expect(result).toBeDefined();
    });

    test('should handle password with Unicode', async () => {
      const password = '密码🔑пароль';
      const result = await createSwitch('Test', 72, true, password);

      expect(result).toBeDefined();
    });

    test('should handle password with whitespace', async () => {
      const password = '  spaced  password  ';
      const result = await createSwitch('Test', 72, true, password);

      expect(result).toBeDefined();
    });

    test('should handle password with newlines', async () => {
      const password = 'line1\nline2\nline3';
      const result = await createSwitch('Test', 72, true, password);

      expect(result).toBeDefined();
    });
  });
});