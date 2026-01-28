#!/usr/bin/env node
/**
 * Guardian Daemon Integration Test
 *
 * Tests the complete flow:
 * 1. NIP-44 encryption/decryption
 * 2. Nostr event signing
 * 3. Share storage event handling
 * 4. Heartbeat event handling
 * 5. Share release logic
 */

import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from 'nostr-tools';
import { schnorr } from '@noble/curves/secp256k1.js';
import { encrypt, decrypt, hexToBytes, bytesToHex } from './nip44.js';
import { GuardianDaemon } from './index.js';

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Generate test keypairs
function generateKeypair() {
  const privateKeyBytes = generateSecretKey();
  const privateKey = Buffer.from(privateKeyBytes).toString('hex');
  const publicKey = getPublicKey(privateKeyBytes);
  return { privateKey, publicKey };
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Guardian Daemon Integration Tests                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Generate test keys
  const user = generateKeypair();
  const guardian = generateKeypair();
  const recipient = generateKeypair();

  console.log('Test keypairs generated:');
  console.log(`  User:      ${user.publicKey.slice(0, 16)}...`);
  console.log(`  Guardian:  ${guardian.publicKey.slice(0, 16)}...`);
  console.log(`  Recipient: ${recipient.publicKey.slice(0, 16)}...`);
  console.log('');

  // ============================================
  // Test 1: NIP-44 Encryption
  // ============================================
  console.log('1. NIP-44 Encryption/Decryption');

  await testAsync('Encrypt and decrypt a message', async () => {
    const plaintext = 'This is a secret Shamir share: x=1, y=abc123...';
    const encrypted = await encrypt(plaintext, guardian.publicKey, user.privateKey);
    assert(encrypted.length > 0, 'Encrypted data should not be empty');
    assert(encrypted !== plaintext, 'Encrypted should differ from plaintext');

    const decrypted = await decrypt(encrypted, user.publicKey, guardian.privateKey);
    assert(decrypted === plaintext, `Decrypted should match: got "${decrypted}"`);
  });

  await testAsync('Encryption with different keys produces different ciphertext', async () => {
    const plaintext = 'Same message';
    const encrypted1 = await encrypt(plaintext, guardian.publicKey, user.privateKey);
    const encrypted2 = await encrypt(plaintext, recipient.publicKey, user.privateKey);
    assert(encrypted1 !== encrypted2, 'Different recipients should produce different ciphertext');
  });

  await testAsync('Decryption fails with wrong key', async () => {
    const plaintext = 'Secret data';
    const encrypted = await encrypt(plaintext, guardian.publicKey, user.privateKey);

    try {
      // Try to decrypt with wrong key (recipient instead of guardian)
      await decrypt(encrypted, user.publicKey, recipient.privateKey);
      throw new Error('Should have failed');
    } catch (error) {
      assert(error.message.includes('Invalid MAC') || error.message.includes('tampered'),
        'Should fail with MAC error');
    }
  });

  // ============================================
  // Test 2: Nostr Event Signing
  // ============================================
  console.log('\n2. Nostr Event Signing');

  test('Sign and verify an event', () => {
    const unsignedEvent = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['d', 'test-switch-123']],
      content: JSON.stringify({ test: true }),
    };

    const signedEvent = finalizeEvent(unsignedEvent, user.privateKey);

    assert(signedEvent.id, 'Event should have an ID');
    assert(signedEvent.sig, 'Event should have a signature');
    assert(signedEvent.pubkey === user.publicKey, 'Pubkey should match');
    assert(verifyEvent(signedEvent), 'Event signature should verify');
  });

  test('Tampered signature fails schnorr verification', () => {
    const unsignedEvent = {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['d', 'test-switch-123']],
      content: JSON.stringify({ test: true }),
    };

    const signedEvent = finalizeEvent(unsignedEvent, user.privateKey);

    // Verify original signature works with direct schnorr
    const msgHash = hexToBytes(signedEvent.id);
    const pubkey = hexToBytes(signedEvent.pubkey);
    const sig = hexToBytes(signedEvent.sig);
    assert(schnorr.verify(sig, msgHash, pubkey), 'Original should verify');

    // Tamper with the signature
    const tamperedSig = new Uint8Array(64).fill(0xaa);
    assert(!schnorr.verify(tamperedSig, msgHash, pubkey), 'Tampered signature should fail verification');
  });

  // ============================================
  // Test 3: Share Storage Event Handling
  // ============================================
  console.log('\n3. Share Storage Event Handling');

  await testAsync('Guardian processes share storage event', async () => {
    // Create a mock share storage event
    const shareData = JSON.stringify({
      x: 1,
      y: 'deadbeef1234567890abcdef',
      hmac: 'abc123',
    });

    // Encrypt share for guardian
    const encryptedShare = await encrypt(shareData, guardian.publicKey, user.privateKey);

    const now = Math.floor(Date.now() / 1000);
    const shareStorageEvent = finalizeEvent({
      kind: 30079,
      created_at: now,
      tags: [
        ['d', 'test-switch-456:1'],
        ['p', guardian.publicKey],
        ['encrypted_for', guardian.publicKey],
        ['threshold_hours', '24'],
        ['recipient', recipient.publicKey],
      ],
      content: encryptedShare,
    }, user.privateKey);

    assert(verifyEvent(shareStorageEvent), 'Share storage event should verify');

    // Verify guardian can decrypt the share
    const decryptedShare = await decrypt(
      shareStorageEvent.content,
      user.publicKey,
      guardian.privateKey
    );
    assert(decryptedShare === shareData, 'Guardian should be able to decrypt share');
  });

  // ============================================
  // Test 4: Heartbeat Event Handling
  // ============================================
  console.log('\n4. Heartbeat Event Handling');

  test('Create valid heartbeat event', () => {
    const now = Math.floor(Date.now() / 1000);
    const checkInHours = 24;
    const expiresAt = now + (checkInHours * 60 * 60);

    const heartbeatEvent = finalizeEvent({
      kind: 30078,
      created_at: now,
      tags: [
        ['d', 'echolock-heartbeat-test-switch-456'],
        ['expiry', String(expiresAt)],
        ['check-in-hours', String(checkInHours)],
      ],
      content: JSON.stringify({
        version: 1,
        switchId: 'test-switch-456',
        timestamp: now,
        checkInHours,
        expiresAt,
      }),
    }, user.privateKey);

    assert(verifyEvent(heartbeatEvent), 'Heartbeat event should verify');
    assert(heartbeatEvent.kind === 30078, 'Kind should be 30078');

    const dTag = heartbeatEvent.tags.find(t => t[0] === 'd');
    assert(dTag && dTag[1].includes('test-switch-456'), 'd tag should contain switch ID');
  });

  // ============================================
  // Test 5: Share Release Logic
  // ============================================
  console.log('\n5. Share Release Logic');

  await testAsync('Re-encrypt share for recipient', async () => {
    // Original share data
    const shareData = JSON.stringify({
      x: 1,
      y: 'secret_share_data_here',
      hmac: 'authentication_tag',
    });

    // User encrypts for guardian
    const encryptedForGuardian = await encrypt(shareData, guardian.publicKey, user.privateKey);

    // Guardian decrypts
    const decryptedByGuardian = await decrypt(
      encryptedForGuardian,
      user.publicKey,
      guardian.privateKey
    );
    assert(decryptedByGuardian === shareData, 'Guardian should decrypt correctly');

    // Guardian re-encrypts for recipient
    const encryptedForRecipient = await encrypt(
      decryptedByGuardian,
      recipient.publicKey,
      guardian.privateKey
    );

    // Recipient decrypts
    const decryptedByRecipient = await decrypt(
      encryptedForRecipient,
      guardian.publicKey,
      recipient.privateKey
    );
    assert(decryptedByRecipient === shareData, 'Recipient should decrypt correctly');
  });

  await testAsync('Create valid release event', async () => {
    const shareData = 'share_data_here';

    // Re-encrypt for recipient
    const encryptedForRecipient = await encrypt(
      shareData,
      recipient.publicKey,
      guardian.privateKey
    );

    const now = Math.floor(Date.now() / 1000);
    const releaseEvent = finalizeEvent({
      kind: 30080,
      created_at: now,
      tags: [
        ['d', 'test-switch-456:1'],
        ['e', 'switch:test-switch-456'],
        ['p', recipient.publicKey],
      ],
      content: JSON.stringify({
        version: 1,
        switchId: 'test-switch-456',
        shareIndex: 1,
        reason: 'heartbeat_timeout',
        lastHeartbeat: now - 86400, // 24 hours ago
        releasedAt: now,
        encryptedShares: {
          [recipient.publicKey]: encryptedForRecipient,
        },
      }),
    }, guardian.privateKey);

    assert(verifyEvent(releaseEvent), 'Release event should verify');
    assert(releaseEvent.kind === 30080, 'Kind should be 30080');
    assert(releaseEvent.pubkey === guardian.publicKey, 'Should be signed by guardian');

    // Verify recipient can extract and decrypt their share
    const content = JSON.parse(releaseEvent.content);
    const recipientShare = content.encryptedShares[recipient.publicKey];
    const decrypted = await decrypt(recipientShare, guardian.publicKey, recipient.privateKey);
    assert(decrypted === shareData, 'Recipient should decrypt share from release event');
  });

  // ============================================
  // Test 6: Guardian Daemon Instance
  // ============================================
  console.log('\n6. Guardian Daemon Instance');

  test('Create daemon with config', () => {
    const daemon = new GuardianDaemon({
      privateKey: guardian.privateKey,
      relayUrls: ['wss://relay.example.com'],
      checkIntervalMinutes: 5,
      gracePeriodHours: 1,
      dataDir: './test-data',
    });

    assert(daemon.config.publicKey === guardian.publicKey, 'Public key should be derived');
    assert(daemon.config.checkIntervalMinutes === 5, 'Check interval should be set');
  });

  test('Daemon getStatus returns correct structure', () => {
    const daemon = new GuardianDaemon({
      privateKey: guardian.privateKey,
      relayUrls: ['wss://relay.example.com'],
      dataDir: './test-data',
    });

    const status = daemon.getStatus();
    assert(status.publicKey === guardian.publicKey, 'Status should include public key');
    assert(typeof status.switchesMonitored === 'number', 'Should include switch count');
    assert(Array.isArray(status.switches), 'Should include switches array');
  });

  // ============================================
  // Summary
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
