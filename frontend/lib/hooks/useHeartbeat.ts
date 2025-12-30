/**
 * Heartbeat Hook
 *
 * Manages heartbeat publishing and status for switches.
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

import { useState, useCallback, useEffect } from 'react';
import {
  createHeartbeatEvent,
  signEvent,
  publishHeartbeat,
  checkHeartbeatStatus,
  DEFAULT_RELAYS,
} from '../nostr';
import { retrieveSwitch, type StoredSwitch } from '../keystore';

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

/**
 * Hook for automatic heartbeat reminders
 */
export function useHeartbeatReminder(
  switchId: string,
  thresholdHours: number,
  onDue?: () => void
) {
  const [isDue, setIsDue] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Calculate when next heartbeat is due based on last check-in
    // This would integrate with the local storage/API
    const checkDue = () => {
      // TODO: Get last heartbeat from local storage or Nostr
      // For now, just a placeholder
    };

    const interval = setInterval(checkDue, 60000); // Check every minute
    checkDue();

    return () => clearInterval(interval);
  }, [switchId, thresholdHours, onDue]);

  return { isDue, hoursRemaining };
}
