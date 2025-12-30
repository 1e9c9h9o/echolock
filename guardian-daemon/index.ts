/**
 * Guardian Daemon
 *
 * A standalone service that monitors heartbeats and releases shares.
 * Can be self-hosted by anyone to participate in the Guardian Network.
 *
 * Usage:
 *   npx ts-node guardian-daemon/index.ts --config guardian.json
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { WebSocket } from 'ws';

// Configuration
interface GuardianConfig {
  // Guardian's Nostr keypair
  privateKey: string;
  publicKey: string;

  // Relays to monitor
  relayUrls: string[];

  // Polling interval (minutes)
  checkIntervalMinutes: number;

  // How long to wait after threshold before release (hours)
  gracePeriodHours: number;

  // Notification webhook (optional)
  webhookUrl?: string;
}

// Monitored switch
interface MonitoredSwitch {
  switchId: string;
  userNpub: string;
  shareIndex: number;
  thresholdHours: number;
  encryptedShare: string;
  recipientNpubs: string[];
  lastHeartbeatSeen: number;
  enrolledAt: number;
  released: boolean;
}

// Event kinds
const KINDS = {
  HEARTBEAT: 30078,
  SHARE_STORAGE: 30079,
  SHARE_RELEASE: 30080,
  GUARDIAN_ACK: 30083,
};

class GuardianDaemon {
  private config: GuardianConfig;
  private switches: Map<string, MonitoredSwitch> = new Map();
  private relayConnections: Map<string, WebSocket> = new Map();
  private running = false;

  constructor(config: GuardianConfig) {
    this.config = config;
  }

  /**
   * Start the guardian daemon
   */
  async start(): Promise<void> {
    console.log('Starting Guardian Daemon...');
    console.log(`Public Key: ${this.config.publicKey}`);
    console.log(`Monitoring ${this.config.relayUrls.length} relays`);

    this.running = true;

    // Connect to relays
    await this.connectToRelays();

    // Subscribe to share storage events addressed to us
    await this.subscribeToEnrollments();

    // Start heartbeat monitoring loop
    this.startMonitoringLoop();

    console.log('Guardian Daemon running.');
  }

  /**
   * Stop the daemon
   */
  stop(): void {
    console.log('Stopping Guardian Daemon...');
    this.running = false;

    for (const [url, ws] of this.relayConnections) {
      ws.close();
    }
    this.relayConnections.clear();
  }

  /**
   * Connect to configured relays
   */
  private async connectToRelays(): Promise<void> {
    for (const url of this.config.relayUrls) {
      try {
        await this.connectToRelay(url);
      } catch (error) {
        console.error(`Failed to connect to ${url}:`, error);
      }
    }
  }

  /**
   * Connect to a single relay
   */
  private connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.on('open', () => {
        console.log(`Connected to ${url}`);
        this.relayConnections.set(url, ws);
        resolve();
      });

      ws.on('message', (data) => {
        this.handleRelayMessage(url, data.toString());
      });

      ws.on('close', () => {
        console.log(`Disconnected from ${url}`);
        this.relayConnections.delete(url);
        // Reconnect after delay
        if (this.running) {
          setTimeout(() => this.connectToRelay(url), 5000);
        }
      });

      ws.on('error', (error) => {
        console.error(`Relay error (${url}):`, error.message);
        reject(error);
      });

      // Timeout connection
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.terminate();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle messages from relays
   */
  private handleRelayMessage(relayUrl: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const [type, ...rest] = message;

      if (type === 'EVENT') {
        const [subId, event] = rest;
        this.handleEvent(event);
      } else if (type === 'EOSE') {
        // End of stored events
      } else if (type === 'OK') {
        const [eventId, success, reason] = rest;
        if (success) {
          console.log(`Event ${eventId.slice(0, 8)} published successfully`);
        } else {
          console.error(`Event rejected: ${reason}`);
        }
      }
    } catch (error) {
      console.error('Failed to parse relay message:', error);
    }
  }

  /**
   * Handle incoming Nostr events
   */
  private handleEvent(event: any): void {
    if (event.kind === KINDS.SHARE_STORAGE) {
      this.handleShareStorageEvent(event);
    } else if (event.kind === KINDS.HEARTBEAT) {
      this.handleHeartbeatEvent(event);
    }
  }

  /**
   * Handle share storage events (enrollment requests)
   */
  private handleShareStorageEvent(event: any): void {
    // Check if addressed to us
    const pTag = event.tags.find((t: string[]) => t[0] === 'p');
    if (!pTag || pTag[1] !== this.config.publicKey) {
      return;
    }

    const dTag = event.tags.find((t: string[]) => t[0] === 'd');
    const thresholdTag = event.tags.find((t: string[]) => t[0] === 'threshold_hours');

    if (!dTag || !thresholdTag) return;

    const [switchId, shareIndexStr] = dTag[1].split(':');
    const shareIndex = parseInt(shareIndexStr, 10);
    const thresholdHours = parseInt(thresholdTag[1], 10);

    // Extract recipient npubs
    const recipientNpubs = event.tags
      .filter((t: string[]) => t[0] === 'recipient')
      .map((t: string[]) => t[1]);

    const switchKey = `${switchId}:${shareIndex}`;

    if (!this.switches.has(switchKey)) {
      console.log(`New enrollment: ${switchId} (share ${shareIndex})`);

      const monitored: MonitoredSwitch = {
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

      // Publish acknowledgment
      this.publishAcknowledgment(monitored);
    }
  }

  /**
   * Handle heartbeat events
   */
  private handleHeartbeatEvent(event: any): void {
    const dTag = event.tags.find((t: string[]) => t[0] === 'd');
    if (!dTag) return;

    const switchId = dTag[1];

    // Update all shares for this switch
    for (const [key, monitored] of this.switches) {
      if (monitored.switchId === switchId && monitored.userNpub === event.pubkey) {
        monitored.lastHeartbeatSeen = event.created_at;
        console.log(`Heartbeat received for ${switchId}`);
      }
    }
  }

  /**
   * Subscribe to share storage events addressed to us
   */
  private async subscribeToEnrollments(): Promise<void> {
    const filter = {
      kinds: [KINDS.SHARE_STORAGE],
      '#p': [this.config.publicKey],
    };

    for (const ws of this.relayConnections.values()) {
      const subId = this.randomId();
      ws.send(JSON.stringify(['REQ', subId, filter]));
    }
  }

  /**
   * Subscribe to heartbeats for monitored switches
   */
  private subscribeToHeartbeats(): void {
    const userNpubs = [...new Set([...this.switches.values()].map((s) => s.userNpub))];

    if (userNpubs.length === 0) return;

    const filter = {
      kinds: [KINDS.HEARTBEAT],
      authors: userNpubs,
    };

    for (const ws of this.relayConnections.values()) {
      const subId = this.randomId();
      ws.send(JSON.stringify(['REQ', subId, filter]));
    }
  }

  /**
   * Main monitoring loop
   */
  private startMonitoringLoop(): void {
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
  private checkAllSwitches(): void {
    const now = Math.floor(Date.now() / 1000);

    for (const [key, monitored] of this.switches) {
      if (monitored.released) continue;

      const elapsed = now - monitored.lastHeartbeatSeen;
      const thresholdSeconds = monitored.thresholdHours * 3600;
      const graceSeconds = this.config.gracePeriodHours * 3600;

      if (elapsed > thresholdSeconds + graceSeconds) {
        console.log(`Switch ${monitored.switchId} exceeded threshold. Releasing share...`);
        this.releaseShare(monitored);
      } else if (elapsed > thresholdSeconds) {
        console.log(
          `Switch ${monitored.switchId} in grace period. ` +
            `${Math.floor((thresholdSeconds + graceSeconds - elapsed) / 3600)}h remaining.`
        );
      }
    }
  }

  /**
   * Release a share by publishing to Nostr
   */
  private async releaseShare(monitored: MonitoredSwitch): Promise<void> {
    try {
      // Create release event
      const now = Math.floor(Date.now() / 1000);

      // Re-encrypt share for each recipient
      // Note: In production, this requires decrypting with our key first
      // then re-encrypting for each recipient
      const encryptedForRecipients: Record<string, string> = {};
      for (const recipientNpub of monitored.recipientNpubs) {
        // TODO: Implement actual re-encryption
        encryptedForRecipients[recipientNpub] = monitored.encryptedShare;
      }

      const tags: string[][] = [
        ['d', `${monitored.switchId}:${monitored.shareIndex}`],
        ['e', `switch:${monitored.switchId}`], // Reference to original
      ];

      for (const recipientNpub of monitored.recipientNpubs) {
        tags.push(['p', recipientNpub]);
      }

      const releaseContent = JSON.stringify({
        switchId: monitored.switchId,
        shareIndex: monitored.shareIndex,
        reason: 'heartbeat_timeout',
        encryptedShares: encryptedForRecipients,
      });

      const event = {
        pubkey: this.config.publicKey,
        created_at: now,
        kind: KINDS.SHARE_RELEASE,
        tags,
        content: releaseContent,
      };

      // Sign and publish
      const signedEvent = await this.signEvent(event);

      for (const ws of this.relayConnections.values()) {
        ws.send(JSON.stringify(['EVENT', signedEvent]));
      }

      monitored.released = true;
      console.log(`Share released for ${monitored.switchId}`);

      // Webhook notification
      if (this.config.webhookUrl) {
        await this.sendWebhook({
          type: 'share_released',
          switchId: monitored.switchId,
          shareIndex: monitored.shareIndex,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error(`Failed to release share for ${monitored.switchId}:`, error);
    }
  }

  /**
   * Publish acknowledgment event
   */
  private async publishAcknowledgment(monitored: MonitoredSwitch): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const event = {
      pubkey: this.config.publicKey,
      created_at: now,
      kind: KINDS.GUARDIAN_ACK,
      tags: [
        ['d', `${monitored.switchId}:${this.config.publicKey}`],
        ['p', monitored.userNpub],
      ],
      content: JSON.stringify({
        switchId: monitored.switchId,
        shareIndex: monitored.shareIndex,
        accepted: true,
        monitoringActive: true,
        relayUrls: this.config.relayUrls,
      }),
    };

    const signedEvent = await this.signEvent(event);

    for (const ws of this.relayConnections.values()) {
      ws.send(JSON.stringify(['EVENT', signedEvent]));
    }

    console.log(`Acknowledgment published for ${monitored.switchId}`);
  }

  /**
   * Sign a Nostr event (simplified, uses external library in production)
   */
  private async signEvent(event: any): Promise<any> {
    // Calculate event ID
    const serialized = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);

    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);

    // Use Node.js crypto for SHA256
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(data).digest('hex');

    // Sign with Schnorr (would use proper library)
    // Placeholder signature
    const sig = '0'.repeat(128);

    return {
      ...event,
      id: hash,
      sig,
    };
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(data: any): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Webhook failed:', response.statusText);
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }

  /**
   * Generate random subscription ID
   */
  private randomId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}

// CLI entrypoint
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let configPath = 'guardian.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configPath = args[i + 1];
    }
  }

  console.log(`Loading config from ${configPath}...`);

  let config: GuardianConfig;
  try {
    const fs = await import('fs');
    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load config:', error);
    console.log('\nExample guardian.json:');
    console.log(
      JSON.stringify(
        {
          privateKey: '<your-nostr-private-key>',
          publicKey: '<your-nostr-public-key>',
          relayUrls: [
            'wss://relay.damus.io',
            'wss://relay.nostr.band',
            'wss://nos.lol',
          ],
          checkIntervalMinutes: 5,
          gracePeriodHours: 1,
          webhookUrl: 'https://your-webhook.com/guardian',
        },
        null,
        2
      )
    );
    process.exit(1);
  }

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

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { GuardianDaemon, GuardianConfig, MonitoredSwitch };
