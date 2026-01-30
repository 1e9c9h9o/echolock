'use strict';

// Basic project structure and import tests
// Verifies all modules can be imported and have no syntax errors

import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Project Structure', () => {
  test('all security documentation files exist', () => {
    const securityFiles = [
      'security/THREAT_MODEL.md',
      'security/AUDIT_LOG.md',
      'security/VULNERABILITIES.md',
      'SECURITY.md',
      'README.md'
    ];

    securityFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('all required directories exist', () => {
    const requiredDirs = [
      'src/crypto',
      'src/bitcoin',
      'src/nostr',
      'src/core',
      'src/cli',
      'tests/unit',
      'tests/integration',
      'security',
      'docs',
      'data'
    ];

    requiredDirs.forEach(dir => {
      const dirPath = path.join(projectRoot, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  test('gitignore protects sensitive files', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');

    const requiredEntries = [
      '.env',
      '*.key',
      '*.secret',
      'node_modules',
      'data/*.json'
    ];

    requiredEntries.forEach(entry => {
      expect(gitignore).toContain(entry);
    });
  });

  test('package.json has correct configuration', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.name).toBe('echolock');
    expect(pkg.type).toBe('module');
    expect(pkg.engines.node).toBe('>=18.0.0');
    expect(pkg.scripts.test).toContain('jest');
  });

  test('security dependencies are installed', () => {
    const pkgPath = path.join(projectRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.dependencies['shamir-secret-sharing']).toBeDefined();
    expect(pkg.dependencies['bitcoinjs-lib']).toBeDefined();
    expect(pkg.dependencies['nostr-tools']).toBeDefined();
    expect(pkg.dependencies['dotenv']).toBeDefined();
    expect(pkg.devDependencies['jest']).toBeDefined();
  });
});

describe('Module Imports - Crypto Layer', () => {
  test('can import secretSharing module', async () => {
    const module = await import('../../src/crypto/secretSharing.js');
    expect(module).toBeDefined();
    expect(typeof module.splitSecret).toBe('function');
    expect(typeof module.reconstructSecret).toBe('function');
  });

  test('can import encryption module', async () => {
    const module = await import('../../src/crypto/encryption.js');
    expect(module).toBeDefined();
    expect(typeof module.encrypt).toBe('function');
    expect(typeof module.decrypt).toBe('function');
  });

  test('can import keyDerivation module', async () => {
    const module = await import('../../src/crypto/keyDerivation.js');
    expect(module).toBeDefined();
    expect(typeof module.deriveKey).toBe('function');
    expect(typeof module.verifyPassword).toBe('function');
  });
});

describe('Module Imports - Bitcoin Layer', () => {
  test('can import timelockScript module', async () => {
    const module = await import('../../src/bitcoin/timelockScript.js');
    expect(module).toBeDefined();
    expect(typeof module.createTimelockScript).toBe('function');
    expect(typeof module.estimateUnlockTime).toBe('function');
    expect(typeof module.validateTimelock).toBe('function');
  });

  test('can import feeEstimation module', async () => {
    const module = await import('../../src/bitcoin/feeEstimation.js');
    expect(module).toBeDefined();
    expect(typeof module.estimateFeeRate).toBe('function');
    expect(typeof module.calculateFee).toBe('function');
    expect(module.FALLBACK_FEE_RATES).toBeDefined();
  });

  test('can import bitcoin constants', async () => {
    const module = await import('../../src/bitcoin/constants.js');
    expect(module).toBeDefined();
    expect(module.NETWORK).toBeDefined();
    expect(module.CURRENT_NETWORK).toBeDefined();
    expect(module.CURRENT_NETWORK.name).toBe('testnet');
  });

  test('bitcoin network is set to testnet only', async () => {
    const module = await import('../../src/bitcoin/constants.js');
    expect(module.CURRENT_NETWORK.name).toBe('testnet');
  });
});

describe('Module Imports - Nostr Layer', () => {
  test('can import multiRelayClient module', async () => {
    const module = await import('../../src/nostr/multiRelayClient.js');
    expect(module).toBeDefined();
    expect(typeof module.publishToRelays).toBe('function');
    expect(typeof module.fetchFromRelays).toBe('function');
    expect(typeof module.calculateRelayDistribution).toBe('function');
  });

  test('can import relayHealthCheck module', async () => {
    const module = await import('../../src/nostr/relayHealthCheck.js');
    expect(module).toBeDefined();
    expect(typeof module.checkRelayHealth).toBe('function');
    expect(typeof module.checkMultipleRelays).toBe('function');
    expect(typeof module.filterHealthyRelays).toBe('function');
  });

  test('can import nostr constants', async () => {
    const module = await import('../../src/nostr/constants.js');
    expect(module).toBeDefined();
    expect(module.RELIABLE_RELAYS).toBeDefined();
    expect(module.RELAY_REQUIREMENTS).toBeDefined();
    expect(Array.isArray(module.RELIABLE_RELAYS)).toBe(true);
  });

  test('nostr has minimum relay count configured', async () => {
    const module = await import('../../src/nostr/constants.js');
    expect(module.RELAY_REQUIREMENTS.MIN_RELAY_COUNT).toBeGreaterThanOrEqual(7);
    expect(module.RELIABLE_RELAYS.length).toBeGreaterThanOrEqual(7);
  });
});

describe('Module Imports - Core Layer', () => {
  // Coordinator module was removed as it was unused dead code
  // All coordination is handled by deadManSwitch.js

  test('can import config module', async () => {
    const module = await import('../../src/core/config.js');
    expect(module).toBeDefined();
    expect(typeof module.loadConfig).toBe('function');
    expect(typeof module.getConfigValue).toBe('function');
  });
});

describe('Security Boundaries', () => {
  test('crypto modules contain security boundary comments', () => {
    const cryptoFiles = [
      'src/crypto/secretSharing.js',
      'src/crypto/encryption.js',
      'src/crypto/keyDerivation.js'
    ];

    cryptoFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('SECURITY BOUNDARY');
      expect(content).toContain('use strict');
    });
  });

  test('all JavaScript files use strict mode', () => {
    const jsFiles = [
      'src/crypto/secretSharing.js',
      'src/crypto/encryption.js',
      'src/crypto/keyDerivation.js',
      'src/bitcoin/timelockScript.js',
      'src/bitcoin/feeEstimation.js',
      'src/bitcoin/constants.js',
      'src/nostr/multiRelayClient.js',
      'src/nostr/relayHealthCheck.js',
      'src/nostr/constants.js',
      'src/core/config.js',
      'src/index.js',
      'src/cli/index.js'
    ];

    jsFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain("'use strict'");
    });
  });
});

describe('Configuration Safety', () => {
  test('config module enforces testnet only', async () => {
    // Set environment to mainnet (should be rejected)
    process.env.BITCOIN_NETWORK = 'mainnet';

    const { loadConfig } = await import('../../src/core/config.js');

    expect(() => {
      loadConfig();
    }).toThrow('Only testnet is allowed');

    // Clean up
    delete process.env.BITCOIN_NETWORK;
  });

  test('config module validates relay count', async () => {
    // Set insufficient relay count with Nostr distribution enabled
    process.env.USE_NOSTR_DISTRIBUTION = 'true';
    process.env.NOSTR_RELAYS = 'wss://relay1.com,wss://relay2.com';
    process.env.MIN_RELAY_COUNT = '3';

    const { loadConfig } = await import('../../src/core/config.js');

    expect(() => {
      loadConfig();
    }).toThrow('Insufficient relays configured');

    // Clean up
    delete process.env.USE_NOSTR_DISTRIBUTION;
    delete process.env.NOSTR_RELAYS;
    delete process.env.MIN_RELAY_COUNT;
  });
});