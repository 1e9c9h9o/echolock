/**
 * Guardian Enrollment Protocol
 *
 * Handles the distribution of Shamir shares to guardians.
 * Each share is encrypted to the guardian's public key.
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { encrypt as nip44Encrypt } from './nip44';
import {
  Guardian,
  GuardianInvitation,
  ShareStorageEventData,
  GUARDIAN_KINDS,
} from './types';
import {
  NOSTR_KINDS,
  UnsignedEvent,
  NostrEvent,
  DEFAULT_RELAYS,
} from '../nostr/types';
import { signEvent, publishHeartbeat } from '../nostr/heartbeat';
import { Share, serializeShare } from '../crypto/shamir';
import { toHex } from '../crypto/aes';

/**
 * Create a guardian enrollment with encrypted share
 */
export async function createGuardianEnrollment(
  switchId: string,
  share: Share,
  guardian: Guardian,
  userPrivateKey: string,
  userPublicKey: string,
  thresholdHours: number,
  recipientNpubs: string[]
): Promise<GuardianInvitation> {
  // Serialize the share
  const serializedShare = serializeShare(share);

  // Encrypt share for guardian using NIP-44
  const encryptedShare = await nip44Encrypt(
    serializedShare,
    guardian.npub,
    userPrivateKey
  );

  const invitation: GuardianInvitation = {
    id: crypto.randomUUID(),
    switchId,
    guardianNpub: guardian.npub,
    shareIndex: share.x,
    encryptedShare,
    thresholdHours,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    recipientNpubs,
  };

  return invitation;
}

/**
 * Create and publish a share storage event (kind 30079)
 */
export async function publishShareStorageEvent(
  invitation: GuardianInvitation,
  userPrivateKey: string,
  userPublicKey: string,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<{ event: NostrEvent; publishResult: { success: string[]; failed: string[] } }> {
  const now = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ['d', `${invitation.switchId}:${invitation.shareIndex}`],
    ['p', invitation.guardianNpub],
    ['encrypted_for', invitation.guardianNpub],
    ['threshold_hours', invitation.thresholdHours.toString()],
  ];

  // Add recipient tags for discovery
  for (const recipient of invitation.recipientNpubs) {
    tags.push(['recipient', recipient]);
  }

  const unsigned: UnsignedEvent = {
    pubkey: userPublicKey,
    created_at: now,
    kind: NOSTR_KINDS.SHARE_STORAGE,
    tags,
    content: invitation.encryptedShare,
  };

  // Sign with user's private key
  const signedEvent = await signEvent(unsigned, userPrivateKey);

  // Publish to relays
  const publishResult = await publishHeartbeat(signedEvent, relays);

  return { event: signedEvent, publishResult };
}

/**
 * Enroll multiple guardians at once
 */
export async function enrollGuardians(
  switchId: string,
  shares: Share[],
  guardians: Guardian[],
  userPrivateKey: string,
  userPublicKey: string,
  thresholdHours: number,
  recipientNpubs: string[],
  relays?: string[]
): Promise<{
  enrollments: GuardianInvitation[];
  publishResults: Map<string, { success: string[]; failed: string[] }>;
}> {
  if (shares.length !== guardians.length) {
    throw new Error('Number of shares must match number of guardians');
  }

  const enrollments: GuardianInvitation[] = [];
  const publishResults = new Map<string, { success: string[]; failed: string[] }>();

  for (let i = 0; i < guardians.length; i++) {
    const guardian = guardians[i];
    const share = shares[i];

    // Create enrollment
    const invitation = await createGuardianEnrollment(
      switchId,
      share,
      guardian,
      userPrivateKey,
      userPublicKey,
      thresholdHours,
      recipientNpubs
    );

    // Publish to Nostr
    const { publishResult } = await publishShareStorageEvent(
      invitation,
      userPrivateKey,
      userPublicKey,
      relays
    );

    enrollments.push(invitation);
    publishResults.set(guardian.id, publishResult);
  }

  return { enrollments, publishResults };
}

/**
 * Query for guardian acknowledgments
 */
export async function queryGuardianAcks(
  switchId: string,
  guardianNpubs: string[],
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<Map<string, boolean>> {
  const acks = new Map<string, boolean>();

  for (const guardianNpub of guardianNpubs) {
    acks.set(guardianNpub, false);
  }

  // Query each relay for ACK events
  for (const relayUrl of relays) {
    try {
      const events = await queryRelayForEvents(relayUrl, {
        kinds: [NOSTR_KINDS.GUARDIAN_ACK],
        '#d': guardianNpubs.map((npub) => `${switchId}:${npub}`),
      });

      for (const event of events) {
        const guardianNpub = event.pubkey;
        if (guardianNpubs.includes(guardianNpub)) {
          try {
            const data = JSON.parse(event.content);
            if (data.accepted && data.switchId === switchId) {
              acks.set(guardianNpub, true);
            }
          } catch {
            // Invalid event content
          }
        }
      }
    } catch {
      // Relay error, try next
    }
  }

  return acks;
}

/**
 * Query a relay for events
 */
async function queryRelayForEvents(
  relayUrl: string,
  filter: Record<string, unknown>
): Promise<NostrEvent[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    try {
      const ws = new WebSocket(relayUrl);
      const subId = crypto.randomUUID().slice(0, 8);
      const events: NostrEvent[] = [];

      ws.onopen = () => {
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
 * Generate a shareable invitation link for a guardian
 */
export function generateInvitationLink(
  invitation: GuardianInvitation,
  baseUrl: string = 'https://echolock.xyz'
): string {
  const params = new URLSearchParams({
    id: invitation.id,
    switch: invitation.switchId,
    share: invitation.shareIndex.toString(),
  });

  return `${baseUrl}/guardian/accept?${params.toString()}`;
}

/**
 * Validate a guardian's public key
 */
export function validateGuardianNpub(npub: string): boolean {
  // Check if valid hex (64 chars)
  if (!/^[0-9a-f]{64}$/i.test(npub)) {
    return false;
  }
  return true;
}

/**
 * Get default guardians (EchoLock service)
 */
export function getDefaultGuardians(): Guardian[] {
  // EchoLock runs institutional guardians as a convenience
  // Users can replace these with their own
  return [
    {
      id: 'echolock-guardian-1',
      type: 'institutional',
      name: 'EchoLock Guardian 1',
      npub: '0000000000000000000000000000000000000000000000000000000000000001', // Placeholder
      status: 'pending',
      shareIndex: 1,
      metadata: {
        relayUrls: DEFAULT_RELAYS.slice(0, 3) as string[],
      },
    },
    {
      id: 'echolock-guardian-2',
      type: 'institutional',
      name: 'EchoLock Guardian 2',
      npub: '0000000000000000000000000000000000000000000000000000000000000002', // Placeholder
      status: 'pending',
      shareIndex: 2,
      metadata: {
        relayUrls: DEFAULT_RELAYS.slice(0, 3) as string[],
      },
    },
  ];
}
