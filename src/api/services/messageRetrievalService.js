'use strict';

/**
 * Message Retrieval Service
 *
 * Retrieves and reconstructs messages from Nostr for database-stored switches
 * This is the production equivalent of the CLI testRelease function
 */

import { logger } from '../utils/logger.js';
import { decryptWithServiceKey } from '../utils/crypto.js';
import { decrypt } from '../../crypto/encryption.js';
import { combineAuthenticatedShares } from '../../crypto/secretSharing.js';
import { PBKDF2_ITERATIONS, zeroize } from '../../crypto/keyDerivation.js';
import crypto from 'crypto';

// Nostr imports
import { SimplePool } from 'nostr-tools';

/**
 * Retrieve message fragments from Nostr and reconstruct the original message
 * @param {Object} switchData - Switch data from database
 * @returns {Promise<Object>} { success: boolean, message?: string, error?: string }
 */
export async function retrieveAndReconstructMessage(switchData) {
  try {
    logger.info('Retrieving message from Nostr', { switchId: switchData.id });

    // Step 1: Decrypt Nostr private key from database
    const nostrPrivateKeyHex = decryptNostrPrivateKey(switchData);

    if (!nostrPrivateKeyHex) {
      throw new Error('Failed to decrypt Nostr private key');
    }

    // Step 2: Get relay URLs and validate them
    const rawRelayUrls = Array.isArray(switchData.relay_urls)
      ? switchData.relay_urls
      : JSON.parse(switchData.relay_urls || '[]');

    // SECURITY: Validate relay URLs to prevent SSRF attacks
    const relayUrls = rawRelayUrls.filter(url => {
      try {
        const parsed = new URL(url);
        // Only allow wss:// (secure WebSocket) protocol for relays
        // Block internal/private IP ranges
        if (parsed.protocol !== 'wss:') {
          logger.warn('Rejected non-wss relay URL', { url, switchId: switchData.id });
          return false;
        }
        // Block obvious internal hostnames
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.internal')) {
          logger.warn('Rejected internal relay URL', { url, switchId: switchData.id });
          return false;
        }
        return true;
      } catch {
        logger.warn('Rejected invalid relay URL', { url, switchId: switchData.id });
        return false;
      }
    });

    if (relayUrls.length === 0) {
      throw new Error('No valid relay URLs found for switch');
    }

    logger.debug('Using validated relays', { relayUrls, switchId: switchData.id });

    // Step 3: Retrieve fragments from Nostr
    const fragments = await retrieveFragmentsFromNostr(
      nostrPrivateKeyHex,
      relayUrls,
      switchData.nostr_public_key
    );

    if (fragments.length === 0) {
      throw new Error('No fragments retrieved from Nostr relays');
    }

    logger.info(`Retrieved ${fragments.length} fragments from Nostr`, {
      switchId: switchData.id
    });

    // Step 4: Decrypt auth key
    const authKeyHex = decryptAuthKey(switchData);

    if (!authKeyHex) {
      throw new Error('Failed to decrypt auth key');
    }

    // Step 5: Verify and reconstruct authenticated shares
    const validAuthenticatedShares = [];
    const fragmentSalt = switchData.fragment_encryption_salt;

    for (const fragment of fragments) {
      try {
        // Decrypt the fragment to get authenticated share
        const authenticatedShare = decryptFragment(fragment, fragmentSalt, authKeyHex);

        if (authenticatedShare) {
          validAuthenticatedShares.push(authenticatedShare);
        }
      } catch (err) {
        logger.warn('Failed to decrypt fragment', {
          fragmentId: fragment.id?.substring(0, 8),
          error: err.message
        });
      }
    }

    if (validAuthenticatedShares.length < 3) {
      throw new Error(`Insufficient shares: need at least 3, got ${validAuthenticatedShares.length}`);
    }

    logger.info(`Reconstructing from ${validAuthenticatedShares.length} valid shares`, {
      switchId: switchData.id
    });

    // Step 6: Verify HMACs and reconstruct encryption key
    const authKeyBuffer = Buffer.from(authKeyHex, 'hex');
    const reconstructedKey = await combineAuthenticatedShares(validAuthenticatedShares, authKeyBuffer);

    let reconstructedMessage;
    try {
      // Step 7: Decrypt the message with reconstructed key
      const ciphertext = Buffer.from(switchData.encrypted_message_ciphertext, 'base64');
      const iv = Buffer.from(switchData.encrypted_message_iv, 'base64');
      const authTag = Buffer.from(switchData.encrypted_message_auth_tag, 'base64');

      const decryptedMessage = decrypt(ciphertext, reconstructedKey, iv, authTag);
      reconstructedMessage = decryptedMessage.toString('utf8');
    } finally {
      // SECURITY: Zeroize sensitive key material
      zeroize(reconstructedKey);
      zeroize(authKeyBuffer);
    }

    logger.info('Message reconstructed successfully', {
      switchId: switchData.id,
      messageLength: reconstructedMessage.length
    });

    return {
      success: true,
      message: reconstructedMessage,
      sharesUsed: validAuthenticatedShares.length
    };

  } catch (error) {
    logger.error('Failed to retrieve and reconstruct message', {
      switchId: switchData.id,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Decrypt Nostr private key from database storage
 */
function decryptNostrPrivateKey(switchData) {
  try {
    if (!switchData.nostr_private_key_encrypted) {
      return null;
    }

    // The encrypted data is stored as: ciphertext,iv,authTag
    const parts = switchData.nostr_private_key_encrypted.split(',');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted Nostr private key format');
    }

    const decrypted = decryptWithServiceKey(parts[0], parts[1], parts[2]);

    return decrypted.toString('hex');
  } catch (error) {
    logger.error('Failed to decrypt Nostr private key', { error: error.message });
    return null;
  }
}

/**
 * Decrypt auth key from database storage
 */
function decryptAuthKey(switchData) {
  try {
    if (!switchData.auth_key_encrypted) {
      return null;
    }

    // The encrypted data is stored as: ciphertext,iv,authTag
    const parts = switchData.auth_key_encrypted.split(',');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted auth key format');
    }

    const decrypted = decryptWithServiceKey(parts[0], parts[1], parts[2]);

    return decrypted.toString('hex');
  } catch (error) {
    logger.error('Failed to decrypt auth key', { error: error.message });
    return null;
  }
}

/**
 * Retrieve fragments from Nostr relays
 */
async function retrieveFragmentsFromNostr(privateKeyHex, relayUrls, publicKeyHex) {
  const pool = new SimplePool();
  const fragments = [];

  try {
    // Convert keys to proper format
    const pubkey = publicKeyHex;

    logger.debug('Querying Nostr relays for fragments', {
      pubkey: pubkey.substring(0, 8) + '...',
      relayCount: relayUrls.length
    });

    // Query for events
    const events = await pool.querySync(relayUrls, {
      kinds: [1],
      authors: [pubkey],
      limit: 100
    });

    logger.debug(`Found ${events.length} events from Nostr`);

    // Filter for fragment events (they have "fragment" in content)
    for (const event of events) {
      try {
        const content = JSON.parse(event.content);

        if (content.type === 'fragment' && content.data) {
          fragments.push({
            id: event.id,
            data: content.data,
            index: content.index,
            timestamp: event.created_at
          });
        }
      } catch (err) {
        // Not a fragment event, skip
        continue;
      }
    }

    logger.info(`Retrieved ${fragments.length} fragment events`);

    return fragments;

  } catch (error) {
    logger.error('Error retrieving from Nostr', { error: error.message });
    return [];
  } finally {
    pool.close(relayUrls);
  }
}

/**
 * Decrypt a single fragment to get authenticated share
 * Returns the authenticated share object: { share, hmac, index }
 */
function decryptFragment(fragment, salt, authKeyHex) {
  try {
    // Fragment data is base64 encoded: iv:authTag:ciphertext
    const decoded = Buffer.from(fragment.data, 'base64').toString('utf8');
    const [ivHex, authTagHex, ciphertextHex] = decoded.split(':');

    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error('Invalid fragment format');
    }

    // Derive encryption key from auth key and salt using OWASP-recommended iterations
    const key = crypto.pbkdf2Sync(
      Buffer.from(authKeyHex, 'hex'),
      Buffer.from(salt, 'hex'),
      PBKDF2_ITERATIONS,
      32,
      'sha256'
    );

    let decrypted;
    try {
      // Decrypt using AES-256-GCM
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivHex, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      decrypted = decipher.update(Buffer.from(ciphertextHex, 'hex'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
    } finally {
      // SECURITY: Always zeroize derived key
      zeroize(key);
    }

    // Decrypted data should be JSON: { share, hmac, index }
    const authenticatedShare = JSON.parse(decrypted.toString('utf8'));

    // Convert hex strings back to Buffers
    return {
      share: Buffer.from(authenticatedShare.share, 'hex'),
      hmac: Buffer.from(authenticatedShare.hmac, 'hex'),
      index: authenticatedShare.index
    };

  } catch (error) {
    logger.debug('Fragment decryption failed', {
      fragmentId: fragment.id?.substring(0, 8),
      error: error.message
    });
    return null;
  }
}
