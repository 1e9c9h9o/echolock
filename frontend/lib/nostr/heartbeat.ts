/**
 * Nostr Heartbeat System
 *
 * Handles creation, signing, and publishing of heartbeat events.
 * Users sign with their own nsec - no server involvement.
 *
 * Security: Uses @noble/curves for BIP-340 Schnorr signatures
 * - Audited by Trail of Bits and Cure53
 * - Constant-time operations (side-channel resistant)
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import {
  NOSTR_KINDS,
  UnsignedEvent,
  NostrEvent,
  HeartbeatData,
  DEFAULT_RELAYS,
} from './types';

/**
 * Create an unsigned heartbeat event
 */
export function createHeartbeatEvent(
  publicKey: string,
  data: HeartbeatData
): UnsignedEvent {
  const now = Math.floor(Date.now() / 1000);
  const expiryTime = now + data.thresholdHours * 3600;

  const tags: string[][] = [
    ['d', data.switchId],
    ['expiry', expiryTime.toString()],
    ['threshold_hours', data.thresholdHours.toString()],
  ];

  // Add guardian pubkeys
  for (const guardian of data.guardianPubkeys) {
    tags.push(['guardian', guardian]);
  }

  return {
    pubkey: publicKey,
    created_at: now,
    kind: NOSTR_KINDS.HEARTBEAT,
    tags,
    content: '', // Heartbeats have empty content
  };
}

/**
 * Serialize event for hashing (NIP-01 format)
 */
export function serializeEventForHashing(event: UnsignedEvent): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * Calculate event ID (SHA256 of serialized event)
 */
export async function calculateEventId(event: UnsignedEvent): Promise<string> {
  const serialized = serializeEventForHashing(event);
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hash = sha256(data);
  return bytesToHex(hash);
}

/**
 * Sign a Nostr event with a private key (BIP-340 Schnorr signature)
 *
 * Uses @noble/curves for audited, constant-time Schnorr signing.
 */
export async function signEvent(
  event: UnsignedEvent,
  privateKeyHex: string
): Promise<NostrEvent> {
  const eventId = await calculateEventId(event);

  // BIP-340 Schnorr signing using @noble/curves
  const signature = schnorr.sign(
    hexToBytes(eventId),
    hexToBytes(privateKeyHex)
  );

  return {
    ...event,
    id: eventId,
    sig: bytesToHex(signature),
  };
}

/**
 * Verify a Nostr event signature
 */
export async function verifyEvent(event: NostrEvent): Promise<boolean> {
  try {
    // Recalculate event ID
    const { id, sig, ...unsigned } = event;
    const calculatedId = await calculateEventId(unsigned);

    if (calculatedId !== id) {
      return false;
    }

    // Verify BIP-340 Schnorr signature using @noble/curves
    return schnorr.verify(
      hexToBytes(sig),
      hexToBytes(id),
      hexToBytes(event.pubkey)
    );
  } catch {
    return false;
  }
}

/**
 * Publish heartbeat to multiple relays
 */
export async function publishHeartbeat(
  event: NostrEvent,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  const publishToRelay = async (relayUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      try {
        const ws = new WebSocket(relayUrl);

        ws.onopen = () => {
          // Send EVENT message (NIP-01)
          ws.send(JSON.stringify(['EVENT', event]));
        };

        ws.onmessage = (msg) => {
          const response = JSON.parse(msg.data);
          if (response[0] === 'OK' && response[1] === event.id) {
            clearTimeout(timeout);
            if (response[2] === true) {
              success.push(relayUrl);
              resolve();
            } else {
              reject(new Error(response[3] || 'Rejected'));
            }
            ws.close();
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  };

  // Publish to all relays in parallel
  await Promise.allSettled(
    relays.map(async (relay) => {
      try {
        await publishToRelay(relay);
      } catch {
        failed.push(relay);
      }
    })
  );

  return { success, failed };
}

/**
 * Query relays for latest heartbeat
 */
export async function queryLatestHeartbeat(
  publicKey: string,
  switchId: string,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<NostrEvent | null> {
  const filter = {
    kinds: [NOSTR_KINDS.HEARTBEAT],
    authors: [publicKey],
    '#d': [switchId],
    limit: 1,
  };

  for (const relayUrl of relays) {
    try {
      const event = await queryRelay(relayUrl, filter);
      if (event) {
        return event;
      }
    } catch {
      // Try next relay
    }
  }

  return null;
}

/**
 * Query a single relay
 */
async function queryRelay(
  relayUrl: string,
  filter: Record<string, unknown>
): Promise<NostrEvent | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    try {
      const ws = new WebSocket(relayUrl);
      const subId = crypto.randomUUID().slice(0, 8);
      let event: NostrEvent | null = null;

      ws.onopen = () => {
        // Send REQ message (NIP-01)
        ws.send(JSON.stringify(['REQ', subId, filter]));
      };

      ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);
        if (response[0] === 'EVENT' && response[1] === subId) {
          event = response[2];
        } else if (response[0] === 'EOSE' && response[1] === subId) {
          clearTimeout(timeout);
          ws.close();
          resolve(event);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket error'));
      };
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Check if a switch has missed its heartbeat threshold
 */
export async function checkHeartbeatStatus(
  publicKey: string,
  switchId: string,
  thresholdHours: number,
  relays?: string[]
): Promise<{
  isAlive: boolean;
  lastHeartbeat: number | null;
  hoursOverdue: number | null;
}> {
  const event = await queryLatestHeartbeat(publicKey, switchId, relays);

  if (!event) {
    return {
      isAlive: false,
      lastHeartbeat: null,
      hoursOverdue: null,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const lastHeartbeat = event.created_at;
  const thresholdSeconds = thresholdHours * 3600;
  const elapsed = now - lastHeartbeat;
  const isAlive = elapsed < thresholdSeconds;

  return {
    isAlive,
    lastHeartbeat,
    hoursOverdue: isAlive ? null : Math.floor((elapsed - thresholdSeconds) / 3600),
  };
}
