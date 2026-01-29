/**
 * Guardian Health Monitoring System
 *
 * Monitors the health and availability of guardians before release.
 * Allows recipients to verify guardians are "alive" and responsive.
 *
 * Guardian Health Protocol:
 * 1. Guardians periodically publish heartbeat events (kind 30082)
 * 2. Recipients can query guardian health before attempting recovery
 * 3. Healthy guardians are prioritized during share collection
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Nostr event kinds for guardian operations
export const GUARDIAN_KINDS = {
  REGISTRATION: 30082,    // Guardian announces availability
  ACKNOWLEDGMENT: 30083,  // Guardian confirms share receipt
  HEARTBEAT: 30084,       // Guardian health pulse
  SHARE_RELEASE: 30080,   // Guardian releases share
};

// Health check intervals
export const HEALTH_THRESHOLDS = {
  HEALTHY_HOURS: 24,      // Guardian is healthy if heartbeat within 24h
  WARNING_HOURS: 72,      // Warning if no heartbeat for 72h
  CRITICAL_HOURS: 168,    // Critical if no heartbeat for 7 days
};

/**
 * Guardian health status
 */
export type GuardianStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Guardian health information
 */
export interface GuardianHealth {
  pubkey: string;
  status: GuardianStatus;
  lastHeartbeat: number | null;
  lastSeen: number | null;
  hoursAgo: number | null;
  registeredAt: number | null;
  acknowledgedShares: string[];
  relayUrls: string[];
}

/**
 * Guardian registration event
 */
export interface GuardianRegistration {
  pubkey: string;
  name?: string;
  description?: string;
  contactEmail?: string;
  relays: string[];
  capabilities: string[];
  registeredAt: number;
}

/**
 * Guardian heartbeat event (NIP-01 compliant)
 */
export interface GuardianHeartbeatEvent {
  kind: 30084;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  id: string;
  sig: string;
}

/**
 * Create a guardian heartbeat event
 */
export function createGuardianHeartbeat(
  guardianPubkey: string,
  monitoredSwitches: string[]
): {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
} {
  const now = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ['d', 'guardian-heartbeat'],
    ['type', 'guardian-health'],
  ];

  // Add monitored switch IDs
  for (const switchId of monitoredSwitches) {
    tags.push(['switch', switchId]);
  }

  return {
    kind: GUARDIAN_KINDS.HEARTBEAT,
    pubkey: guardianPubkey,
    created_at: now,
    tags,
    content: JSON.stringify({
      version: 1,
      status: 'active',
      monitoredCount: monitoredSwitches.length,
    }),
  };
}

/**
 * Sign a guardian heartbeat event
 */
export async function signGuardianHeartbeat(
  event: ReturnType<typeof createGuardianHeartbeat>,
  privateKeyHex: string
): Promise<GuardianHeartbeatEvent> {
  // Serialize for hashing (NIP-01)
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  const hash = sha256(new TextEncoder().encode(serialized));
  const id = bytesToHex(hash);

  // Sign with Schnorr
  const signature = schnorr.sign(hash, hexToBytes(privateKeyHex));

  return {
    ...event,
    kind: event.kind as 30084,
    id,
    sig: bytesToHex(signature),
  };
}

/**
 * Query guardian health from Nostr relays
 */
export async function queryGuardianHealth(
  guardianPubkey: string,
  relays: string[]
): Promise<GuardianHealth> {
  const health: GuardianHealth = {
    pubkey: guardianPubkey,
    status: 'unknown',
    lastHeartbeat: null,
    lastSeen: null,
    hoursAgo: null,
    registeredAt: null,
    acknowledgedShares: [],
    relayUrls: [],
  };

  for (const relayUrl of relays) {
    try {
      const events = await queryRelayForGuardianEvents(relayUrl, guardianPubkey);

      // Find latest heartbeat
      const heartbeats = events.filter((e) => e.kind === GUARDIAN_KINDS.HEARTBEAT);
      if (heartbeats.length > 0) {
        const latest = heartbeats.reduce((a, b) =>
          a.created_at > b.created_at ? a : b
        );
        if (!health.lastHeartbeat || latest.created_at > health.lastHeartbeat) {
          health.lastHeartbeat = latest.created_at;
          health.relayUrls.push(relayUrl);
        }
      }

      // Find registration
      const registrations = events.filter((e) => e.kind === GUARDIAN_KINDS.REGISTRATION);
      if (registrations.length > 0) {
        const latest = registrations.reduce((a, b) =>
          a.created_at > b.created_at ? a : b
        );
        if (!health.registeredAt) {
          health.registeredAt = latest.created_at;
        }
      }

      // Find acknowledgments
      const acks = events.filter((e) => e.kind === GUARDIAN_KINDS.ACKNOWLEDGMENT);
      for (const ack of acks) {
        const switchTag = ack.tags.find((t: string[]) => t[0] === 'switch');
        if (switchTag && !health.acknowledgedShares.includes(switchTag[1])) {
          health.acknowledgedShares.push(switchTag[1]);
        }
      }
    } catch {
      // Relay failed, continue to next
    }
  }

  // Calculate status
  const now = Math.floor(Date.now() / 1000);
  if (health.lastHeartbeat) {
    health.lastSeen = health.lastHeartbeat;
    const hoursSinceHeartbeat = (now - health.lastHeartbeat) / 3600;
    health.hoursAgo = Math.floor(hoursSinceHeartbeat);

    if (hoursSinceHeartbeat <= HEALTH_THRESHOLDS.HEALTHY_HOURS) {
      health.status = 'healthy';
    } else if (hoursSinceHeartbeat <= HEALTH_THRESHOLDS.WARNING_HOURS) {
      health.status = 'warning';
    } else {
      health.status = 'critical';
    }
  }

  return health;
}

