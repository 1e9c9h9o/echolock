'use strict';

// ECHOLOCK Dead Man's Switch Core Implementation
// Orchestrates encryption, secret sharing, and timed release

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  splitAndAuthenticateSecret,
  combineAuthenticatedShares,
  deriveAuthenticationKey
} from '../crypto/secretSharing.js';
import { encrypt, decrypt } from '../crypto/encryption.js';
import {
  deriveKey,
  deriveKeyHierarchy,
  reconstructKeyHierarchy,
  PBKDF2_ITERATIONS,
  zeroize,
  secureRandomBytes
} from '../crypto/keyDerivation.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import {
  getCurrentBlockHeight,
  getTimelockStatus
} from '../bitcoin/testnetClient.js';
import {
  createTimelockSetup,
  checkTimelockValidity
} from '../bitcoin/timelockScript.js';
import { loadConfig } from './config.js';
import { publishFragment, retrieveFragments } from '../nostr/multiRelayClient.js';
import { filterHealthyRelays } from '../nostr/relayHealthCheck.js';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  permissionlessCheckIn,
  verifySwitchExpiry,
  getNostrPubkey
} from '../nostr/heartbeat.js';

const ECPair = ECPairFactory(ecc);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const SWITCHES_FILE = path.join(projectRoot, 'data/switches.json');
const FRAGMENTS_FILE = path.join(projectRoot, 'data/fragments.json');

/**
 * Load switches database
 */
