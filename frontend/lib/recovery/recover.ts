/**
 * Message Recovery Module
 *
 * Recipient-side tools for recovering messages WITHOUT any server.
 * Queries Nostr relays directly for released shares and encrypted messages.
 *
 * Recovery Flow:
 * 1. Query Nostr for share release events (kind 30080) addressed to recipient
 * 2. Decrypt each share using recipient's nsec (NIP-44)
 * 3. When 3+ shares collected, reconstruct encryption key (Shamir)
 * 4. Query Nostr for encrypted message (kind 30081)
 * 5. Decrypt message with reconstructed key (AES-256-GCM)
 *
 * @see CLAUDE.md - Phase 5: Full Autonomy
 */

import {
  RecoverySession,
  ReleasedShare,
  RecoveryResult,
} from './types';
import { NOSTR_KINDS, DEFAULT_RELAYS, NostrEvent } from '../nostr/types';
import { decrypt as nip44Decrypt } from '../guardian/nip44';
import { deserializeShare, combine } from '../crypto/shamir';
import { decrypt as aesDecrypt, importKey, fromHex } from '../crypto/aes';

const THRESHOLD = 3; // Minimum shares needed

/**
 * Start a recovery session for a switch
 */
export function createRecoverySession(
  switchId: string,
  userNpub: string,
  recipientNpub: string
): RecoverySession {
  return {
    switchId,
    userNpub,
    recipientNpub,
    shares: [],
    threshold: THRESHOLD,
    status: 'collecting',
  };
}

/**
 * Query Nostr relays for released shares
 */
export async function collectReleasedShares(
  session: RecoverySession,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<ReleasedShare[]> {
  const filter = {
    kinds: [NOSTR_KINDS.SHARE_RELEASE],
    '#p': [session.recipientNpub],
  };

  const events: NostrEvent[] = [];

  // Query all relays in parallel
  const results = await Promise.allSettled(
    relays.map((relay) => queryRelay(relay, filter))
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      events.push(...result.value);
    }
  }

  // Deduplicate by event ID
  const uniqueEvents = new Map<string, NostrEvent>();
  for (const event of events) {
    uniqueEvents.set(event.id, event);
  }

  // Parse share release events
  const shares: ReleasedShare[] = [];

  for (const event of uniqueEvents.values()) {
    try {
      // Check if this is for our switch
      const dTag = event.tags.find((t) => t[0] === 'd');
      if (!dTag) continue;

      const [eventSwitchId, shareIndexStr] = dTag[1].split(':');
      if (eventSwitchId !== session.switchId) continue;

      const shareIndex = parseInt(shareIndexStr, 10);

      // Parse content (contains encrypted shares for recipients)
      const content = JSON.parse(event.content);
      const encryptedShare = content.encryptedShares?.[session.recipientNpub];

      if (!encryptedShare) continue;

      shares.push({
        guardianNpub: event.pubkey,
        shareIndex,
        encryptedShare,
        releaseEvent: event,
        timestamp: event.created_at,
      });
    } catch {
      // Skip malformed events
    }
  }

  return shares;
}

/**
 * Decrypt shares using recipient's private key
 */
export async function decryptShares(
  shares: ReleasedShare[],
  recipientPrivateKey: string
): Promise<ReleasedShare[]> {
  const decrypted: ReleasedShare[] = [];

  for (const share of shares) {
    try {
      const decryptedShare = await nip44Decrypt(
        share.encryptedShare,
        share.guardianNpub,
        recipientPrivateKey
      );

      decrypted.push({
        ...share,
        decryptedShare,
      });
    } catch (error) {
      console.error(`Failed to decrypt share from ${share.guardianNpub}:`, error);
      // Continue with other shares
    }
  }

  return decrypted;
}

/**
 * Reconstruct the encryption key from shares
 */
export function reconstructKey(
  shares: ReleasedShare[]
): Uint8Array {
  if (shares.length < THRESHOLD) {
    throw new Error(`Need ${THRESHOLD} shares, only have ${shares.length}`);
  }

  // Convert decrypted shares to Shamir format
  const shamirShares = shares
    .filter((s) => s.decryptedShare)
    .slice(0, THRESHOLD) // Only need threshold shares
    .map((s) => deserializeShare(s.decryptedShare!));

  // Reconstruct the secret (encryption key)
  return combine(shamirShares);
}

