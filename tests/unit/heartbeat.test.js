'use strict';

/**
 * Tests for Nostr Heartbeat (Permissionless Check-In) System
 */

import { describe, test, expect, jest } from '@jest/globals';
import crypto from 'crypto';
import {
  createHeartbeatEvent,
  getNostrPubkey
} from '../../src/nostr/heartbeat.js';
import { verifyEvent } from 'nostr-tools';

describe('Nostr Heartbeat System', () => {

  describe('createHeartbeatEvent', () => {

    test('should create valid Nostr event with correct structure', () => {
      const privateKey = crypto.randomBytes(32);
      const switchId = 'test-switch-123';
      const checkInHours = 72;

      const event = createHeartbeatEvent({
        switchId,
        checkInHours,
        nostrPrivateKey: privateKey
      });

      // Check event structure
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('pubkey');
      expect(event).toHaveProperty('created_at');
      expect(event).toHaveProperty('kind', 30078);
      expect(event).toHaveProperty('tags');
      expect(event).toHaveProperty('content');
      expect(event).toHaveProperty('sig');
    });

    test('should include correct d-tag for parameterized replaceable event', () => {
      const privateKey = crypto.randomBytes(32);
      const switchId = 'my-unique-switch';

      const event = createHeartbeatEvent({
        switchId,
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      const dTag = event.tags.find(t => t[0] === 'd');
      expect(dTag).toBeDefined();
      expect(dTag[1]).toBe(`echolock-heartbeat-${switchId}`);
    });

    test('should include expiry and check-in-hours tags', () => {
      const privateKey = crypto.randomBytes(32);
      const checkInHours = 48;

      const event = createHeartbeatEvent({
        switchId: 'test',
        checkInHours,
        nostrPrivateKey: privateKey
      });

      const expiryTag = event.tags.find(t => t[0] === 'expiry');
      const hoursTag = event.tags.find(t => t[0] === 'check-in-hours');

      expect(expiryTag).toBeDefined();
      expect(hoursTag).toBeDefined();
      expect(hoursTag[1]).toBe(String(checkInHours));
    });

    test('should create valid signature', () => {
      const privateKey = crypto.randomBytes(32);

      const event = createHeartbeatEvent({
        switchId: 'test',
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      // Verify the event signature
      expect(verifyEvent(event)).toBe(true);
    });

    test('should include correct content JSON', () => {
      const privateKey = crypto.randomBytes(32);
      const switchId = 'test-switch';
      const checkInHours = 72;

      const event = createHeartbeatEvent({
        switchId,
        checkInHours,
        nostrPrivateKey: privateKey
      });

      const content = JSON.parse(event.content);

      expect(content.version).toBe(1);
      expect(content.switchId).toBe(switchId);
      expect(content.checkInHours).toBe(checkInHours);
      expect(content.timestamp).toBeDefined();
      expect(content.expiresAt).toBeDefined();
      expect(content.switchIdHash).toBeDefined();

      // Verify expiresAt is correct
      expect(content.expiresAt).toBe(content.timestamp + (checkInHours * 60 * 60));
    });

    test('should reject invalid switchId', () => {
      const privateKey = crypto.randomBytes(32);

      expect(() => {
        createHeartbeatEvent({
          switchId: '',
          checkInHours: 24,
          nostrPrivateKey: privateKey
        });
      }).toThrow('switchId must be a non-empty string');

      expect(() => {
        createHeartbeatEvent({
          switchId: null,
          checkInHours: 24,
          nostrPrivateKey: privateKey
        });
      }).toThrow();
    });

    test('should reject invalid checkInHours', () => {
      const privateKey = crypto.randomBytes(32);

      expect(() => {
        createHeartbeatEvent({
          switchId: 'test',
          checkInHours: 0,
          nostrPrivateKey: privateKey
        });
      }).toThrow('checkInHours must be at least 1');

      expect(() => {
        createHeartbeatEvent({
          switchId: 'test',
          checkInHours: -1,
          nostrPrivateKey: privateKey
        });
      }).toThrow();
    });

    test('should reject invalid private key', () => {
      expect(() => {
        createHeartbeatEvent({
          switchId: 'test',
          checkInHours: 24,
          nostrPrivateKey: Buffer.alloc(16) // Wrong length
        });
      }).toThrow('nostrPrivateKey must be 32 bytes');

      expect(() => {
        createHeartbeatEvent({
          switchId: 'test',
          checkInHours: 24,
          nostrPrivateKey: null
        });
      }).toThrow();
    });

    test('should create different events for different switches', () => {
      const privateKey = crypto.randomBytes(32);

      const event1 = createHeartbeatEvent({
        switchId: 'switch-1',
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      const event2 = createHeartbeatEvent({
        switchId: 'switch-2',
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      // Different d-tags
      const dTag1 = event1.tags.find(t => t[0] === 'd')[1];
      const dTag2 = event2.tags.find(t => t[0] === 'd')[1];
      expect(dTag1).not.toBe(dTag2);

      // Different content
      expect(event1.content).not.toBe(event2.content);
    });

    test('should create deterministic pubkey from private key', () => {
      const privateKey = crypto.randomBytes(32);

      const event1 = createHeartbeatEvent({
        switchId: 'test',
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      const event2 = createHeartbeatEvent({
        switchId: 'test',
        checkInHours: 24,
        nostrPrivateKey: privateKey
      });

      // Same private key = same pubkey
      expect(event1.pubkey).toBe(event2.pubkey);
    });
  });

  describe('getNostrPubkey', () => {

    test('should derive public key from private key', () => {
      const privateKey = crypto.randomBytes(32);
      const pubkey = getNostrPubkey(privateKey);

      expect(pubkey).toBeDefined();
      expect(typeof pubkey).toBe('string');
      expect(pubkey).toHaveLength(64); // 32 bytes hex encoded
    });

    test('should be deterministic', () => {
      const privateKey = crypto.randomBytes(32);

      const pubkey1 = getNostrPubkey(privateKey);
      const pubkey2 = getNostrPubkey(privateKey);

      expect(pubkey1).toBe(pubkey2);
    });

    test('should reject invalid private key', () => {
      expect(() => {
        getNostrPubkey(Buffer.alloc(16));
      }).toThrow('Private key must be 32 bytes');

      expect(() => {
        getNostrPubkey(null);
      }).toThrow();
    });
  });

  describe('Event Verification', () => {

    test('should create events that pass Nostr verification', () => {
      for (let i = 0; i < 10; i++) {
        const privateKey = crypto.randomBytes(32);
        const event = createHeartbeatEvent({
          switchId: `test-${i}`,
          checkInHours: 24 + i,
          nostrPrivateKey: privateKey
        });

        expect(verifyEvent(event)).toBe(true);
      }
    });

    test('different private keys produce different signatures', () => {
      const privateKey1 = crypto.randomBytes(32);
      const privateKey2 = crypto.randomBytes(32);

      const event1 = createHeartbeatEvent({
        switchId: 'test',
        checkInHours: 24,
        nostrPrivateKey: privateKey1
      });

      const event2 = createHeartbeatEvent({
        switchId: 'test',
        checkInHours: 24,
        nostrPrivateKey: privateKey2
      });

      // Different keys = different pubkeys and signatures
      expect(event1.pubkey).not.toBe(event2.pubkey);
      expect(event1.sig).not.toBe(event2.sig);

      // Both should still verify
      expect(verifyEvent(event1)).toBe(true);
      expect(verifyEvent(event2)).toBe(true);
    });
  });
});
