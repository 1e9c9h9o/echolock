#!/usr/bin/env node
/**
 * Guardian Daemon
 *
 * A standalone service that monitors heartbeats and releases shares.
 * Can be self-hosted by anyone to participate in the Guardian Network.
 *
 * Usage:
 *   npx echolock-guardian --config guardian.json
 *   node index.js --config guardian.json
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { WebSocket } from 'ws';
import { finalizeEvent, verifyEvent, getPublicKey } from 'nostr-tools';
import { encrypt as nip44Encrypt, decrypt as nip44Decrypt, hexToBytes } from './nip44.js';
import fs from 'fs';
import path from 'path';

// Event kinds (per CLAUDE.md spec)
const KINDS = {
  HEARTBEAT: 30078,
  SHARE_STORAGE: 30079,
  SHARE_RELEASE: 30080,
  GUARDIAN_ACK: 30083,
};

// Default configuration
const DEFAULT_CONFIG = {
  relayUrls: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://nostr.wine',
  ],
  checkIntervalMinutes: 5,
  gracePeriodHours: 1,
  dataDir: './data',
  webhookUrl: null,
};

/**
 * Guardian Daemon
 *
 * Monitors Nostr for:
 * 1. Share storage events (kind 30079) addressed to this guardian
 * 2. Heartbeat events (kind 30078) from monitored users
 *
 * When a heartbeat hasn't been seen for threshold + grace period,
 * releases the share by publishing a release event (kind 30080).
 */
class GuardianDaemon {
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.switches = new Map();
    this.relayConnections = new Map();
    this.running = false;
    this.subscriptionIds = new Map();

    // Derive public key from private key
    if (!this.config.publicKey && this.config.privateKey) {
      this.config.publicKey = getPublicKey(this.config.privateKey);
    }

