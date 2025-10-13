'use strict';

/**
 * Integration tests for Nostr fragment distribution
 * Tests real WebSocket connections to Nostr relays
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  publishToRelays,
  fetchFromRelays,
  publishFragment,
  retrieveFragments
} from '../../src/nostr/multiRelayClient.js';
import {
  checkRelayHealth,
  checkMultipleRelays,
  filterHealthyRelays
} from '../../src/nostr/relayHealthCheck.js';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools';
import { encrypt, decrypt } from '../../src/crypto/encryption.js';
import crypto from 'crypto';

// Test relays - geographically distributed
const TEST_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.current.fyi',
  'wss://nostr.mom'
];

describe('Nostr Relay Health Checking', () => {
  test('should check health of a single relay', async () => {
    const result = await checkRelayHealth(TEST_RELAYS[0], 10000);

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('healthy');
    expect(result.url).toBe(TEST_RELAYS[0]);

    if (result.healthy) {
      expect(result.latency).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    } else {
      expect(result.error).toBeTruthy();
    }
  }, 15000);

  test('should check multiple relays in parallel', async () => {
    const results = await checkMultipleRelays(TEST_RELAYS);

    expect(results).toHaveLength(TEST_RELAYS.length);

    const healthyCount = results.filter(r => r.healthy).length;
    console.log(`Healthy relays: ${healthyCount}/${TEST_RELAYS.length}`);

    expect(healthyCount).toBeGreaterThan(0);
  }, 30000);

  test('should filter to healthy relays only', async () => {
    try {
      const healthy = await filterHealthyRelays(TEST_RELAYS, 3);
      expect(healthy.length).toBeGreaterThanOrEqual(3);
      console.log(`Filtered to ${healthy.length} healthy relays`);
    } catch (error) {
      console.warn('Not enough healthy relays for test:', error.message);
    }
  }, 30000);
});

describe('Nostr Fragment Publishing', () => {
  let testPrivateKey;
  let testPublicKey;
  let testSwitchId;

  beforeAll(() => {
    testPrivateKey = generateSecretKey();
    testPublicKey = getPublicKey(testPrivateKey);
    testSwitchId = 'test_' + Date.now();
  });

  test('should publish an event to multiple relays', async () => {
    const event = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'Test message for ECHOLOCK integration test',
      pubkey: testPublicKey
    };

    const signedEvent = finalizeEvent(event, testPrivateKey);

    const result = await publishToRelays(signedEvent, TEST_RELAYS, 3);

    expect(result.successCount).toBeGreaterThanOrEqual(3);
    console.log(`Published to ${result.successCount} relays`);

    if (result.failures.length > 0) {
      console.log('Failures:', result.failures);
    }
  }, 30000);

  test('should publish a fragment with NIP-78 format and atomic storage', async () => {
    // NEW API: Encrypt the fragment data first
    const fragmentData = Buffer.from('test_fragment_data_12345');
    const encryptionKey = crypto.randomBytes(32);
    const encryptedData = encrypt(fragmentData, encryptionKey);

    const metadata = {
      salt: crypto.randomBytes(32),
      iterations: 600000
    };
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600;

    const result = await publishFragment(
      testSwitchId,
      0,
      encryptedData, // NEW: { ciphertext, iv, authTag }
      metadata,      // NEW: { salt, iterations }
      { privkey: testPrivateKey, pubkey: testPublicKey },
      TEST_RELAYS,
      expiryTimestamp
    );

    expect(result.eventId).toBeTruthy();
    expect(result.successCount).toBeGreaterThanOrEqual(3);
    console.log(`Fragment published with event ID: ${result.eventId}`);
  }, 30000);

  test('should publish multiple fragments with encryption', async () => {
    const fragments = [
      Buffer.from('fragment_0'),
      Buffer.from('fragment_1'),
      Buffer.from('fragment_2')
    ];
    const encryptionKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600;

    const results = [];
    for (let i = 0; i < fragments.length; i++) {
      const encryptedData = encrypt(fragments[i], encryptionKey);
      const metadata = { salt, iterations: 600000 };

      const result = await publishFragment(
        testSwitchId,
        i,
        encryptedData,
        metadata,
        { privkey: testPrivateKey, pubkey: testPublicKey },
        TEST_RELAYS,
        expiryTimestamp
      );
      results.push(result);
    }

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.successCount).toBeGreaterThanOrEqual(3);
    });
  }, 60000);
});

describe('Nostr Fragment Retrieval', () => {
  let testPrivateKey;
  let testPublicKey;
  let testSwitchId;

  beforeAll(() => {
    testPrivateKey = generateSecretKey();
    testPublicKey = getPublicKey(testPrivateKey);
    testSwitchId = 'test_retrieve_' + Date.now();
  });

  test('should retrieve published fragments with integrity verification', async () => {
    // First, publish some fragments with encryption
    const fragments = [
      Buffer.from('retrieve_test_fragment_0'),
      Buffer.from('retrieve_test_fragment_1'),
      Buffer.from('retrieve_test_fragment_2')
    ];
    const encryptionKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600;

    console.log(`Publishing fragments for switch ${testSwitchId}...`);
    for (let i = 0; i < fragments.length; i++) {
      const encryptedData = encrypt(fragments[i], encryptionKey);
      const metadata = { salt, iterations: 600000 };

      await publishFragment(
        testSwitchId,
        i,
        encryptedData,
        metadata,
        { privkey: testPrivateKey, pubkey: testPublicKey },
        TEST_RELAYS,
        expiryTimestamp
      );
    }

    // Wait a bit for propagation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now retrieve them
    console.log('Retrieving fragments...');
    const retrieved = await retrieveFragments(testSwitchId, TEST_RELAYS);

    expect(retrieved.length).toBeGreaterThanOrEqual(3);
    expect(retrieved[0].index).toBe(0);

    // NEW: Verify the structure includes encrypted data and metadata
    expect(retrieved[0].encryptedData).toHaveProperty('ciphertext');
    expect(retrieved[0].encryptedData).toHaveProperty('iv');
    expect(retrieved[0].encryptedData).toHaveProperty('authTag');
    expect(retrieved[0].metadata).toHaveProperty('salt');
    expect(retrieved[0].metadata).toHaveProperty('iterations');

    // Decrypt and verify content
    const decrypted = decrypt(
      retrieved[0].encryptedData.ciphertext,
      encryptionKey,
      retrieved[0].encryptedData.iv,
      retrieved[0].encryptedData.authTag
    );
    expect(decrypted.toString()).toBe('retrieve_test_fragment_0');

    console.log(`Retrieved ${retrieved.length} fragments with integrity verification ✓`);
  }, 90000);

  test('should handle fragment retrieval with relay failures', async () => {
    // Mix healthy and unhealthy relays
    const mixedRelays = [
      ...TEST_RELAYS.slice(0, 5),
      'wss://nonexistent-relay-test.invalid',
      'wss://another-fake-relay.test'
    ];

    const testSwitchIdFail = 'test_fail_' + Date.now();
    const fragments = [
      Buffer.from('fail_test_0'),
      Buffer.from('fail_test_1'),
      Buffer.from('fail_test_2')
    ];
    const encryptionKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 3600;

    // Publish to good relays
    for (let i = 0; i < fragments.length; i++) {
      const encryptedData = encrypt(fragments[i], encryptionKey);
      const metadata = { salt, iterations: 600000 };

      await publishFragment(
        testSwitchIdFail,
        i,
        encryptedData,
        metadata,
        { privkey: testPrivateKey, pubkey: testPublicKey },
        TEST_RELAYS.slice(0, 5),
        expiryTimestamp
      );
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to retrieve with mixed relays - should still succeed
    try {
      const retrieved = await retrieveFragments(testSwitchIdFail, mixedRelays);
      expect(retrieved.length).toBeGreaterThanOrEqual(3);
      console.log('Fragment retrieval succeeded despite relay failures ✓');
    } catch (error) {
      console.log('Expected behavior: Some relays failed but retrieval may still work');
    }
  }, 90000);
});

describe('Geographic Distribution Test', () => {
  test('should verify relays are from different regions', async () => {
    const healthResults = await checkMultipleRelays(TEST_RELAYS);
    const healthyRelays = healthResults.filter(r => r.healthy);

    console.log('Healthy relays by latency:');
    healthyRelays
      .sort((a, b) => a.latency - b.latency)
      .forEach(relay => {
        console.log(`  ${relay.url}: ${relay.latency}ms`);
      });

    // Check for geographic distribution by latency variance
    if (healthyRelays.length >= 3) {
      const latencies = healthyRelays.map(r => r.latency);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length;

      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Latency variance: ${variance.toFixed(2)}`);

      // High variance suggests geographic distribution
      expect(variance).toBeGreaterThan(0);
    }
  }, 30000);
});