/**
 * Heartbeat Hook
 *
 * Manages heartbeat publishing and status for switches.
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createHeartbeatEvent,
  signEvent,
  publishHeartbeat,
  checkHeartbeatStatus,
  queryLatestHeartbeat,
  DEFAULT_RELAYS,
} from '../nostr';
import { retrieveSwitch, listSwitches } from '../keystore';

interface HeartbeatState {
  isPublishing: boolean;
  lastPublished: number | null;
  successfulRelays: string[];
  failedRelays: string[];
  error: string | null;
}

interface HeartbeatStatus {
  isAlive: boolean;
  lastHeartbeat: number | null;
  hoursOverdue: number | null;
  checking: boolean;
}

export function useHeartbeat(switchId: string) {
  const [state, setState] = useState<HeartbeatState>({
    isPublishing: false,
    lastPublished: null,
    successfulRelays: [],
    failedRelays: [],
    error: null,
  });

  const [status, setStatus] = useState<HeartbeatStatus>({
    isAlive: true,
    lastHeartbeat: null,
    hoursOverdue: null,
    checking: false,
  });

  /**
   * Publish a heartbeat for a switch
   */
  const publishSwitchHeartbeat = useCallback(
    async (
      password: string,
      guardianPubkeys: string[] = []
    ): Promise<boolean> => {
      setState((s) => ({
        ...s,
        isPublishing: true,
        error: null,
      }));

      try {
        // Retrieve stored switch data
        const storedSwitch = await retrieveSwitch(switchId, password);
        if (!storedSwitch) {
          throw new Error('Switch not found in local storage');
        }

        // Create heartbeat event
        const event = createHeartbeatEvent(storedSwitch.nostrPublicKey, {
          switchId,
          thresholdHours: 72, // Default, could be configurable
          guardianPubkeys,
        });

        // Sign with user's private key
        const signedEvent = await signEvent(event, storedSwitch.nostrPrivateKey);

        // Publish to relays
        const result = await publishHeartbeat(signedEvent);

        setState({
          isPublishing: false,
          lastPublished: Date.now(),
          successfulRelays: result.success,
          failedRelays: result.failed,
          error:
            result.success.length === 0
              ? 'Failed to publish to any relay'
              : null,
        });

        return result.success.length > 0;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState((s) => ({
          ...s,
          isPublishing: false,
          error: message,
        }));
        return false;
      }
    },
    [switchId]
  );

  /**
   * Check heartbeat status from Nostr
   */
  const checkStatus = useCallback(
    async (publicKey: string, thresholdHours: number = 72) => {
      setStatus((s) => ({ ...s, checking: true }));

      try {
        const result = await checkHeartbeatStatus(
          publicKey,
          switchId,
          thresholdHours
        );

        setStatus({
          ...result,
          checking: false,
        });
      } catch {
        setStatus((s) => ({ ...s, checking: false }));
      }
    },
    [switchId]
  );

  return {
    state,
    status,
    publishHeartbeat: publishSwitchHeartbeat,
    checkStatus,
  };
}

// Local storage key for caching heartbeat timestamps
const HEARTBEAT_CACHE_KEY = 'echolock:heartbeat-cache';

interface HeartbeatCache {
  [switchId: string]: {
    lastHeartbeat: number; // Unix timestamp (seconds)
    cachedAt: number; // When we cached this (ms)
  };
}

/**
 * Get heartbeat cache from localStorage
 */
function getHeartbeatCache(): HeartbeatCache {
  try {
    const cached = localStorage.getItem(HEARTBEAT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Update heartbeat cache
 */
function updateHeartbeatCache(switchId: string, lastHeartbeat: number): void {
  try {
    const cache = getHeartbeatCache();
    cache[switchId] = {
      lastHeartbeat,
      cachedAt: Date.now(),
    };
    localStorage.setItem(HEARTBEAT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook for automatic heartbeat reminders
 *
 * Monitors heartbeat status and notifies when a check-in is due.
 * Uses a combination of local cache and Nostr queries to determine status.
 */
export function useHeartbeatReminder(
  switchId: string,
  thresholdHours: number,
  onDue?: () => void
) {
  const [isDue, setIsDue] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if onDue has been called to avoid repeated calls
  const onDueCalledRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkDueStatus = async () => {
      try {
        // Get switch info to find the public key
        const switches = await listSwitches();
        const switchInfo = switches.find((s) => s.switchId === switchId);

        if (!switchInfo) {
          if (mounted) {
            setError('Switch not found in local storage');
            setIsLoading(false);
          }
          return;
        }

        // Check local cache first (avoid unnecessary Nostr queries)
        const cache = getHeartbeatCache();
        const cached = cache[switchId];
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const nowSeconds = Math.floor(now / 1000);

        let lastHeartbeatTimestamp: number | null = null;

        // Use cache if fresh enough
        if (cached && now - cached.cachedAt < cacheMaxAge) {
          lastHeartbeatTimestamp = cached.lastHeartbeat;
        } else {
          // Query Nostr for latest heartbeat
          try {
            const latestEvent = await queryLatestHeartbeat(
              switchInfo.nostrPublicKey,
              switchId
            );

            if (latestEvent) {
              lastHeartbeatTimestamp = latestEvent.created_at;
              // Update cache
              updateHeartbeatCache(switchId, lastHeartbeatTimestamp);
            }
          } catch {
            // If Nostr query fails, use stale cache if available
            if (cached) {
              lastHeartbeatTimestamp = cached.lastHeartbeat;
            }
          }
        }

        if (!mounted) return;

        if (lastHeartbeatTimestamp === null) {
          // No heartbeat found - switch might be new or never had a heartbeat
          setIsDue(true);
          setHoursRemaining(0);
          setError(null);
          setIsLoading(false);

          // Trigger onDue callback
          if (!onDueCalledRef.current && onDue) {
            onDueCalledRef.current = true;
            onDue();
          }
          return;
        }

        // Calculate time remaining
        const thresholdSeconds = thresholdHours * 3600;
        const elapsedSeconds = nowSeconds - lastHeartbeatTimestamp;
        const remainingSeconds = thresholdSeconds - elapsedSeconds;
        const remainingHours = remainingSeconds / 3600;

        const switchIsDue = remainingSeconds <= 0;

        setIsDue(switchIsDue);
        setHoursRemaining(Math.max(0, Math.round(remainingHours * 10) / 10)); // Round to 1 decimal
        setError(null);
        setIsLoading(false);

        // Trigger onDue callback when becoming due
        if (switchIsDue && !onDueCalledRef.current && onDue) {
          onDueCalledRef.current = true;
          onDue();
        }

        // Reset the flag if not due anymore (user checked in)
        if (!switchIsDue) {
          onDueCalledRef.current = false;
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkDueStatus();

    // Check every minute
    interval = setInterval(checkDueStatus, 60000);

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [switchId, thresholdHours, onDue]);

  return { isDue, hoursRemaining, isLoading, error };
}

/**
 * Hook to update the heartbeat cache after publishing
 *
 * Call this after successfully publishing a heartbeat to update
 * the local cache immediately (without waiting for Nostr query).
 */
export function useUpdateHeartbeatCache() {
  return useCallback((switchId: string) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    updateHeartbeatCache(switchId, nowSeconds);
  }, []);
}