    // Ensure data directory exists
    this.dataFile = path.join(this.config.dataDir, 'switches.json');
  }

  /**
   * Start the guardian daemon
   */
  async start() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║            EchoLock Guardian Daemon v1.0.0                    ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Public Key: ${this.config.publicKey.slice(0, 20)}...${this.config.publicKey.slice(-8)} ║`);
    console.log(`║ Relays: ${this.config.relayUrls.length} configured                                     ║`);
    console.log(`║ Check interval: ${this.config.checkIntervalMinutes} minutes                               ║`);
    console.log(`║ Grace period: ${this.config.gracePeriodHours} hours                                    ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    this.running = true;

    // Load persisted switches
    await this.loadSwitches();

    // Connect to relays
    await this.connectToRelays();

    // Subscribe to share storage events addressed to us
    await this.subscribeToEnrollments();

    // Subscribe to heartbeats for already-monitored switches
    await this.subscribeToHeartbeats();

    // Start heartbeat monitoring loop
    this.startMonitoringLoop();

    console.log('\n✓ Guardian daemon running. Watching for heartbeats...\n');
  }

  /**
   * Stop the daemon
   */
  stop() {
    console.log('\nStopping Guardian Daemon...');
    this.running = false;

    // Save state before shutdown
    this.saveSwitches();

    for (const [url, ws] of this.relayConnections) {
      ws.close();
    }
    this.relayConnections.clear();
    console.log('Guardian daemon stopped.');
  }

  /**
   * Load switches from disk
   */
  async loadSwitches() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.config.dataDir)) {
        fs.mkdirSync(this.config.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        for (const [key, value] of Object.entries(data)) {
          this.switches.set(key, value);
        }
        console.log(`✓ Loaded ${this.switches.size} monitored switches from disk`);
      }
    } catch (error) {
      console.error('Warning: Could not load switches:', error.message);
    }
  }

  /**
   * Save switches to disk
   */
  saveSwitches() {
    try {
      if (!fs.existsSync(this.config.dataDir)) {
        fs.mkdirSync(this.config.dataDir, { recursive: true });
      }

      const data = Object.fromEntries(this.switches);
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Warning: Could not save switches:', error.message);
    }
  }

  /**
   * Connect to configured relays
   */
  async connectToRelays() {
    const connectionPromises = this.config.relayUrls.map(url =>
      this.connectToRelay(url).catch(error => {
        console.error(`✗ Failed to connect to ${url}: ${error.message}`);
        return null;
      })
    );

    await Promise.all(connectionPromises);

    const connected = this.relayConnections.size;
    if (connected === 0) {
      throw new Error('Failed to connect to any relays');
    }

    console.log(`✓ Connected to ${connected}/${this.config.relayUrls.length} relays`);
  }

  /**
   * Connect to a single relay
   */
  connectToRelay(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`  ✓ Connected to ${url}`);
        this.relayConnections.set(url, ws);

        // Send keepalive ping every 30 seconds to prevent relay from closing connection
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
        ws._pingInterval = pingInterval;

        resolve(ws);
      });

      ws.on('message', (data) => {
        this.handleRelayMessage(url, data.toString());
      });

      ws.on('close', () => {
        // Clear ping interval if set
        if (ws._pingInterval) {
          clearInterval(ws._pingInterval);
        }
        this.relayConnections.delete(url);
        // Reconnect after delay (silently - no spam)
        if (this.running) {
          setTimeout(() => this.connectToRelay(url).catch(() => {}), 30000);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Handle messages from relays
   */
  handleRelayMessage(relayUrl, data) {
    try {
      const message = JSON.parse(data);
      const [type, ...rest] = message;

      if (type === 'EVENT') {
        const [subId, event] = rest;
        this.handleEvent(event, relayUrl);
      } else if (type === 'OK') {
        const [eventId, success, reason] = rest;
        if (success) {
          console.log(`  ✓ Event ${eventId.slice(0, 8)}... published to ${relayUrl}`);
        } else {
          console.error(`  ✗ Event rejected by ${relayUrl}: ${reason}`);
        }
      } else if (type === 'NOTICE') {
        console.log(`  Notice from ${relayUrl}: ${rest[0]}`);
      }
    } catch (error) {
      // Ignore parse errors from malformed messages
    }
  }

  /**
   * Handle incoming Nostr events
   */
  handleEvent(event, relayUrl) {
    // Verify event signature
    if (!verifyEvent(event)) {
      console.log(`  ⚠ Invalid signature on event ${event.id?.slice(0, 8)}...`);
      return;
    }

    if (event.kind === KINDS.SHARE_STORAGE) {
      this.handleShareStorageEvent(event);
    } else if (event.kind === KINDS.HEARTBEAT) {
      this.handleHeartbeatEvent(event);
    }
  }

  /**
   * Handle share storage events (enrollment requests)
   */
  async handleShareStorageEvent(event) {
    // Check if addressed to us
    const pTag = event.tags.find((t) => t[0] === 'p');
    if (!pTag || pTag[1] !== this.config.publicKey) {
      return;
    }

    const dTag = event.tags.find((t) => t[0] === 'd');
    const thresholdTag = event.tags.find((t) => t[0] === 'threshold_hours');

    if (!dTag || !thresholdTag) {
      console.log('  ⚠ Malformed share storage event (missing tags)');
      return;
    }

    const [switchId, shareIndexStr] = dTag[1].split(':');
    const shareIndex = parseInt(shareIndexStr, 10);
    const thresholdHours = parseInt(thresholdTag[1], 10);

    // Extract recipient npubs
    const recipientNpubs = event.tags
      .filter((t) => t[0] === 'recipient')
      .map((t) => t[1]);

    const switchKey = `${switchId}:${shareIndex}`;

    if (!this.switches.has(switchKey)) {
      console.log(`\n📥 New enrollment: ${switchId}`);
      console.log(`   Share index: ${shareIndex}`);
      console.log(`   Threshold: ${thresholdHours} hours`);
      console.log(`   Recipients: ${recipientNpubs.length}`);

      const monitored = {
        switchId,
        userNpub: event.pubkey,
        shareIndex,
        thresholdHours,
        encryptedShare: event.content,
        recipientNpubs,
        lastHeartbeatSeen: event.created_at,
        enrolledAt: Date.now(),
        released: false,
      };

      this.switches.set(switchKey, monitored);
      this.saveSwitches();

      // Subscribe to heartbeats from this user
      this.subscribeToUserHeartbeats(event.pubkey);

      // Publish acknowledgment
      await this.publishAcknowledgment(monitored);
    }
  }

  /**
   * Handle heartbeat events
   */
  handleHeartbeatEvent(event) {
    const dTag = event.tags.find((t) => t[0] === 'd');
    if (!dTag) return;

    // Extract switch ID from d tag (format: echolock-heartbeat-<switchId>)
    const dValue = dTag[1];
    const switchIdMatch = dValue.match(/^echolock-heartbeat-(.+)$/);
    if (!switchIdMatch) return;

    const switchId = switchIdMatch[1];

    // Update all shares for this switch from this user
    let updated = false;
    for (const [key, monitored] of this.switches) {
      if (monitored.switchId === switchId && monitored.userNpub === event.pubkey) {
        const oldTime = monitored.lastHeartbeatSeen;
        monitored.lastHeartbeatSeen = event.created_at;
        updated = true;

        const now = Math.floor(Date.now() / 1000);
        const hoursRemaining = Math.max(0, (monitored.lastHeartbeatSeen + (monitored.thresholdHours * 3600) - now) / 3600);

        console.log(`💓 Heartbeat: ${switchId.slice(0, 8)}... (${hoursRemaining.toFixed(1)}h remaining)`);
      }
    }

    if (updated) {
      this.saveSwitches();
    }
  }

  /**
   * Subscribe to share storage events addressed to us
   */
  async subscribeToEnrollments() {
    const filter = {
      kinds: [KINDS.SHARE_STORAGE],
      '#p': [this.config.publicKey],
    };

    const subId = this.randomId();
    this.subscriptionIds.set('enrollments', subId);

    for (const ws of this.relayConnections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(['REQ', subId, filter]));
      }
    }
  }

  /**
   * Subscribe to heartbeats for all monitored switches
   */
  async subscribeToHeartbeats() {
    const userNpubs = [...new Set([...this.switches.values()].map((s) => s.userNpub))];

    if (userNpubs.length === 0) return;

    const filter = {
      kinds: [KINDS.HEARTBEAT],
      authors: userNpubs,
    };

    const subId = this.randomId();
    this.subscriptionIds.set('heartbeats', subId);

    for (const ws of this.relayConnections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(['REQ', subId, filter]));
      }
    }

    console.log(`✓ Subscribed to heartbeats from ${userNpubs.length} users`);
  }

  /**
   * Subscribe to heartbeats from a specific user
   */
  subscribeToUserHeartbeats(userNpub) {
    const filter = {
      kinds: [KINDS.HEARTBEAT],
      authors: [userNpub],
    };

    const subId = this.randomId();

    for (const ws of this.relayConnections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(['REQ', subId, filter]));
      }
    }
  }

  /**
   * Main monitoring loop
   */
  startMonitoringLoop() {
    const check = () => {
      if (!this.running) return;

      this.checkAllSwitches();
      setTimeout(check, this.config.checkIntervalMinutes * 60 * 1000);
    };

    // Initial check after 1 minute
    setTimeout(check, 60 * 1000);
  }

  /**
   * Check all monitored switches for expired heartbeats
   */
  checkAllSwitches() {
    const now = Math.floor(Date.now() / 1000);

    for (const [key, monitored] of this.switches) {
      if (monitored.released) continue;

      const elapsed = now - monitored.lastHeartbeatSeen;
      const thresholdSeconds = monitored.thresholdHours * 3600;
      const graceSeconds = this.config.gracePeriodHours * 3600;

      if (elapsed > thresholdSeconds + graceSeconds) {
        console.log(`\n🚨 RELEASE TRIGGERED: ${monitored.switchId}`);
        console.log(`   Last heartbeat: ${Math.floor(elapsed / 3600)} hours ago`);
        console.log(`   Threshold was: ${monitored.thresholdHours} hours + ${this.config.gracePeriodHours}h grace`);
        this.releaseShare(monitored);
      } else if (elapsed > thresholdSeconds) {
        const graceRemaining = Math.floor((thresholdSeconds + graceSeconds - elapsed) / 3600);
        console.log(`⏳ ${monitored.switchId.slice(0, 8)}... in grace period (${graceRemaining}h remaining)`);
      }
    }
  }

  /**
   * Release a share by publishing to Nostr
   */
  async releaseShare(monitored) {
    try {
      // Decrypt the share that was encrypted to us
      const decryptedShare = await nip44Decrypt(
        monitored.encryptedShare,
        monitored.userNpub,
        this.config.privateKey
      );

      // Re-encrypt share for each recipient
      const encryptedForRecipients = {};
      for (const recipientNpub of monitored.recipientNpubs) {
        const reEncrypted = await nip44Encrypt(
          decryptedShare,
          recipientNpub,
          this.config.privateKey
        );
        encryptedForRecipients[recipientNpub] = reEncrypted;
      }

      const now = Math.floor(Date.now() / 1000);

      const tags = [
        ['d', `${monitored.switchId}:${monitored.shareIndex}`],
        ['e', `switch:${monitored.switchId}`],
      ];

      for (const recipientNpub of monitored.recipientNpubs) {
        tags.push(['p', recipientNpub]);
      }

      const releaseContent = JSON.stringify({
        version: 1,
        switchId: monitored.switchId,
        shareIndex: monitored.shareIndex,
        reason: 'heartbeat_timeout',
        lastHeartbeat: monitored.lastHeartbeatSeen,
        releasedAt: now,
        encryptedShares: encryptedForRecipients,
      });

      const unsignedEvent = {
        kind: KINDS.SHARE_RELEASE,
        created_at: now,
        tags,
        content: releaseContent,
      };

      // Sign with nostr-tools
      const signedEvent = finalizeEvent(unsignedEvent, this.config.privateKey);

      // Publish to all relays
      for (const ws of this.relayConnections.values()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(['EVENT', signedEvent]));
        }
      }

      monitored.released = true;
      monitored.releasedAt = now;
      this.saveSwitches();

      console.log(`   ✓ Share released! Event ID: ${signedEvent.id}`);

      // Webhook notification
      if (this.config.webhookUrl) {
        await this.sendWebhook({
          type: 'share_released',
          switchId: monitored.switchId,
          shareIndex: monitored.shareIndex,
          eventId: signedEvent.id,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error(`   ✗ Failed to release share: ${error.message}`);
    }
  }

  /**
   * Publish acknowledgment event
   */
  async publishAcknowledgment(monitored) {
    const now = Math.floor(Date.now() / 1000);

    const unsignedEvent = {
      kind: KINDS.GUARDIAN_ACK,
      created_at: now,
      tags: [
        ['d', `${monitored.switchId}:${this.config.publicKey}`],
        ['p', monitored.userNpub],
        ['e', `switch:${monitored.switchId}`],
      ],
      content: JSON.stringify({
        version: 1,
        switchId: monitored.switchId,
        shareIndex: monitored.shareIndex,
        accepted: true,
        monitoringActive: true,
        checkIntervalMinutes: this.config.checkIntervalMinutes,
        gracePeriodHours: this.config.gracePeriodHours,
        relayUrls: this.config.relayUrls,
        timestamp: now,
      }),
    };

    // Sign with nostr-tools
    const signedEvent = finalizeEvent(unsignedEvent, this.config.privateKey);

    // Publish to all relays
    for (const ws of this.relayConnections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(['EVENT', signedEvent]));
      }
    }

    console.log(`   ✓ Acknowledgment published`);
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(data) {
    if (!this.config.webhookUrl) return;

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error(`   ⚠ Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`   ⚠ Webhook error: ${error.message}`);
    }
  }

  /**
   * Generate random subscription ID
   */
  randomId() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Get daemon status
   */
  getStatus() {
    const now = Math.floor(Date.now() / 1000);
    const switches = [];

    for (const [key, monitored] of this.switches) {
      const elapsed = now - monitored.lastHeartbeatSeen;
      const thresholdSeconds = monitored.thresholdHours * 3600;
      const remaining = thresholdSeconds - elapsed;

      switches.push({
        switchId: monitored.switchId,
        shareIndex: monitored.shareIndex,
        status: monitored.released
          ? 'released'
          : remaining < 0
          ? 'expired'
          : 'active',
        hoursRemaining: Math.max(0, remaining / 3600),
        released: monitored.released,
      });
    }

    return {
      publicKey: this.config.publicKey,
      relaysConnected: this.relayConnections.size,
      switchesMonitored: this.switches.size,
      switches,
    };
  }
}

/**
 * Generate a new guardian keypair
 */
function generateKeypair() {
  const { generateSecretKey, getPublicKey } = require('nostr-tools');
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey,
  };
}

// CLI entrypoint
async function main() {
  const args = process.argv.slice(2);
  let configPath = 'guardian.json';

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--config' || args[i] === '-c') && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === '--generate-keys') {
      // Generate new keypair and exit
      const { generateSecretKey, getPublicKey } = await import('nostr-tools');
      const privateKeyBytes = generateSecretKey();
      const privateKey = Buffer.from(privateKeyBytes).toString('hex');
      const publicKey = getPublicKey(privateKeyBytes);

      console.log('\nGenerated new guardian keypair:\n');
      console.log(`Private Key: ${privateKey}`);
      console.log(`Public Key:  ${publicKey}`);
      console.log('\nAdd these to your guardian.json configuration file.');
      console.log('KEEP YOUR PRIVATE KEY SECRET!\n');
      process.exit(0);
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
EchoLock Guardian Daemon

Usage:
  node index.js [options]

Options:
  -c, --config <path>    Path to configuration file (default: guardian.json)
  --generate-keys        Generate a new Nostr keypair and exit
  -h, --help            Show this help message

Configuration file format (guardian.json):
{
  "privateKey": "<64-char hex Nostr private key>",
  "publicKey": "<64-char hex Nostr public key>",
  "relayUrls": ["wss://relay1.com", "wss://relay2.com"],
  "checkIntervalMinutes": 5,
  "gracePeriodHours": 1,
  "dataDir": "./data",
  "webhookUrl": null
}

For more information, see: https://github.com/echolock-xyz/echolock
`);
      process.exit(0);
    }
  }

  // Load configuration
  console.log(`Loading config from ${configPath}...`);

  let config;
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`\nConfiguration file not found: ${configPath}`);
      console.log('\nTo get started:');
      console.log('  1. Generate a keypair:  node index.js --generate-keys');
      console.log('  2. Copy guardian.example.json to guardian.json');
      console.log('  3. Add your private and public keys');
      console.log('  4. Run:  node index.js\n');
    } else {
      console.error(`\nFailed to load config: ${error.message}`);
    }
    process.exit(1);
  }

  // Validate required fields
  if (!config.privateKey) {
    console.error('\nError: privateKey is required in configuration');
    console.log('Generate one with: node index.js --generate-keys\n');
    process.exit(1);
  }

  // Create and start daemon
  const daemon = new GuardianDaemon(config);

  // Handle shutdown
  process.on('SIGINT', () => {
    daemon.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    daemon.stop();
    process.exit(0);
  });

  await daemon.start();
}

// Only run main() if this file is the entry point
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  });
}

export { GuardianDaemon };
