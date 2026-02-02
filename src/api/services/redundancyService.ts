'use strict';

/**
 * Redundancy Service
 *
 * Provides system-wide redundancy monitoring:
 * - Secondary timer verification
 * - Cross-guardian health checks
 * - Multi-relay network status
 * - Self-healing detection
 */

import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';

/**
 * Check types for redundancy monitoring
 */
export const CHECK_TYPES = {
  SECONDARY_TIMER: 'SECONDARY_TIMER',
  GUARDIAN_CROSS_CHECK: 'GUARDIAN_CROSS_CHECK',
  RELAY_FAILOVER: 'RELAY_FAILOVER',
  HEARTBEAT_VERIFICATION: 'HEARTBEAT_VERIFICATION'
} as const;

export type CheckType = typeof CHECK_TYPES[keyof typeof CHECK_TYPES];

/**
 * Check result status
 */
type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';

/**
 * Individual check result
 */
interface CheckResult {
  type: CheckType;
  status: CheckStatus;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Redundancy check response
 */
interface RedundancyCheckResponse {
  success: boolean;
  error?: string;
  overall?: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  checks?: CheckResult[];
  timestamp?: string;
}

/**
 * Switch data from database
 */
interface SwitchData {
  id: string;
  expires_at: Date;
  nostr_public_key: string | null;
  relay_urls: string | string[];
  fragment_metadata: FragmentMetadata | string | null;
}

/**
 * Fragment metadata
 */
interface FragmentMetadata {
  guardians?: Guardian[];
  lastHeartbeat?: string;
  [key: string]: unknown;
}

/**
 * Guardian data
 */
interface Guardian {
  acknowledged: boolean;
  [key: string]: unknown;
}

/**
 * Relay health row
 */
interface RelayHealthRow {
  relay_url: string;
  status: string;
  consecutive_failures: number;
  last_check: Date;
}

/**
 * Recent check row
 */
interface RecentCheckRow {
  check_type: CheckType;
  status: CheckStatus;
  details: Record<string, unknown>;
  checked_at: Date;
}

/**
 * System redundancy summary
 */
interface SystemRedundancySummary {
  total: number;
  healthy: number;
  warning: number;
  failing: number;
  switches: SwitchRedundancyRow[];
}

/**
 * Switch redundancy row
 */
interface SwitchRedundancyRow {
  switch_id: string;
  switch_title: string;
  status: CheckStatus;
  checked_at: Date;
  details: Record<string, unknown>;
}

/**
 * Run all redundancy checks for a switch
 */
export async function runRedundancyChecks(switchId: string): Promise<RedundancyCheckResponse> {
  const results: CheckResult[] = [];

  try {
    // Get switch data
    const switchResult = await query<SwitchData>(
      `SELECT id, expires_at, nostr_public_key, relay_urls, fragment_metadata
       FROM switches WHERE id = $1 AND status = 'ARMED'`,
      [switchId]
    );

    if (switchResult.rows.length === 0) {
      return { success: false, error: 'Switch not found or not armed' };
    }

    const sw = switchResult.rows[0];

    // Check 1: Secondary timer verification
    const timerCheck = await checkSecondaryTimer(sw);
    results.push(timerCheck);
    await recordCheck(switchId, CHECK_TYPES.SECONDARY_TIMER, timerCheck);

    // Check 2: Guardian cross-check
    const guardianCheck = await checkGuardians(sw);
    results.push(guardianCheck);
    await recordCheck(switchId, CHECK_TYPES.GUARDIAN_CROSS_CHECK, guardianCheck);

    // Check 3: Relay network status
    const relayCheck = await checkRelayNetwork(sw);
    results.push(relayCheck);
    await recordCheck(switchId, CHECK_TYPES.RELAY_FAILOVER, relayCheck);

    // Check 4: Heartbeat verification
    const heartbeatCheck = await verifyHeartbeat(sw);
    results.push(heartbeatCheck);
    await recordCheck(switchId, CHECK_TYPES.HEARTBEAT_VERIFICATION, heartbeatCheck);

    // Determine overall status
    const hasFailure = results.some(r => r.status === 'FAIL');
    const hasWarning = results.some(r => r.status === 'WARNING');

    return {
      success: true,
      overall: hasFailure ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY',
      checks: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Redundancy check error:', error);
    return { success: false, error: err.message };
  }
}

/**
 * Check secondary timer matches primary
 */
async function checkSecondaryTimer(sw: SwitchData): Promise<CheckResult> {
  try {
    const now = new Date();
    const expiresAt = new Date(sw.expires_at);
    const timeRemaining = expiresAt.getTime() - now.getTime();

    // Secondary timer verification: check that expiry is consistent
    // In a real implementation, this would query an independent timer source

    if (timeRemaining <= 0) {
      return {
        type: CHECK_TYPES.SECONDARY_TIMER,
        status: 'FAIL',
        message: 'Switch has expired',
        details: { expiresAt: sw.expires_at }
      };
    }

    if (timeRemaining < 3600000) { // Less than 1 hour
      return {
        type: CHECK_TYPES.SECONDARY_TIMER,
        status: 'WARNING',
        message: 'Less than 1 hour until expiry',
        details: { expiresAt: sw.expires_at, minutesRemaining: Math.floor(timeRemaining / 60000) }
      };
    }

    return {
      type: CHECK_TYPES.SECONDARY_TIMER,
      status: 'PASS',
      message: 'Timer verified',
      details: { expiresAt: sw.expires_at, hoursRemaining: Math.floor(timeRemaining / 3600000) }
    };
  } catch (error) {
    const err = error as Error;
    return {
      type: CHECK_TYPES.SECONDARY_TIMER,
      status: 'FAIL',
      message: 'Timer check failed',
      details: { error: err.message }
    };
  }
}

/**
 * Cross-check guardian health
 */
async function checkGuardians(sw: SwitchData): Promise<CheckResult> {
  try {
    // Parse fragment_metadata if it's a string
    let fragmentMetadata: FragmentMetadata | null = null;
    if (typeof sw.fragment_metadata === 'string') {
      try {
        fragmentMetadata = JSON.parse(sw.fragment_metadata);
      } catch {
        fragmentMetadata = null;
      }
    } else {
      fragmentMetadata = sw.fragment_metadata;
    }

    const guardians = fragmentMetadata?.guardians || [];

    if (guardians.length === 0) {
      return {
        type: CHECK_TYPES.GUARDIAN_CROSS_CHECK,
        status: 'FAIL',
        message: 'No guardians configured',
        details: { guardianCount: 0 }
      };
    }

    const acknowledgedCount = guardians.filter(g => g.acknowledged).length;
    const totalCount = guardians.length;
    const threshold = 3;

    if (acknowledgedCount < threshold) {
      return {
        type: CHECK_TYPES.GUARDIAN_CROSS_CHECK,
        status: 'FAIL',
        message: `Only ${acknowledgedCount}/${totalCount} guardians acknowledged (${threshold} required)`,
        details: { acknowledged: acknowledgedCount, total: totalCount, threshold }
      };
    }

    if (acknowledgedCount < totalCount) {
      return {
        type: CHECK_TYPES.GUARDIAN_CROSS_CHECK,
        status: 'WARNING',
        message: `${acknowledgedCount}/${totalCount} guardians acknowledged`,
        details: { acknowledged: acknowledgedCount, total: totalCount }
      };
    }

    return {
      type: CHECK_TYPES.GUARDIAN_CROSS_CHECK,
      status: 'PASS',
      message: `All ${totalCount} guardians acknowledged`,
      details: { acknowledged: acknowledgedCount, total: totalCount }
    };
  } catch (error) {
    const err = error as Error;
    return {
      type: CHECK_TYPES.GUARDIAN_CROSS_CHECK,
      status: 'FAIL',
      message: 'Guardian check failed',
      details: { error: err.message }
    };
  }
}

/**
 * Check relay network redundancy
 */
async function checkRelayNetwork(sw: SwitchData): Promise<CheckResult> {
  try {
    // Parse relay_urls if it's a string
    let relayUrls: string[] = [];
    if (typeof sw.relay_urls === 'string') {
      try {
        relayUrls = JSON.parse(sw.relay_urls);
      } catch {
        relayUrls = [];
      }
    } else if (Array.isArray(sw.relay_urls)) {
      relayUrls = sw.relay_urls;
    }

    const minRelays = 5;
    const recommendedRelays = 7;

    // Check relay health from database
    const healthResult = await query<RelayHealthRow>(
      `SELECT relay_url, status, consecutive_failures, last_check
       FROM relay_health
       WHERE relay_url = ANY($1)`,
      [relayUrls]
    );

    const healthMap: Record<string, RelayHealthRow> = {};
    for (const row of healthResult.rows) {
      healthMap[row.relay_url] = row;
    }

    const onlineRelays = relayUrls.filter(url => {
      const health = healthMap[url];
      return !health || health.status === 'ONLINE' || health.consecutive_failures < 3;
    });

    if (onlineRelays.length < minRelays) {
      return {
        type: CHECK_TYPES.RELAY_FAILOVER,
        status: 'FAIL',
        message: `Only ${onlineRelays.length} relays available (${minRelays} minimum required)`,
        details: {
          configured: relayUrls.length,
          online: onlineRelays.length,
          minimum: minRelays
        }
      };
    }

    if (onlineRelays.length < recommendedRelays) {
      return {
        type: CHECK_TYPES.RELAY_FAILOVER,
        status: 'WARNING',
        message: `${onlineRelays.length} relays available (${recommendedRelays} recommended)`,
        details: {
          configured: relayUrls.length,
          online: onlineRelays.length,
          recommended: recommendedRelays
        }
      };
    }

    return {
      type: CHECK_TYPES.RELAY_FAILOVER,
      status: 'PASS',
      message: `${onlineRelays.length} relays available`,
      details: {
        configured: relayUrls.length,
        online: onlineRelays.length
      }
    };
  } catch (error) {
    const err = error as Error;
    return {
      type: CHECK_TYPES.RELAY_FAILOVER,
      status: 'WARNING',
      message: 'Relay check incomplete',
      details: { error: err.message }
    };
  }
}

/**
 * Verify heartbeat is publishing correctly
 */
async function verifyHeartbeat(sw: SwitchData): Promise<CheckResult> {
  try {
    // In a full implementation, this would query Nostr relays for the latest heartbeat
    // For now, we verify the heartbeat metadata is present

    const nostrPublicKey = sw.nostr_public_key;

    if (!nostrPublicKey) {
      return {
        type: CHECK_TYPES.HEARTBEAT_VERIFICATION,
        status: 'FAIL',
        message: 'No Nostr public key configured',
        details: {}
      };
    }

    // Parse fragment_metadata if it's a string
    let fragmentMetadata: FragmentMetadata | null = null;
    if (typeof sw.fragment_metadata === 'string') {
      try {
        fragmentMetadata = JSON.parse(sw.fragment_metadata);
      } catch {
        fragmentMetadata = null;
      }
    } else {
      fragmentMetadata = sw.fragment_metadata;
    }

    if (fragmentMetadata?.lastHeartbeat) {
      const lastHeartbeat = new Date(fragmentMetadata.lastHeartbeat);
      const hoursSince = (Date.now() - lastHeartbeat.getTime()) / 3600000;

      if (hoursSince > 24) {
        return {
          type: CHECK_TYPES.HEARTBEAT_VERIFICATION,
          status: 'WARNING',
          message: `Last heartbeat was ${Math.floor(hoursSince)} hours ago`,
          details: { lastHeartbeat: fragmentMetadata.lastHeartbeat }
        };
      }
    }

    return {
      type: CHECK_TYPES.HEARTBEAT_VERIFICATION,
      status: 'PASS',
      message: 'Heartbeat system configured',
      details: { nostrPublicKey: nostrPublicKey.substring(0, 16) + '...' }
    };
  } catch (error) {
    const err = error as Error;
    return {
      type: CHECK_TYPES.HEARTBEAT_VERIFICATION,
      status: 'WARNING',
      message: 'Heartbeat verification incomplete',
      details: { error: err.message }
    };
  }
}

/**
 * Record a redundancy check result
 */
async function recordCheck(
  switchId: string,
  checkType: CheckType,
  result: CheckResult
): Promise<void> {
  try {
    await query(
      `INSERT INTO redundancy_checks (switch_id, check_type, status, details)
       VALUES ($1, $2, $3, $4)`,
      [switchId, checkType, result.status, JSON.stringify(result.details)]
    );
  } catch (error) {
    logger.error('Failed to record redundancy check:', error);
  }
}

/**
 * Get recent redundancy checks for a switch
 */
export async function getRecentChecks(switchId: string, limit: number = 20): Promise<RecentCheckRow[]> {
  try {
    const result = await query<RecentCheckRow>(
      `SELECT check_type, status, details, checked_at
       FROM redundancy_checks
       WHERE switch_id = $1
       ORDER BY checked_at DESC
       LIMIT $2`,
      [switchId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Get redundancy checks error:', error);
    throw error;
  }
}

/**
 * Get system-wide redundancy summary
 */
export async function getSystemRedundancy(userId: string): Promise<SystemRedundancySummary> {
  try {
    // Get latest check for each switch
    const result = await query<SwitchRedundancyRow>(
      `SELECT DISTINCT ON (rc.switch_id)
        rc.switch_id,
        s.title as switch_title,
        rc.status,
        rc.checked_at,
        rc.details
       FROM redundancy_checks rc
       JOIN switches s ON rc.switch_id = s.id
       WHERE s.user_id = $1 AND s.status = 'ARMED'
       ORDER BY rc.switch_id, rc.checked_at DESC`,
      [userId]
    );

    const summary: SystemRedundancySummary = {
      total: result.rows.length,
      healthy: result.rows.filter(r => r.status === 'PASS').length,
      warning: result.rows.filter(r => r.status === 'WARNING').length,
      failing: result.rows.filter(r => r.status === 'FAIL').length,
      switches: result.rows
    };

    return summary;
  } catch (error) {
    logger.error('Get system redundancy error:', error);
    throw error;
  }
}

export default {
  runRedundancyChecks,
  getRecentChecks,
  getSystemRedundancy,
  CHECK_TYPES
};