function loadSwitches() {
  if (!fs.existsSync(SWITCHES_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(SWITCHES_FILE, 'utf8'));
}

/**
 * Save switches database (atomic write to prevent corruption)
 */
function saveSwitches(switches) {
  const tmpFile = SWITCHES_FILE + '.tmp';
  const data = JSON.stringify(switches, null, 2);
  fs.writeFileSync(tmpFile, data, 'utf8');
  fs.renameSync(tmpFile, SWITCHES_FILE);
}

/**
 * Load fragments database
 */
function loadFragments() {
  if (!fs.existsSync(FRAGMENTS_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(FRAGMENTS_FILE, 'utf8'));
}

/**
 * Save fragments database (atomic write to prevent corruption)
 */
function saveFragments(fragments) {
  const tmpFile = FRAGMENTS_FILE + '.tmp';
  const data = JSON.stringify(fragments, null, 2);
  fs.writeFileSync(tmpFile, data, 'utf8');
  fs.renameSync(tmpFile, FRAGMENTS_FILE);
}

/**
 * Create a new dead man's switch
 * @param {string} message - The secret message to protect
 * @param {number} checkInHours - Hours until release (default 72)
 * @param {boolean} useBitcoinTimelock - Enable Bitcoin timelock integration (default true)
 * @param {string} password - Password for encrypting Bitcoin private key (required if useBitcoinTimelock is true)
 * @returns {Object} { switchId, expiryTime, fragmentCount, bitcoin }
 */
export async function createSwitch(message, checkInHours = 72, useBitcoinTimelock = true, password = null) {
  const config = loadConfig();
  const switchId = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const expiryTime = now + (checkInHours * 60 * 60 * 1000);
  const expiryTimestamp = Math.floor(expiryTime / 1000);

  // 1. Generate encryption key (256 bits) with entropy validation
  const encryptionKey = secureRandomBytes(32);

  // 2. Encrypt the message
  const messageBuffer = Buffer.from(message, 'utf8');
  const { ciphertext, iv, authTag } = encrypt(messageBuffer, encryptionKey);

  // 3. Split encryption key using Shamir and authenticate with HMAC (3-of-5)
  const { shares: authenticatedShares, authKey } = await splitAndAuthenticateSecret(
    encryptionKey,
    5,
    3
  );

  // SECURITY: Zeroize encryption key - it's now split into shares
  zeroize(encryptionKey);

  // 4. Create Bitcoin timelock (if enabled)
  let bitcoinTimelock = null;
  let bitcoinKeyHierarchy = null; // Store for reuse in Nostr section

  if (useBitcoinTimelock) {
    // Validate password is provided
    if (!password) {
      throw new Error('Password is required for Bitcoin timelock mode');
    }

    try {
      const currentHeight = await getCurrentBlockHeight();

      // Calculate blocks until expiry (~10 min per block)
      const hoursToBlocks = Math.ceil((checkInHours * 60) / 10);
      const timelockHeight = currentHeight + hoursToBlocks;

      // Generate Bitcoin keypair with entropy validation
      const randomPrivateKey = secureRandomBytes(32);
      const keyPair = ECPair.fromPrivateKey(randomPrivateKey, { network: bitcoin.networks.testnet });
      const publicKey = keyPair.publicKey;

      // NEW: Use hierarchical key derivation for Bitcoin key encryption
      // This binds the Bitcoin key to the specific switchId
      bitcoinKeyHierarchy = deriveKeyHierarchy(password, switchId);
      const bitcoinEncryptionKey = bitcoinKeyHierarchy.bitcoinKey;

      // Encrypt the private key using context-bound bitcoinKey
      const privateKeyBuffer = Buffer.from(randomPrivateKey);
      const { ciphertext: encryptedPrivateKey, iv: privateKeyIV, authTag: privateKeyAuthTag } =
        encrypt(privateKeyBuffer, bitcoinEncryptionKey);

      // SECURITY: Zeroize sensitive key material after encryption
      zeroize(randomPrivateKey);
      zeroize(privateKeyBuffer);
      zeroize(bitcoinEncryptionKey);

      // Create timelock setup with SegWit address (lower fees)
      const timelockSetup = createTimelockSetup(timelockHeight, publicKey, { useSegWit: true });

      bitcoinTimelock = {
        enabled: true,
        keyVersion: 2, // Indicates hierarchical key derivation
        currentHeight,
        timelockHeight,
        blocksUntilValid: timelockHeight - currentHeight,
        address: timelockSetup.address,
        addressType: timelockSetup.addressType, // P2WSH (SegWit)
        script: timelockSetup.script,
        scriptAsm: timelockSetup.scriptAsm,
        publicKey: publicKey.toString('hex'),
        // Store encrypted private key (key derived from password + switchId)
        encryptedPrivateKey: encryptedPrivateKey.toString('base64'),
        privateKeyIV: privateKeyIV.toString('base64'),
        privateKeyAuthTag: privateKeyAuthTag.toString('base64'),
        privateKeySalt: bitcoinKeyHierarchy.salt.toString('base64'),
        unlockEstimate: timelockSetup.unlockEstimate,
        network: timelockSetup.network,
        status: 'pending',
        createdAt: now
      };
    } catch (error) {
      console.warn('Bitcoin timelock creation failed:', error.message);
      bitcoinTimelock = {
        enabled: false,
        error: error.message
      };
    }
  }

  // 5. Store encrypted message and metadata
  const switches = loadSwitches();
  switches[switchId] = {
    id: switchId,
    createdAt: now,
    expiryTime: expiryTime,
    checkInHours: checkInHours,
    lastCheckIn: now,
    checkInCount: 0,
    status: 'ARMED',
    encryptedMessage: {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    },
    fragmentCount: 5,
    requiredFragments: 3,
    bitcoinTimelock: bitcoinTimelock
  };
  saveSwitches(switches);

  // 6. Distribute fragments to Nostr relays or store locally
  let distributionInfo;
  if (config.nostr.useNostrDistribution) {
    try {
      // Generate Nostr keypair for signing events
      const nostrPrivateKey = generateSecretKey();
      const nostrPublicKey = getPublicKey(nostrPrivateKey);

      // Filter healthy relays
      const healthyRelays = await filterHealthyRelays(config.nostr.relays);

      // Key derivation: Use hierarchical HKDF when password is provided
      let fragmentEncryptionSalt;
      let fragmentEncryptionKey;
      let nostrEncryptionKey;
      let keyVersion;

      if (password) {
        // NEW: Use hierarchical key derivation for context binding
        // This ensures each switch has cryptographically unique keys
        const keyHierarchy = deriveKeyHierarchy(password, switchId);

        fragmentEncryptionKey = keyHierarchy.encryptionKey;
        fragmentEncryptionSalt = keyHierarchy.salt;
        nostrEncryptionKey = keyHierarchy.nostrKey;
        keyVersion = 2; // Hierarchical HKDF

        // Zeroize fragment keys after use (they're derived, not stored)
        // Note: We keep encryptionKey and nostrKey for use below
      } else {
        // Legacy: Random key if no password provided (with entropy validation)
        fragmentEncryptionKey = secureRandomBytes(32);
        fragmentEncryptionSalt = secureRandomBytes(32);
        nostrEncryptionKey = null;
        keyVersion = 1;
      }

      // Publish each authenticated share (encrypted) to multiple relays
      const publishResults = [];
      for (let i = 0; i < authenticatedShares.length; i++) {
        const authShare = authenticatedShares[i];

        // Serialize authenticated share (share + HMAC + index)
        const shareData = Buffer.concat([
          authShare.share,
          authShare.hmac,
          Buffer.from([authShare.index])
        ]);

        // Encrypt the authenticated share
        const encryptedShare = encrypt(shareData, fragmentEncryptionKey);

        // Publish with atomic storage format
        const result = await publishFragment(
          switchId,
          i,
          encryptedShare, // { ciphertext, iv, authTag }
          { salt: fragmentEncryptionSalt, iterations: PBKDF2_ITERATIONS }, // metadata
          { privkey: nostrPrivateKey, pubkey: nostrPublicKey },
          healthyRelays,
          expiryTimestamp
        );
        publishResults.push(result);
      }

      distributionInfo = {
        distributionStatus: 'NOSTR',
        relayCount: healthyRelays.length,
        publishResults,
        nostrPublicKey: Buffer.from(nostrPublicKey).toString('hex')
      };

      // Store Nostr metadata including encryption info
      const encryptedAuthKeyData = encrypt(authKey, fragmentEncryptionKey);

      // SECURITY: Encrypt Nostr private key instead of storing plaintext
      let encryptedNostrKey = null;
      if (nostrEncryptionKey) {
        const nostrKeyData = encrypt(Buffer.from(nostrPrivateKey), nostrEncryptionKey);
        encryptedNostrKey = {
          ciphertext: nostrKeyData.ciphertext.toString('base64'),
          iv: nostrKeyData.iv.toString('base64'),
          authTag: nostrKeyData.authTag.toString('base64')
        };
        zeroize(nostrEncryptionKey);
      }

      const fragments = loadFragments();
      fragments[switchId] = {
        distributionStatus: 'NOSTR',
        keyVersion: keyVersion, // 1 = legacy, 2 = hierarchical HKDF
        relayCount: healthyRelays.length,
        relays: healthyRelays,
        nostrPublicKey: Buffer.from(nostrPublicKey).toString('hex'),
        // SECURITY: Only store encrypted Nostr key in v2, plaintext in v1 (legacy)
        nostrPrivateKey: keyVersion === 1 ? Buffer.from(nostrPrivateKey).toString('hex') : null,
        encryptedNostrKey: encryptedNostrKey,
        // Store encrypted authKey for HMAC verification during retrieval
        encryptedAuthKey: {
          ciphertext: encryptedAuthKeyData.ciphertext.toString('base64'),
          iv: encryptedAuthKeyData.iv.toString('base64'),
          authTag: encryptedAuthKeyData.authTag.toString('base64')
        },
        fragmentEncryptionSalt: fragmentEncryptionSalt.toString('base64'),
        hasPassword: !!password
      };
      saveFragments(fragments);

      // Zeroize fragment encryption key
      zeroize(fragmentEncryptionKey);

      console.log(`Fragments published to ${healthyRelays.length} Nostr relays`);
    } catch (error) {
      console.warn('Nostr distribution failed, falling back to local storage:', error.message);
      // Fallback to local storage
      distributionInfo = await storeFragmentsLocally(switchId, authenticatedShares, authKey);
    }
  } else {
    // Store locally
    distributionInfo = await storeFragmentsLocally(switchId, authenticatedShares, authKey);
  }

  return {
    switchId,
    expiryTime,
    fragmentCount: 5,
    requiredFragments: 3,
    checkInHours,
    bitcoin: bitcoinTimelock,
    distribution: distributionInfo
  };
}

/**
 * Store fragments locally (fallback or demo mode)
 * @param {string} switchId - The switch ID
 * @param {Array} authenticatedShares - The authenticated Shamir shares
 * @param {Buffer} authKey - Authentication key for HMAC verification
 * @returns {Object} Distribution info
 */
async function storeFragmentsLocally(switchId, authenticatedShares, authKey) {
  const fragments = loadFragments();
  fragments[switchId] = {
    shares: authenticatedShares.map(authShare => ({
      share: authShare.share.toString('base64'),
      hmac: authShare.hmac.toString('base64'),
      index: authShare.index
    })),
    authKey: authKey.toString('base64'),
    distributionStatus: 'LOCAL',
    relayCount: 0
  };
  saveFragments(fragments);

  return {
    distributionStatus: 'LOCAL',
    relayCount: 0
  };
}

/**
 * Perform check-in to reset timer
 * @param {string} switchId - The switch ID
 * @returns {Object} { success, newExpiryTime, message }
 */
export function checkIn(switchId) {
  const switches = loadSwitches();
  const sw = switches[switchId];

  if (!sw) {
    return { success: false, message: 'Switch not found' };
  }

  if (sw.status === 'TRIGGERED') {
    return { success: false, message: 'Switch already triggered' };
  }

  const now = Date.now();
  const newExpiryTime = now + (sw.checkInHours * 60 * 60 * 1000);

  sw.expiryTime = newExpiryTime;
  sw.lastCheckIn = now;
  sw.checkInCount += 1;
  sw.status = 'ARMED';

  if (!sw.checkInHistory) {
    sw.checkInHistory = [];
  }
  sw.checkInHistory.push({
    timestamp: now,
    timeRemaining: sw.expiryTime - now
  });

  saveSwitches(switches);

  return {
    success: true,
    newExpiryTime,
    checkInCount: sw.checkInCount,
    message: 'Check-in successful'
  };
}

/**
 * Get status of a switch
 * @param {string} switchId - The switch ID
 * @param {boolean} includeBitcoinStatus - Fetch live Bitcoin status (default false)
 * @returns {Promise<Object>} Status information
 */
export async function getStatus(switchId, includeBitcoinStatus = false) {
  const switches = loadSwitches();
  const sw = switches[switchId];

  if (!sw) {
    return {
      found: false,
      message: 'Switch not found',
      status: 'UNKNOWN',
      timeRemaining: 0,
      checkInCount: 0,
      checkInHours: 0,
      distributionStatus: 'UNKNOWN'
    };
  }

  const now = Date.now();
  const timeRemaining = Math.max(0, sw.expiryTime - now);
  const isExpired = timeRemaining === 0;

  // Update status if expired
  if (isExpired && sw.status !== 'TRIGGERED') {
    sw.status = 'TRIGGERED';
    saveSwitches(switches);
  }

  const fragments = loadFragments();
  const fragmentInfo = fragments[switchId];

  // Fetch live Bitcoin timelock status if requested
  let bitcoinStatus = sw.bitcoinTimelock || null;
  if (includeBitcoinStatus && sw.bitcoinTimelock?.enabled) {
    try {
      const currentHeight = await getCurrentBlockHeight();
      const validity = checkTimelockValidity(sw.bitcoinTimelock.timelockHeight, currentHeight);

      bitcoinStatus = {
        ...sw.bitcoinTimelock,
        currentHeight,
        blocksRemaining: validity.blocksRemaining || 0,
        estimatedTimeRemaining: validity.estimatedTimeRemaining || 0,
        isValid: validity.isValid,
        validityReason: validity.reason,
        lastChecked: Date.now()
      };
    } catch (error) {
      bitcoinStatus = {
        ...sw.bitcoinTimelock,
        error: `Status check failed: ${error.message}`
      };
    }
  }

  return {
    found: true,
    switchId: sw.id,
    status: sw.status || 'UNKNOWN',
    createdAt: sw.createdAt || Date.now(),
    expiryTime: sw.expiryTime || Date.now(),
    timeRemaining,
    isExpired,
    lastCheckIn: sw.lastCheckIn || Date.now(),
    checkInCount: sw.checkInCount || 0,
    checkInHours: sw.checkInHours || 72,
    fragmentCount: sw.fragmentCount || 5,
    requiredFragments: sw.requiredFragments || 3,
    distributionStatus: fragmentInfo?.distributionStatus || 'UNKNOWN',
    bitcoin: bitcoinStatus
  };
}

/**
 * Test release - reconstruct and decrypt message
 * @param {string} switchId - The switch ID
 * @param {string} password - Password for decrypting Bitcoin private key (optional)
 * @param {boolean} dryRun - If true, create Bitcoin tx but don't sign (default: true)
 * @returns {Object} { success, message, reconstructedMessage, bitcoinTx }
 */
export async function testRelease(switchId, password = null, dryRun = true) {
  const config = loadConfig();
  const switches = loadSwitches();
  const sw = switches[switchId];

  if (!sw) {
    return { success: false, message: 'Switch not found' };
  }

  const fragments = loadFragments();
  const fragmentInfo = fragments[switchId];

  if (!fragmentInfo) {
    return { success: false, message: 'Fragments not found' };
  }

  try {
    let bitcoinTxResult = null;

    // 1. Check Bitcoin timelock validity FIRST (if enabled)
    if (sw.bitcoinTimelock?.enabled) {
      const { verifyTimelockValidity, createTimelockSpendingTx, decryptPrivateKey } =
        await import('../bitcoin/timelockSpender.js');

      // Verify timelock is valid
      const timelockCheck = await verifyTimelockValidity(sw.bitcoinTimelock.timelockHeight);

      if (!timelockCheck.isValid) {
        return {
          success: false,
          message: `Bitcoin timelock not yet valid: ${timelockCheck.reason}`,
          bitcoinStatus: timelockCheck
        };
      }

      // If password provided, attempt to create spending transaction
      if (password) {
        try {
          // Decrypt private key
          const privateKey = await decryptPrivateKey(sw.bitcoinTimelock, password);
          const publicKey = Buffer.from(sw.bitcoinTimelock.publicKey, 'hex');

          // Create spending transaction (dry run by default)
          bitcoinTxResult = await createTimelockSpendingTx({
            timelockAddress: sw.bitcoinTimelock.address,
            timelockScript: sw.bitcoinTimelock.script,
            locktime: sw.bitcoinTimelock.timelockHeight,
            privateKey,
            publicKey,
            destinationAddress: sw.bitcoinTimelock.address, // Send back to same address for demo
            dryRun
          });

          console.log('Bitcoin transaction created successfully (dry run)');
        } catch (btcError) {
          console.warn('Bitcoin transaction creation failed:', btcError.message);
          bitcoinTxResult = {
            success: false,
            error: btcError.message
          };
        }
      } else {
        console.log('No password provided - skipping Bitcoin transaction creation');
      }
    }

    let authenticatedShares;
    let authKey;

    // 2. Retrieve and decrypt fragments from Nostr or local storage
    if (fragmentInfo.distributionStatus === 'NOSTR') {
      console.log('Retrieving fragments from Nostr relays...');
      const relays = fragmentInfo.relays || config.nostr.relays;
      const retrievedFragments = await retrieveFragments(switchId, relays);

      if (retrievedFragments.length < 3) {
        return {
          success: false,
          message: `Insufficient fragments retrieved. Required: 3, Found: ${retrievedFragments.length}`
        };
      }

      console.log(`Retrieved ${retrievedFragments.length} fragments from Nostr relays`);

      // Derive/reconstruct fragment encryption key
      let fragmentEncryptionKey;
      let nostrDecryptionKey = null;

      if (fragmentInfo.hasPassword) {
        if (!password) {
          return {
            success: false,
            message: 'Password required to decrypt fragments'
          };
        }

        const fragmentSalt = Buffer.from(fragmentInfo.fragmentEncryptionSalt, 'base64');
        const keyVersion = fragmentInfo.keyVersion || 1;

        if (keyVersion === 2) {
          // NEW: Use hierarchical key derivation for context-bound keys
          const keyHierarchy = reconstructKeyHierarchy(password, switchId, fragmentSalt);
          fragmentEncryptionKey = keyHierarchy.encryptionKey;
          nostrDecryptionKey = keyHierarchy.nostrKey;

          // Zeroize keys we don't need
          zeroize(keyHierarchy.authKey);
          zeroize(keyHierarchy.bitcoinKey);
          keyHierarchy.fragmentKeys.forEach(k => zeroize(k));
        } else {
          // Legacy: flat PBKDF2 derivation
          fragmentEncryptionKey = deriveKey(password, fragmentSalt).key;
        }
      } else {
        return {
          success: false,
          message: 'Fragment encryption not yet implemented for passwordless mode'
        };
      }

      // Decrypt authKey
      const encryptedAuthKey = fragmentInfo.encryptedAuthKey;
      authKey = decrypt(
        Buffer.from(encryptedAuthKey.ciphertext, 'base64'),
        fragmentEncryptionKey,
        Buffer.from(encryptedAuthKey.iv, 'base64'),
        Buffer.from(encryptedAuthKey.authTag, 'base64')
      );

      // Decrypt and deserialize authenticated shares
      authenticatedShares = [];
      for (let i = 0; i < Math.min(3, retrievedFragments.length); i++) {
        const frag = retrievedFragments[i];

        // Decrypt share data
        const decryptedShareData = decrypt(
          frag.encryptedData.ciphertext,
          fragmentEncryptionKey,
          frag.encryptedData.iv,
          frag.encryptedData.authTag
        );

        // Deserialize: share (32 bytes) + hmac (32 bytes) + index (1 byte)
        const share = decryptedShareData.slice(0, 32);
        const hmac = decryptedShareData.slice(32, 64);
        const index = decryptedShareData[64];

        authenticatedShares.push({ share, hmac, index });
      }
    } else {
      // Local storage - shares are already authenticated
      authKey = Buffer.from(fragmentInfo.authKey, 'base64');
      authenticatedShares = fragmentInfo.shares
        .slice(0, 3)
        .map(s => ({
          share: Buffer.from(s.share, 'base64'),
          hmac: Buffer.from(s.hmac, 'base64'),
          index: s.index
        }));
    }

    // 3. Verify HMAC and reconstruct encryption key from authenticated shares
    const reconstructedKey = await combineAuthenticatedShares(authenticatedShares, authKey);
    console.log('✓ Share HMAC verification passed');

    let message;
    try {
      // 4. Decrypt the message
      const ciphertext = Buffer.from(sw.encryptedMessage.ciphertext, 'base64');
      const iv = Buffer.from(sw.encryptedMessage.iv, 'base64');
      const authTag = Buffer.from(sw.encryptedMessage.authTag, 'base64');

      const decryptedMessage = decrypt(ciphertext, reconstructedKey, iv, authTag);
      message = decryptedMessage.toString('utf8');
    } finally {
      // SECURITY: Zeroize all sensitive key material
      zeroize(reconstructedKey);
      zeroize(authKey);
    }

    // 5. Update status
    sw.status = 'RELEASED';
    sw.releasedAt = Date.now();
    saveSwitches(switches);

    return {
      success: true,
      message: 'Message successfully reconstructed',
      reconstructedMessage: message,
      sharesUsed: 3,
      totalShares: 5,
      distributionMethod: fragmentInfo.distributionStatus,
      bitcoinTx: bitcoinTxResult
    };
  } catch (error) {
    return {
      success: false,
      message: `Reconstruction failed: ${error.message}`
    };
  }
}

/**
 * List all switches
 * @returns {Array} List of switch summaries
 */
export function listSwitches() {
  const switches = loadSwitches();
  const now = Date.now();

  return Object.values(switches).map(sw => ({
    id: sw.id,
    status: sw.status,
    timeRemaining: Math.max(0, sw.expiryTime - now),
    checkInCount: sw.checkInCount,
    createdAt: sw.createdAt
  }));
}

/**
 * Delete a switch
 * @param {string} switchId - The switch ID
 */
export function deleteSwitch(switchId) {
  const switches = loadSwitches();
  const fragments = loadFragments();

  delete switches[switchId];
  delete fragments[switchId];

  saveSwitches(switches);
  saveFragments(fragments);

  return { success: true };
}

// ============================================================================
// PERMISSIONLESS CHECK-IN (NOSTR HEARTBEAT)
// ============================================================================
//
// These functions enable check-in without a central server.
// The heartbeat is published to Nostr relays and can be verified by anyone.
//
// ============================================================================

/**
 * Perform a permissionless check-in via Nostr
 *
 * This publishes a signed heartbeat event to Nostr relays, providing
 * cryptographic proof-of-life that anyone can verify.
 *
 * @param {string} switchId - The switch ID
 * @param {string} password - Password to decrypt Nostr private key
 * @returns {Promise<Object>} Check-in result
 */
export async function nostrCheckIn(switchId, password) {
  const switches = loadSwitches();
  const fragments = loadFragments();

  const sw = switches[switchId];
  if (!sw) {
    return { success: false, message: 'Switch not found' };
  }

  if (sw.status === 'TRIGGERED') {
    return { success: false, message: 'Switch already triggered' };
  }

  const fragmentInfo = fragments[switchId];
  if (!fragmentInfo) {
    return { success: false, message: 'No fragment info found' };
  }

  // Get the Nostr private key
  let nostrPrivateKey;

  if (fragmentInfo.keyVersion === 2 && password) {
    // Decrypt using hierarchical key derivation
    const salt = Buffer.from(fragmentInfo.fragmentEncryptionSalt, 'base64');
    const keyHierarchy = reconstructKeyHierarchy(password, switchId, salt);

    // Nostr key is stored encrypted with nostrKey
    if (fragmentInfo.encryptedNostrPrivateKey) {
      const encryptedKey = Buffer.from(fragmentInfo.encryptedNostrPrivateKey, 'base64');
      const iv = Buffer.from(fragmentInfo.nostrKeyIV, 'base64');
      const authTag = Buffer.from(fragmentInfo.nostrKeyAuthTag, 'base64');

      nostrPrivateKey = decrypt(encryptedKey, keyHierarchy.nostrKey, iv, authTag);

      // Clean up other keys
      zeroize(keyHierarchy.encryptionKey);
      zeroize(keyHierarchy.authKey);
      zeroize(keyHierarchy.bitcoinKey);
      keyHierarchy.fragmentKeys.forEach(k => zeroize(k));
    } else {
      return { success: false, message: 'No encrypted Nostr key found' };
    }
  } else if (fragmentInfo.nostrPrivateKey) {
    // Legacy: plaintext key (v1)
    nostrPrivateKey = Buffer.from(fragmentInfo.nostrPrivateKey, 'hex');
  } else {
    return { success: false, message: 'No Nostr key found. Password required for v2 switches.' };
  }

  try {
    // Perform the permissionless check-in
    const result = await permissionlessCheckIn({
      switchId,
      checkInHours: sw.checkInHours,
      nostrPrivateKey
    });

    // Zeroize the private key
    zeroize(nostrPrivateKey);

    if (result.success) {
      // Also update local state for consistency
      const now = Date.now();
      const newExpiryTime = now + (sw.checkInHours * 60 * 60 * 1000);

      sw.expiryTime = newExpiryTime;
      sw.lastCheckIn = now;
      sw.checkInCount += 1;
      sw.status = 'ARMED';
      sw.lastNostrHeartbeat = {
        eventId: result.eventId,
        pubkey: result.pubkey,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt
      };

      if (!sw.checkInHistory) {
        sw.checkInHistory = [];
      }
      sw.checkInHistory.push({
        timestamp: now,
        timeRemaining: newExpiryTime - now,
        method: 'nostr',
        eventId: result.eventId
      });

      saveSwitches(switches);

      return {
        success: true,
        message: 'Permissionless check-in successful',
        newExpiryTime,
        checkInCount: sw.checkInCount,
        nostr: {
          eventId: result.eventId,
          pubkey: result.pubkey,
          relayResults: result.relayResults,
          expiresAtHuman: result.expiresAtHuman
        }
      };
    }

    return result;

  } catch (error) {
    // Make sure to zeroize on error too
    if (nostrPrivateKey) zeroize(nostrPrivateKey);
    return {
      success: false,
      message: `Nostr check-in failed: ${error.message}`
    };
  }
}

/**
 * Verify switch expiry via Nostr (permissionless verification)
 *
 * Anyone can call this to check if a switch has expired based on
 * the last heartbeat event published to Nostr relays.
 *
 * @param {string} switchId - The switch ID
 * @returns {Promise<Object>} Verification result with proof
 */
export async function verifyNostrExpiry(switchId) {
  const switches = loadSwitches();
  const fragments = loadFragments();

  const sw = switches[switchId];
  const fragmentInfo = fragments[switchId];

  // Get the expected pubkey
  let expectedPubkey = null;

  if (fragmentInfo?.nostrPublicKey) {
    expectedPubkey = fragmentInfo.nostrPublicKey;
  } else if (sw?.lastNostrHeartbeat?.pubkey) {
    expectedPubkey = sw.lastNostrHeartbeat.pubkey;
  }

  try {
    const result = await verifySwitchExpiry(switchId, expectedPubkey);

    return {
      success: true,
      switchId,
      ...result,
      localStatus: sw?.status,
      localExpiry: sw?.expiryTime ? new Date(sw.expiryTime).toISOString() : null
    };
  } catch (error) {
    return {
      success: false,
      message: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Get the Nostr public key for a switch
 *
 * @param {string} switchId - The switch ID
 * @returns {string|null} Nostr public key (hex) or null
 */
export function getSwitchNostrPubkey(switchId) {
  const fragments = loadFragments();
  const fragmentInfo = fragments[switchId];

  if (fragmentInfo?.nostrPublicKey) {
    return fragmentInfo.nostrPublicKey;
  }

  const switches = loadSwitches();
  const sw = switches[switchId];

  if (sw?.lastNostrHeartbeat?.pubkey) {
    return sw.lastNostrHeartbeat.pubkey;
  }

  return null;
}