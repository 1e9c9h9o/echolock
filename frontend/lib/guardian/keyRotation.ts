/**
 * Guardian Key Rotation
 *
 * Enables rotation of guardian keys when a key is compromised.
 * The process involves:
 * 1. Generating a new key pair for the guardian
 * 2. Re-encrypting the share for the new key
 * 3. Publishing the updated share storage event
 * 4. Revoking the old share
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { encrypt as nip44Encrypt } from './nip44';
import { Guardian, GuardianInvitation, GUARDIAN_KINDS } from './types';
import { NOSTR_KINDS, UnsignedEvent, NostrEvent, DEFAULT_RELAYS } from '../nostr/types';
import { signEvent, publishHeartbeat } from '../nostr/heartbeat';
import { Share, serializeShare } from '../crypto/shamir';

/**
 * Key rotation request
 */
export interface KeyRotationRequest {
  switchId: string;
  guardianId: string;
  oldNpub: string;
  newNpub: string;
  share: Share;
  userPrivateKey: string;
  userPublicKey: string;
  thresholdHours: number;
  recipientNpubs: string[];
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  success: boolean;
  oldNpub: string;
  newNpub: string;
  revocationEventId?: string;
  newShareEventId?: string;
  error?: string;
}

/**
 * Revocation event for old guardian key
 */
export interface GuardianRevocationEvent {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}

/**
 * Create a guardian revocation event
 * This publicly announces that a guardian's key is no longer valid
 */
export function createRevocationEvent(
  userPubkey: string,
  switchId: string,
  guardianNpub: string,
  reason: 'key_rotation' | 'compromised' | 'removed'
): GuardianRevocationEvent {
  const now = Math.floor(Date.now() / 1000);

  return {
    kind: 30085, // Guardian revocation kind (proposed)
    pubkey: userPubkey,
    created_at: now,
    tags: [
      ['d', `revoke-${switchId}-${guardianNpub.slice(0, 16)}`],
      ['switch', switchId],
      ['p', guardianNpub], // The revoked guardian
      ['reason', reason],
    ],
    content: JSON.stringify({
      version: 1,
      action: 'revoke',
      reason,
      revokedAt: now,
      message: `Guardian key ${guardianNpub.slice(0, 8)}... has been revoked due to: ${reason}`,
    }),
  };
}

/**
 * Rotate a guardian's key
 * This re-encrypts the share for a new key and revokes the old one
 */
export async function rotateGuardianKey(
  request: KeyRotationRequest,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<KeyRotationResult> {
  const {
    switchId,
    guardianId,
    oldNpub,
    newNpub,
    share,
    userPrivateKey,
    userPublicKey,
    thresholdHours,
    recipientNpubs,
  } = request;

  try {
    // 1. Create revocation event for old key
    const revocationEvent = createRevocationEvent(
      userPublicKey,
      switchId,
      oldNpub,
      'key_rotation'
    );

    const signedRevocation = await signEvent(
      revocationEvent as UnsignedEvent,
      userPrivateKey
    );

    // 2. Publish revocation
    const revocationResult = await publishHeartbeat(signedRevocation, relays);

    if (revocationResult.success.length === 0) {
      throw new Error('Failed to publish revocation event');
    }

    // 3. Serialize and encrypt share for new key
    const serializedShare = serializeShare(share);
    const encryptedShare = await nip44Encrypt(
      serializedShare,
      newNpub,
      userPrivateKey
    );

    // 4. Create new share storage event
    const now = Math.floor(Date.now() / 1000);
    const shareStorageEvent: UnsignedEvent = {
      pubkey: userPublicKey,
      created_at: now,
      kind: NOSTR_KINDS.SHARE_STORAGE,
      tags: [
        ['d', `${switchId}:${share.x}`],
        ['p', newNpub],
        ['encrypted_for', newNpub],
        ['threshold_hours', thresholdHours.toString()],
        ['rotated_from', oldNpub], // Track rotation history
        ...recipientNpubs.map((r) => ['recipient', r]),
      ],
      content: encryptedShare,
    };

    const signedShareEvent = await signEvent(shareStorageEvent, userPrivateKey);

    // 5. Publish new share
    const shareResult = await publishHeartbeat(signedShareEvent, relays);

    if (shareResult.success.length === 0) {
      throw new Error('Failed to publish new share storage event');
    }

    return {
      success: true,
      oldNpub,
      newNpub,
      revocationEventId: signedRevocation.id,
      newShareEventId: signedShareEvent.id,
    };
  } catch (error) {
    return {
      success: false,
      oldNpub,
      newNpub,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a guardian key has been revoked
 */
export async function checkKeyRevocation(
  switchId: string,
  guardianNpub: string,
  userPubkey: string,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<{
  revoked: boolean;
  revokedAt?: number;
  reason?: string;
  newKey?: string;
}> {
  for (const relayUrl of relays) {
    try {
      const events = await queryRelayForRevocations(
        relayUrl,
        switchId,
        guardianNpub,
        userPubkey
      );

      if (events.length > 0) {
        // Get the most recent revocation
        const latest = events.reduce((a, b) =>
          a.created_at > b.created_at ? a : b
        );

        try {
          const content = JSON.parse(latest.content);
          return {
            revoked: true,
            revokedAt: latest.created_at,
            reason: content.reason,
          };
        } catch {
          return {
            revoked: true,
            revokedAt: latest.created_at,
          };
        }
      }
    } catch {
      // Try next relay
    }
  }

  return { revoked: false };
}

/**
 * Query relay for revocation events
 */
async function queryRelayForRevocations(
  relayUrl: string,
  switchId: string,
  guardianNpub: string,
  userPubkey: string
): Promise<Array<{ created_at: number; content: string }>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    try {
      const ws = new WebSocket(relayUrl);
      const subId = crypto.randomUUID().slice(0, 8);
      const events: Array<{ created_at: number; content: string }> = [];

      ws.onopen = () => {
        const filter = {
          kinds: [30085], // Revocation kind
          authors: [userPubkey],
          '#switch': [switchId],
          '#p': [guardianNpub],
        };
        ws.send(JSON.stringify(['REQ', subId, filter]));
      };

      ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);
        if (response[0] === 'EVENT' && response[1] === subId) {
          events.push(response[2]);
        } else if (response[0] === 'EOSE' && response[1] === subId) {
          clearTimeout(timeout);
          ws.close();
          resolve(events);
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
 * Batch rotate multiple guardian keys
 */
export async function batchRotateKeys(
  requests: KeyRotationRequest[],
  relays?: string[]
): Promise<KeyRotationResult[]> {
  const results: KeyRotationResult[] = [];

  for (const request of requests) {
    const result = await rotateGuardianKey(request, relays);
    results.push(result);

    // Small delay between rotations to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Validate a new guardian key before rotation
 */
export function validateNewGuardianKey(newNpub: string): {
  valid: boolean;
  error?: string;
} {
  // Check if valid hex (64 chars)
  if (!/^[0-9a-f]{64}$/i.test(newNpub)) {
    return {
      valid: false,
      error: 'Invalid Nostr public key format (must be 64 hex characters)',
    };
  }

  return { valid: true };
}
