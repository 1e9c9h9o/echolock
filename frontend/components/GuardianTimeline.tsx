/**
 * Guardian Timeline Component
 *
 * Visual timeline showing guardian health history and activity.
 * Displays heartbeat events, status changes, and availability trends.
 *
 * @see CLAUDE.md - Guardian Network health monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface HealthSnapshot {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastHeartbeat: string | null;
  relayCount: number;
  recordedAt: string;
}

interface GuardianTimelineProps {
  switchId: string;
  guardianNpub?: string; // Filter to specific guardian
  hours?: number; // Time range to display
}

const STATUS_COLORS = {
  healthy: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
  unknown: 'bg-gray-400',
};

const STATUS_ICONS = {
  healthy: <CheckCircle className="w-4 h-4 text-green-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  critical: <XCircle className="w-4 h-4 text-red-500" />,
  unknown: <HelpCircle className="w-4 h-4 text-gray-400" />,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function TimelineBar({
  history,
  hours,
}: {
  history: HealthSnapshot[];
  hours: number;
}) {
  if (history.length === 0) {
    return (
      <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm text-gray-500">
        No history data
      </div>
    );
  }

  // Create time slots for the bar
  const slotCount = Math.min(hours, 48); // Max 48 slots
  const slotDuration = (hours * 60 * 60 * 1000) / slotCount;
  const now = Date.now();
  const startTime = now - hours * 60 * 60 * 1000;

  const slots = Array.from({ length: slotCount }).map((_, i) => {
    const slotStart = startTime + i * slotDuration;
    const slotEnd = slotStart + slotDuration;

    // Find the most recent snapshot in this time slot
    const snapshotsInSlot = history.filter((h) => {
      const time = new Date(h.recordedAt).getTime();
      return time >= slotStart && time < slotEnd;
    });

    if (snapshotsInSlot.length === 0) {
      // Use the last known status before this slot
      const lastBefore = history
        .filter((h) => new Date(h.recordedAt).getTime() < slotStart)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

      return lastBefore?.status || 'unknown';
    }

    // Use the most recent snapshot in the slot
    return snapshotsInSlot.sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )[0].status;
  });

  return (
    <div className="flex h-8 rounded overflow-hidden gap-px">
      {slots.map((status, i) => (
        <div
          key={i}
          className={`flex-1 ${STATUS_COLORS[status]} opacity-80 hover:opacity-100 transition-opacity`}
          title={`${Math.round((hours / slotCount) * (slotCount - i))}h ago - ${status}`}
        />
      ))}
    </div>
  );
}

export default function GuardianTimeline({
  switchId,
  guardianNpub,
  hours = 168, // Default 7 days
}: GuardianTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Record<string, HealthSnapshot[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(hours);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ hours: timeRange.toString() });
      if (guardianNpub) {
        params.set('guardianNpub', guardianNpub);
      }

      const response = await fetch(
        `/api/switches/${switchId}/guardians/history?${params}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch guardian history');
      }

      const data = await response.json();
      setHistory(data.data.history || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [switchId, guardianNpub, timeRange]);

  const guardianNpubs = Object.keys(history);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading timeline...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          {error}
        </div>
        <div className="mt-4 text-center">
          <Button variant="secondary" className="text-xs px-3 py-2" onClick={fetchHistory}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Guardian Activity Timeline
          </h3>
        </div>

        {/* Time range selector */}
        <div className="flex gap-1">
          {[24, 72, 168].map((h) => (
            <Button
              key={h}
              variant={timeRange === h ? 'primary' : 'secondary'}
              className="text-xs px-3 py-2"
              onClick={() => setTimeRange(h)}
            >
              {h <= 24 ? '24h' : h <= 72 ? '3d' : '7d'}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="capitalize text-gray-600 dark:text-gray-400">{status}</span>
          </div>
        ))}
      </div>

      {/* Timelines */}
      {guardianNpubs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No guardian history available for this time range.
        </div>
      ) : (
        <div className="space-y-4">
          {guardianNpubs.map((npub) => {
            const guardianHistory = history[npub] || [];
            const latestSnapshot = guardianHistory[0];

            return (
              <div key={npub}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {latestSnapshot && STATUS_ICONS[latestSnapshot.status]}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {npub.substring(0, 8)}...{npub.substring(npub.length - 4)}
                    </span>
                  </div>
                  {latestSnapshot && (
                    <span className="text-xs text-gray-500">
                      Last seen: {formatTimeAgo(latestSnapshot.recordedAt)}
                    </span>
                  )}
                </div>
                <TimelineBar history={guardianHistory} hours={timeRange} />
              </div>
            );
          })}
        </div>
      )}

      {/* Time labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{timeRange}h ago</span>
        <span>Now</span>
      </div>

      {/* Refresh button */}
      <div className="mt-4 text-center">
        <Button variant="secondary" className="text-xs px-3 py-2" onClick={fetchHistory}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>
    </Card>
  );
}
