'use strict';

// Tests for configuration module
import { loadConfig, getConfigValue } from '../../src/core/config.js';

describe('Configuration Module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.BITCOIN_NETWORK;
    delete process.env.NOSTR_RELAYS;
    delete process.env.MIN_RELAY_COUNT;
    delete process.env.CHECK_IN_HOURS;
    delete process.env.DEBUG;
    delete process.env.USE_NOSTR_DISTRIBUTION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    test('should load default configuration', () => {
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.bitcoin.network).toBe('testnet');
      expect(config.nostr.relays).toBeDefined();
      expect(config.nostr.minRelayCount).toBeGreaterThan(0);
      expect(config.timelock.checkInHours).toBeGreaterThan(0);
    });

    test('should enforce testnet-only policy', () => {
      process.env.BITCOIN_NETWORK = 'mainnet';

      expect(() => loadConfig()).toThrow('SECURITY: Only testnet is allowed');
    });

    test('should reject mainnet configuration', () => {
      process.env.BITCOIN_NETWORK = 'mainnet';

      expect(() => loadConfig()).toThrow();
    });

    test('should accept testnet configuration', () => {
      process.env.BITCOIN_NETWORK = 'testnet';

      const config = loadConfig();
      expect(config.bitcoin.network).toBe('testnet');
    });

    test('should validate relay count when Nostr distribution enabled', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test';
      process.env.MIN_RELAY_COUNT = '3';

      expect(() => loadConfig()).toThrow('Insufficient relays configured');
    });

    test('should accept sufficient relays', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test,wss://relay2.test,wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(3);
    });

    test('should not validate relay count when Nostr distribution disabled', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'false';
      process.env.NOSTR_RELAYS = 'wss://relay1.test';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(1);
    });

    test('should validate minimum check-in hours', () => {
      process.env.CHECK_IN_HOURS = '1';

      expect(() => loadConfig()).toThrow('Check-in interval too short');
    });

    test('should accept valid check-in hours', () => {
      process.env.CHECK_IN_HOURS = '72';

      const config = loadConfig();
      expect(config.timelock.checkInHours).toBe(72);
    });

    test('should validate relay URLs (require ws:// or wss://)', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'http://invalid.relay,wss://valid.relay,wss://another.relay';
      process.env.MIN_RELAY_COUNT = '2';

      expect(() => loadConfig()).toThrow('Invalid relay URL');
    });

    test('should accept wss:// relay URLs', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test,wss://relay2.test,wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays.every(r => r.startsWith('wss://'))).toBe(true);
    });

    test('should accept ws:// relay URLs (for testing)', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'ws://localhost:7000,ws://localhost:7001,ws://localhost:7002';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays.every(r => r.startsWith('ws://'))).toBe(true);
    });

    test('should handle debug mode enabled', () => {
      process.env.DEBUG = 'true';

      const config = loadConfig();
      expect(config.debug).toBe(true);
    });

    test('should handle debug mode disabled', () => {
      process.env.DEBUG = 'false';

      const config = loadConfig();
      expect(config.debug).toBe(false);
    });

    test('should default debug mode to false', () => {
      const config = loadConfig();
      expect(config.debug).toBe(false);
    });

    test('should parse comma-separated relay list', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test, wss://relay2.test , wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(3);
      expect(config.nostr.relays[0]).toBe('wss://relay1.test');
    });

    test('should trim whitespace from relay URLs', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = '  wss://relay1.test  ,  wss://relay2.test  ,  wss://relay3.test  ';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays.every(r => r === r.trim())).toBe(true);
    });

    test('should handle invalid MIN_RELAY_COUNT (non-numeric)', () => {
      process.env.MIN_RELAY_COUNT = 'invalid';

      const config = loadConfig();
      // Should default to a valid value or use NaN which fails validation
      expect(typeof config.nostr.minRelayCount).toBe('number');
    });

    test('should handle invalid CHECK_IN_HOURS (non-numeric)', () => {
      process.env.CHECK_IN_HOURS = 'invalid';

      const config = loadConfig();
      expect(typeof config.timelock.checkInHours).toBe('number');
    });

    test('should reject empty relay list when Nostr enabled', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = '';
      process.env.MIN_RELAY_COUNT = '1';

      // Empty string splits to [''], which has length 1 but is not a valid relay
      expect(() => loadConfig()).toThrow();
    });

    test('should handle very large check-in hours', () => {
      process.env.CHECK_IN_HOURS = '87600'; // 10 years

      const config = loadConfig();
      expect(config.timelock.checkInHours).toBe(87600);
    });

    test('should handle relay URLs with ports', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test:443,wss://relay2.test:8080,wss://relay3.test:9000';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(3);
    });

    test('should handle relay URLs with paths', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay1.test/path1,wss://relay2.test/path2,wss://relay3.test/path3';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(3);
    });
  });

  describe('getConfigValue', () => {
    test('should retrieve top-level value', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'debug');

      expect(typeof value).toBe('boolean');
    });

    test('should retrieve nested value', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'bitcoin.network');

      expect(value).toBe('testnet');
    });

    test('should retrieve deeply nested value', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'nostr.minRelayCount');

      expect(typeof value).toBe('number');
    });

    test('should return undefined for non-existent path', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'nonexistent.path');

      expect(value).toBeUndefined();
    });

    test('should return undefined for partially invalid path', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'bitcoin.invalid.path');

      expect(value).toBeUndefined();
    });

    test('should handle empty path', () => {
      const config = loadConfig();
      const value = getConfigValue(config, '');

      // Empty path returns undefined due to reduce behavior
      expect(value).toBeUndefined();
    });

    test('should handle single-key path', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'bitcoin');

      expect(value).toBeDefined();
      expect(value.network).toBe('testnet');
    });

    test('should handle array values', () => {
      const config = loadConfig();
      const value = getConfigValue(config, 'nostr.relays');

      expect(Array.isArray(value)).toBe(true);
    });
  });

  describe('Configuration validation edge cases', () => {
    test('should handle zero MIN_RELAY_COUNT', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'false'; // Disable validation
      process.env.MIN_RELAY_COUNT = '0';
      process.env.NOSTR_RELAYS = 'wss://relay1.test';

      const config = loadConfig();
      expect(config.nostr.minRelayCount).toBe(0);
    });

    test('should handle negative MIN_RELAY_COUNT (parsed as NaN)', () => {
      process.env.MIN_RELAY_COUNT = '-5';

      const config = loadConfig();
      expect(config.nostr.minRelayCount).toBe(-5);
    });

    test('should handle special characters in relay URLs', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'wss://relay-1.test,wss://relay_2.test,wss://relay.3.test';
      process.env.MIN_RELAY_COUNT = '3';

      const config = loadConfig();
      expect(config.nostr.relays).toHaveLength(3);
    });

    test('should reject relay URL without protocol', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'relay.test,wss://relay2.test,wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '2';

      expect(() => loadConfig()).toThrow('Invalid relay URL');
    });

    test('should reject http:// relay URLs', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'http://relay.test,wss://relay2.test,wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '2';

      expect(() => loadConfig()).toThrow('Invalid relay URL');
    });

    test('should reject https:// relay URLs', () => {
      process.env.USE_NOSTR_DISTRIBUTION = 'true';
      process.env.NOSTR_RELAYS = 'https://relay.test,wss://relay2.test,wss://relay3.test';
      process.env.MIN_RELAY_COUNT = '2';

      expect(() => loadConfig()).toThrow('Invalid relay URL');
    });
  });
});