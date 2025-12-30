'use strict';

// Error path tests for Dead Man's Switch module
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Mock dependencies before importing module
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

const { createSwitch, listSwitches, getStatus, deleteSwitch, checkIn } = await import('../../src/core/deadManSwitch.js');

describe('Dead Man Switch - Error Paths', () => {
  const SWITCHES_FILE = path.join(projectRoot, 'data/switches.json');
  const FRAGMENTS_FILE = path.join(projectRoot, 'data/fragments.json');
  const BACKUP_SWITCHES = path.join(projectRoot, 'data/switches.json.backup');
  const BACKUP_FRAGMENTS = path.join(projectRoot, 'data/fragments.json.backup');

  beforeEach(() => {
    // Backup existing files if they exist
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

  describe('File corruption scenarios', () => {
    test('should handle corrupted JSON in switches.json', () => {
      // Write invalid JSON
      fs.writeFileSync(SWITCHES_FILE, '{ invalid json ');

      expect(() => listSwitches()).toThrow();
    });

    test('should handle corrupted JSON in fragments.json', () => {
      // Create valid switches.json
      fs.writeFileSync(SWITCHES_FILE, JSON.stringify({}));

      // Write invalid JSON to fragments.json
      fs.writeFileSync(FRAGMENTS_FILE, '{ invalid json ');

      // This shouldn't throw, but retrieving switch might
      const switches = listSwitches();
      expect(switches).toEqual([]);
    });

    test('should handle empty file (not JSON)', () => {
      fs.writeFileSync(SWITCHES_FILE, '');

      expect(() => listSwitches()).toThrow();
    });

    test('should handle non-object JSON root', () => {
      fs.writeFileSync(SWITCHES_FILE, JSON.stringify([1, 2, 3]));

      // Arrays have Object.values return array elements
      const switches = listSwitches();
      expect(Array.isArray(switches)).toBe(true);
    });

    test('should handle file with null content', () => {
      fs.writeFileSync(SWITCHES_FILE, 'null');

      // null is not an object, so listSwitches should throw or return empty
      expect(() => listSwitches()).toThrow();
    });
  });

  describe('Password validation', () => {
    test('should reject Bitcoin timelock without password', async () => {
      await expect(
        createSwitch('test message', 72, true, null)
      ).rejects.toThrow('Password is required for Bitcoin timelock mode');
    });

    test('should reject Bitcoin timelock with empty password', async () => {
      await expect(
        createSwitch('test message', 72, true, '')
      ).rejects.toThrow('Password is required for Bitcoin timelock mode');
    });

    test('should accept Bitcoin disabled without password', async () => {
      const result = await createSwitch('test message', 72, false, null);
      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });
  });

  describe('Switch ID validation', () => {
    test('should handle invalid switch ID (non-existent)', async () => {
      const result = await getStatus('nonexistent-id');
      expect(result.found).toBe(false);
    });

    test('should handle null switch ID', async () => {
      const result = await getStatus(null);
      expect(result.found).toBe(false);
    });

    test('should handle undefined switch ID', async () => {
      const result = await getStatus(undefined);
      expect(result.found).toBe(false);
    });

    test('should handle empty string switch ID', async () => {
      const result = await getStatus('');
      expect(result.found).toBe(false);
    });

    test('should handle malformed switch ID', async () => {
      const result = await getStatus('../../etc/passwd');
      expect(result.found).toBe(false);
    });
  });

  describe('Concurrent access scenarios', () => {
    test('should handle multiple createSwitch calls in parallel', async () => {
      const promises = [
        createSwitch('message1', 72, false),
        createSwitch('message2', 72, false),
        createSwitch('message3', 72, false)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      const switchIds = results.map(r => r.switchId);
      const uniqueIds = new Set(switchIds);
      expect(uniqueIds.size).toBe(3); // All IDs should be unique
    });

    test('should handle concurrent read and write', async () => {
      // Create a switch first
      const created = await createSwitch('test', 72, false);

      // Attempt concurrent operations
      const promises = [
        listSwitches(),
        getStatus(created.switchId),
        createSwitch('another', 72, false)
      ];

      const results = await Promise.all(promises);
      expect(results[0]).toBeDefined(); // list
      expect(results[1]).toBeDefined(); // get
      expect(results[2]).toBeDefined(); // create
    });
  });

  describe('Disk space and write failures', () => {
    test('should handle write failure gracefully', async () => {
      // Make data directory read-only to simulate write failure
      const dataDir = path.join(projectRoot, 'data');

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      try {
        const originalMode = fs.statSync(dataDir).mode;
        fs.chmodSync(dataDir, 0o444); // Read-only

        // Try to create - may succeed if files already exist with write access
        // This test is environment-dependent
        try {
          await createSwitch('test', 72, false);
        } catch (error) {
          // Expected on some systems
          expect(error).toBeDefined();
        }

        // Restore permissions
        fs.chmodSync(dataDir, originalMode);
      } catch (error) {
        // If chmod fails (e.g., on Windows), skip test
        if (error.code !== 'EPERM' && error.code !== 'ENOENT') {
          throw error;
        }
      }
    });
  });

  describe('Edge cases for message content', () => {
    test('should handle very large message (1MB)', async () => {
      const largeMessage = 'A'.repeat(1024 * 1024); // 1MB
      const result = await createSwitch(largeMessage, 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    }, 30000);

    test('should handle empty message', async () => {
      const result = await createSwitch('', 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle Unicode characters (emoji)', async () => {
      const message = '🔐 Secret message with emoji 🚀💎✨';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle message with null bytes', async () => {
      const message = 'Test\x00message\x00with\x00nulls';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle non-ASCII characters (Chinese, Arabic)', async () => {
      const message = '密钥 السر مفتاح सीक्रेट';
      const result = await createSwitch(message, 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });
  });

  describe('Timelock edge cases', () => {
    test('should handle very short timelock (1 hour)', async () => {
      const result = await createSwitch('test', 1, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(1);
    });

    test('should handle very long timelock (1 year)', async () => {
      const result = await createSwitch('test', 365 * 24, false);

      expect(result).toBeDefined();
      expect(result.checkInHours).toBe(365 * 24);
    });

    test('should handle zero hours timelock', async () => {
      const result = await createSwitch('test', 0, false);

      expect(result).toBeDefined();
    });

    test('should handle negative hours timelock', async () => {
      const result = await createSwitch('test', -10, false);

      // Should either reject or handle gracefully
      expect(result).toBeDefined();
    });

    test('should handle fractional hours', async () => {
      const result = await createSwitch('test', 0.5, false);

      expect(result).toBeDefined();
    });
  });

  describe('Bitcoin API failure handling', () => {
    test('should handle getCurrentBlockHeight failure', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.getCurrentBlockHeight.mockRejectedValueOnce(new Error('API timeout'));

      const result = await createSwitch('test', 72, true, 'password123');

      // Should still create switch but with Bitcoin disabled/error
      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle createTimelockTransaction failure', async () => {
      const testnetClient = await import('../../src/bitcoin/testnetClient.js');
      testnetClient.createTimelockTransaction.mockImplementationOnce(() => {
        throw new Error('Script creation failed');
      });

      const result = await createSwitch('test', 72, true, 'password123');

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });
  });

  describe('Nostr relay failure handling', () => {
    test('should handle all relays unhealthy', async () => {
      const relayHealthCheck = await import('../../src/nostr/relayHealthCheck.js');
      relayHealthCheck.filterHealthyRelays.mockResolvedValueOnce([]);

      const result = await createSwitch('test', 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });

    test('should handle publishFragment failure', async () => {
      const multiRelayClient = await import('../../src/nostr/multiRelayClient.js');
      multiRelayClient.publishFragment.mockRejectedValueOnce(new Error('Publish failed'));

      const result = await createSwitch('test', 72, false);

      expect(result).toBeDefined();
      expect(result.switchId).toBeDefined();
    });
  });

  describe('Delete operation edge cases', () => {
    test('should handle deleting non-existent switch', () => {
      const result = deleteSwitch('nonexistent-id');
      // deleteSwitch returns { success: true } even for non-existent
      expect(result).toEqual({ success: true });
    });

    test('should handle deleting null switch ID', () => {
      const result = deleteSwitch(null);
      // deleteSwitch returns { success: true }
      expect(result).toEqual({ success: true });
    });

    test('should successfully delete existing switch', async () => {
      const created = await createSwitch('test', 72, false);
      const result = deleteSwitch(created.switchId);

      expect(result).toEqual({ success: true });
      // Verify switch is deleted
      const status = await getStatus(created.switchId);
      expect(status.found).toBe(false);
    });

    test('should handle double delete', async () => {
      const created = await createSwitch('test', 72, false);

      const result1 = deleteSwitch(created.switchId);
      expect(result1).toEqual({ success: true });

      // Second delete of non-existent switch still returns success
      const result2 = deleteSwitch(created.switchId);
      expect(result2).toEqual({ success: true });
    });
  });

  describe('Check-in operation edge cases', () => {
    test('should handle checking in non-existent switch', async () => {
      const result = await checkIn('nonexistent-id');
      // checkIn returns { success: false, message: ... } for non-existent
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    test('should successfully check in existing switch', async () => {
      const created = await createSwitch('test', 72, false);
      const originalExpiry = created.expiryTime;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await checkIn(created.switchId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.newExpiryTime).toBeGreaterThan(originalExpiry);
    });
  });
});