/**
 * Query Nostr for the encrypted message
 */
export async function fetchEncryptedMessage(
  switchId: string,
  userNpub: string,
  relays: string[] = [...DEFAULT_RELAYS]
): Promise<{ ciphertext: string; iv: string; authTag: string } | null> {
  const filter = {
    kinds: [NOSTR_KINDS.MESSAGE_STORAGE],
    authors: [userNpub],
    '#d': [switchId],
    limit: 1,
  };

  for (const relay of relays) {
    try {
      const events = await queryRelay(relay, filter);
      if (events && events.length > 0) {
        const content = JSON.parse(events[0].content);
        return {
          ciphertext: content.ciphertext,
          iv: content.iv,
          authTag: content.authTag,
        };
      }
    } catch {
      // Try next relay
    }
  }

  return null;
}

/**
 * Decrypt the message using the reconstructed key
 */
export async function decryptMessage(
  encryptedMessage: { ciphertext: string; iv: string; authTag: string },
  key: Uint8Array
): Promise<string> {
  // Import the key for AES-GCM
  const cryptoKey = await importKey(key);

  // Decrypt
  const plaintext = await aesDecrypt(
    fromHex(encryptedMessage.ciphertext),
    fromHex(encryptedMessage.iv),
    fromHex(encryptedMessage.authTag),
    cryptoKey
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Complete recovery process
 */
export async function recoverMessage(
  switchId: string,
  userNpub: string,
  recipientNpub: string,
  recipientPrivateKey: string,
  relays?: string[]
): Promise<RecoveryResult> {
  const session = createRecoverySession(switchId, userNpub, recipientNpub);

  try {
    // Step 1: Collect released shares
    console.log('Collecting released shares...');
    const shares = await collectReleasedShares(session, relays);
    console.log(`Found ${shares.length} shares`);

    if (shares.length < THRESHOLD) {
      return {
        success: false,
        switchId,
        error: `Not enough shares released. Need ${THRESHOLD}, found ${shares.length}`,
        sharesUsed: shares.length,
        timestamp: Date.now(),
      };
    }

    // Step 2: Decrypt shares
    console.log('Decrypting shares...');
    const decryptedShares = await decryptShares(shares, recipientPrivateKey);
    const validShares = decryptedShares.filter((s) => s.decryptedShare);
    console.log(`Decrypted ${validShares.length} shares`);

    if (validShares.length < THRESHOLD) {
      return {
        success: false,
        switchId,
        error: `Could not decrypt enough shares. Need ${THRESHOLD}, decrypted ${validShares.length}`,
        sharesUsed: validShares.length,
        timestamp: Date.now(),
      };
    }

    // Step 3: Reconstruct encryption key
    console.log('Reconstructing encryption key...');
    const encryptionKey = reconstructKey(validShares);

    // Step 4: Fetch encrypted message
    console.log('Fetching encrypted message...');
    const encryptedMessage = await fetchEncryptedMessage(switchId, userNpub, relays);

    if (!encryptedMessage) {
      return {
        success: false,
        switchId,
        error: 'Encrypted message not found on Nostr',
        sharesUsed: validShares.length,
        timestamp: Date.now(),
      };
    }

    // Step 5: Decrypt message
    console.log('Decrypting message...');
    const message = await decryptMessage(encryptedMessage, encryptionKey);

    return {
      success: true,
      switchId,
      message,
      sharesUsed: validShares.length,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      switchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      sharesUsed: 0,
      timestamp: Date.now(),
    };
  }
}

/**
 * Query a Nostr relay
 */
async function queryRelay(
  relayUrl: string,
  filter: Record<string, unknown>
): Promise<NostrEvent[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 15000);

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

      ws.onclose = () => {
        clearTimeout(timeout);
        resolve(events);
      };
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Check recovery status for a switch
 */
export async function checkRecoveryStatus(
  switchId: string,
  recipientNpub: string,
  relays?: string[]
): Promise<{
  sharesReleased: number;
  canRecover: boolean;
  guardians: string[];
}> {
  const session = createRecoverySession(switchId, '', recipientNpub);
  const shares = await collectReleasedShares(session, relays);

  return {
    sharesReleased: shares.length,
    canRecover: shares.length >= THRESHOLD,
    guardians: shares.map((s) => s.guardianNpub),
  };
}
