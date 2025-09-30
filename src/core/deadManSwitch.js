'use strict';

// ECHOLOCK Dead Man's Switch Core Implementation
// Orchestrates encryption, secret sharing, and timed release

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { split, combine } from 'shamir-secret-sharing';
import { encrypt, decrypt } from '../crypto/encryption.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import {
  getCurrentBlockHeight,
  createTimelockTransaction,
  getTimelockStatus
} from '../bitcoin/testnetClient.js';
import { loadConfig } from './config.js';
import { publishFragment, retrieveFragments } from '../nostr/multiRelayClient.js';
import { filterHealthyRelays } from '../nostr/relayHealthCheck.js';
import { generateSecretKey, getPublicKey } from 'nostr-tools';

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
 * Save switches database
 */
function saveSwitches(switches) {
  fs.writeFileSync(SWITCHES_FILE, JSON.stringify(switches, null, 2));
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
 * Save fragments database
 */
function saveFragments(fragments) {
  fs.writeFileSync(FRAGMENTS_FILE, JSON.stringify(fragments, null, 2));
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

  // 1. Generate encryption key (256 bits)
  const encryptionKey = crypto.randomBytes(32);

  // 2. Encrypt the message
  const messageBuffer = Buffer.from(message, 'utf8');
  const { ciphertext, iv, authTag } = encrypt(messageBuffer, encryptionKey);

  // 3. Split encryption key using Shamir (3-of-5)
  const keyShares = await split(new Uint8Array(encryptionKey), 5, 3);

  // 4. Create Bitcoin timelock (if enabled)
  let bitcoinTimelock = null;
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

      // Generate Bitcoin keypair
      const randomPrivateKey = crypto.randomBytes(32);
      const keyPair = ECPair.fromPrivateKey(randomPrivateKey, { network: bitcoin.networks.testnet });
      const publicKey = keyPair.publicKey;

      // Derive master key from password using PBKDF2
      const salt = crypto.randomBytes(16);
      const masterKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

      // Encrypt the private key
      const privateKeyBuffer = Buffer.from(randomPrivateKey);
      const { ciphertext: encryptedPrivateKey, iv: privateKeyIV, authTag: privateKeyAuthTag } =
        encrypt(privateKeyBuffer, masterKey);

      // Create timelock transaction structure
      const timelockTx = createTimelockTransaction(timelockHeight, publicKey);

      bitcoinTimelock = {
        enabled: true,
        currentHeight,
        timelockHeight,
        blocksUntilValid: timelockHeight - currentHeight,
        address: timelockTx.address,
        script: timelockTx.script,
        scriptAsm: timelockTx.scriptAsm,
        publicKey: publicKey.toString('hex'),
        // Store encrypted private key
        encryptedPrivateKey: encryptedPrivateKey.toString('base64'),
        privateKeyIV: privateKeyIV.toString('base64'),
        privateKeyAuthTag: privateKeyAuthTag.toString('base64'),
        privateKeySalt: salt.toString('base64'),
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

      // Publish each fragment to multiple relays
      const publishResults = [];
      for (let i = 0; i < keyShares.length; i++) {
        const fragmentData = Buffer.from(keyShares[i]);
        const result = await publishFragment(
          switchId,
          i,
          fragmentData,
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

      // Store Nostr metadata
      const fragments = loadFragments();
      fragments[switchId] = {
        distributionStatus: 'NOSTR',
        relayCount: healthyRelays.length,
        relays: healthyRelays,
        nostrPublicKey: Buffer.from(nostrPublicKey).toString('hex'),
        nostrPrivateKey: Buffer.from(nostrPrivateKey).toString('hex')
      };
      saveFragments(fragments);

      console.log(`Fragments published to ${healthyRelays.length} Nostr relays`);
    } catch (error) {
      console.warn('Nostr distribution failed, falling back to local storage:', error.message);
      // Fallback to local storage
      distributionInfo = await storeFragmentsLocally(switchId, keyShares);
    }
  } else {
    // Store locally
    distributionInfo = await storeFragmentsLocally(switchId, keyShares);
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
 * @param {Array} keyShares - The Shamir shares
 * @returns {Object} Distribution info
 */
async function storeFragmentsLocally(switchId, keyShares) {
  const fragments = loadFragments();
  fragments[switchId] = {
    shares: keyShares.map(share => Buffer.from(share).toString('base64')),
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
      const liveStatus = await getTimelockStatus(sw.bitcoinTimelock.timelockHeight);
      bitcoinStatus = {
        ...sw.bitcoinTimelock,
        ...liveStatus,
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

    let shares;

    // 2. Retrieve fragments from Nostr or local storage
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

      // Use first 3 fragments
      shares = retrievedFragments
        .slice(0, 3)
        .map(frag => new Uint8Array(frag.data));

      console.log(`Retrieved ${retrievedFragments.length} fragments from Nostr relays`);
    } else {
      // Local storage
      shares = fragmentInfo.shares
        .slice(0, 3)
        .map(shareB64 => new Uint8Array(Buffer.from(shareB64, 'base64')));
    }

    // 3. Reconstruct encryption key from shares
    const reconstructedKeyArray = await combine(shares);
    const reconstructedKey = Buffer.from(reconstructedKeyArray);

    // 4. Decrypt the message
    const ciphertext = Buffer.from(sw.encryptedMessage.ciphertext, 'base64');
    const iv = Buffer.from(sw.encryptedMessage.iv, 'base64');
    const authTag = Buffer.from(sw.encryptedMessage.authTag, 'base64');

    const decryptedMessage = decrypt(ciphertext, reconstructedKey, iv, authTag);
    const message = decryptedMessage.toString('utf8');

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