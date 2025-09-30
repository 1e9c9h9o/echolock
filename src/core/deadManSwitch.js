'use strict';

// ECHOLOCK Dead Man's Switch Core Implementation
// Orchestrates encryption, secret sharing, and timed release

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { split, combine } from 'shamir-secret-sharing';
import { encrypt, decrypt } from '../crypto/encryption.js';

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
 * @returns {Object} { switchId, expiryTime, fragmentCount }
 */
export async function createSwitch(message, checkInHours = 72) {
  const switchId = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const expiryTime = now + (checkInHours * 60 * 60 * 1000);

  // 1. Generate encryption key (256 bits)
  const encryptionKey = crypto.randomBytes(32);

  // 2. Encrypt the message
  const messageBuffer = Buffer.from(message, 'utf8');
  const { ciphertext, iv, authTag } = encrypt(messageBuffer, encryptionKey);

  // 3. Split encryption key using Shamir (3-of-5)
  const keyShares = await split(new Uint8Array(encryptionKey), 5, 3);

  // 4. Store encrypted message and metadata
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
    requiredFragments: 3
  };
  saveSwitches(switches);

  // 5. Store fragments separately
  const fragments = loadFragments();
  fragments[switchId] = {
    shares: keyShares.map(share => Buffer.from(share).toString('base64')),
    distributionStatus: 'LOCAL', // In production, would be distributed to Nostr relays
    relayCount: 0 // Would be 7+ in production
  };
  saveFragments(fragments);

  return {
    switchId,
    expiryTime,
    fragmentCount: 5,
    requiredFragments: 3,
    checkInHours
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
 * @returns {Object} Status information
 */
export function getStatus(switchId) {
  const switches = loadSwitches();
  const sw = switches[switchId];

  if (!sw) {
    return { found: false, message: 'Switch not found' };
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

  return {
    found: true,
    switchId: sw.id,
    status: sw.status,
    createdAt: sw.createdAt,
    expiryTime: sw.expiryTime,
    timeRemaining,
    isExpired,
    lastCheckIn: sw.lastCheckIn,
    checkInCount: sw.checkInCount,
    checkInHours: sw.checkInHours,
    fragmentCount: sw.fragmentCount,
    requiredFragments: sw.requiredFragments,
    distributionStatus: fragmentInfo?.distributionStatus || 'UNKNOWN'
  };
}

/**
 * Test release - reconstruct and decrypt message
 * @param {string} switchId - The switch ID
 * @returns {Object} { success, message, reconstructedMessage }
 */
export async function testRelease(switchId) {
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
    // 1. Reconstruct encryption key from shares (using any 3 of 5)
    const shares = fragmentInfo.shares
      .slice(0, 3) // Use first 3 shares
      .map(shareB64 => new Uint8Array(Buffer.from(shareB64, 'base64')));

    const reconstructedKeyArray = await combine(shares);
    const reconstructedKey = Buffer.from(reconstructedKeyArray);

    // 2. Decrypt the message
    const ciphertext = Buffer.from(sw.encryptedMessage.ciphertext, 'base64');
    const iv = Buffer.from(sw.encryptedMessage.iv, 'base64');
    const authTag = Buffer.from(sw.encryptedMessage.authTag, 'base64');

    const decryptedMessage = decrypt(ciphertext, reconstructedKey, iv, authTag);
    const message = decryptedMessage.toString('utf8');

    // 3. Update status
    sw.status = 'RELEASED';
    sw.releasedAt = Date.now();
    saveSwitches(switches);

    return {
      success: true,
      message: 'Message successfully reconstructed',
      reconstructedMessage: message,
      sharesUsed: 3,
      totalShares: 5
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