/**
 * Query relay for guardian-related events
 */
async function queryRelayForGuardianEvents(
  relayUrl: string,
  guardianPubkey: string
): Promise<Array<{ kind: number; created_at: number; tags: string[][] }>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 10000);

    try {
      const ws = new WebSocket(relayUrl);
      const subId = crypto.randomUUID().slice(0, 8);
      const events: Array<{ kind: number; created_at: number; tags: string[][] }> = [];

      ws.onopen = () => {
        // Query for guardian events
        const filter = {
          kinds: [
            GUARDIAN_KINDS.REGISTRATION,
            GUARDIAN_KINDS.ACKNOWLEDGMENT,
            GUARDIAN_KINDS.HEARTBEAT,
          ],
          authors: [guardianPubkey],
          limit: 100,
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
 * Check health of all guardians for a switch
 */
export async function checkAllGuardiansHealth(
  guardianPubkeys: string[],
  relays: string[]
): Promise<{
  guardians: GuardianHealth[];
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  canRecover: boolean;
  threshold: number;
}> {
  const guardians: GuardianHealth[] = [];

  // Query all guardians in parallel
  const healthPromises = guardianPubkeys.map((pubkey) =>
    queryGuardianHealth(pubkey, relays)
  );

  const results = await Promise.allSettled(healthPromises);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      guardians.push(result.value);
    } else {
      guardians.push({
        pubkey: guardianPubkeys[i],
        status: 'unknown',
        lastHeartbeat: null,
        lastSeen: null,
        hoursAgo: null,
        registeredAt: null,
        acknowledgedShares: [],
        relayUrls: [],
      });
    }
  }

  // Count by status
  const healthyCount = guardians.filter((g) => g.status === 'healthy').length;
  const warningCount = guardians.filter((g) => g.status === 'warning').length;
  const criticalCount = guardians.filter((g) => g.status === 'critical').length;
  const unknownCount = guardians.filter((g) => g.status === 'unknown').length;

  // Default threshold is 3-of-5
  const threshold = 3;

  // Can recover if enough guardians are healthy or warning
  const availableGuardians = healthyCount + warningCount;
  const canRecover = availableGuardians >= threshold;

  return {
    guardians,
    healthyCount,
    warningCount,
    criticalCount,
    unknownCount,
    canRecover,
    threshold,
  };
}

/**
 * Get recommended guardians for share collection
 * Prioritizes healthy guardians, then warning, then others
 */
export function prioritizeGuardians(
  guardians: GuardianHealth[],
  threshold: number
): GuardianHealth[] {
  const sorted = [...guardians].sort((a, b) => {
    const statusPriority: Record<GuardianStatus, number> = {
      healthy: 0,
      warning: 1,
      critical: 2,
      unknown: 3,
    };
    return statusPriority[a.status] - statusPriority[b.status];
  });

  // Return at least threshold guardians, preferring healthy ones
  return sorted.slice(0, Math.max(threshold, sorted.length));
}

/**
 * Format guardian health for display
 */
export function formatGuardianStatus(health: GuardianHealth): string {
  const statusEmoji: Record<GuardianStatus, string> = {
    healthy: '🟢',
    warning: '🟡',
    critical: '🔴',
    unknown: '⚪',
  };

  let status = `${statusEmoji[health.status]} ${health.pubkey.slice(0, 8)}...`;

  if (health.hoursAgo !== null) {
    if (health.hoursAgo < 1) {
      status += ' (just now)';
    } else if (health.hoursAgo < 24) {
      status += ` (${health.hoursAgo}h ago)`;
    } else {
      const days = Math.floor(health.hoursAgo / 24);
      status += ` (${days}d ago)`;
    }
  } else {
    status += ' (never seen)';
  }

  return status;
}

/**
 * Guardian Daemon Health Check Response
 * For programmatic health verification
 */
export interface HealthCheckResponse {
  guardian: string;
  timestamp: number;
  status: GuardianStatus;
  monitoredSwitches: number;
  lastHeartbeat: number | null;
  version: string;
}

/**
 * Create a guardian registration event
 */
export function createGuardianRegistration(
  pubkey: string,
  options: {
    name?: string;
    description?: string;
    contactEmail?: string;
    relays: string[];
    capabilities?: string[];
  }
): {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
} {
  const now = Math.floor(Date.now() / 1000);

  const tags: string[][] = [
    ['d', 'guardian-registration'],
    ['type', 'guardian'],
  ];

  // Add relays
  for (const relay of options.relays) {
    tags.push(['relay', relay]);
  }

  // Add capabilities
  const capabilities = options.capabilities || ['heartbeat-watch', 'share-release'];
  for (const cap of capabilities) {
    tags.push(['capability', cap]);
  }

  return {
    kind: GUARDIAN_KINDS.REGISTRATION,
    pubkey,
    created_at: now,
    tags,
    content: JSON.stringify({
      version: 1,
      name: options.name || 'EchoLock Guardian',
      description: options.description || 'Automated guardian daemon',
      contact: options.contactEmail,
    }),
  };
}

/**
 * Create a share acknowledgment event
 */
export function createShareAcknowledgment(
  guardianPubkey: string,
  switchId: string,
  userPubkey: string
): {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
} {
  const now = Math.floor(Date.now() / 1000);

  return {
    kind: GUARDIAN_KINDS.ACKNOWLEDGMENT,
    pubkey: guardianPubkey,
    created_at: now,
    tags: [
      ['d', `ack-${switchId}`],
      ['switch', switchId],
      ['p', userPubkey],
    ],
    content: JSON.stringify({
      version: 1,
      status: 'acknowledged',
      receivedAt: now,
    }),
  };
}
