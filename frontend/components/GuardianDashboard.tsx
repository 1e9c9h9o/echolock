/**
 * Guardian Network Monitoring Dashboard
 *
 * Provides comprehensive visibility into guardian network health:
 * - Overall network status
 * - Individual guardian health
 * - Share verification status
 * - Recovery readiness assessment
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Guardian } from '@/lib/guardian/types';
import {
  checkAllGuardiansHealth,
  GuardianHealth,
  GuardianStatus,
  HEALTH_THRESHOLDS,
} from '@/lib/guardian/health';
import { DEFAULT_RELAYS } from '@/lib/nostr/types';

interface GuardianDashboardProps {
  switchId: string;
  guardians: Guardian[];
  thresholdNeeded?: number;
  onRefresh?: () => void;
}

interface NetworkHealth {
  guardians: GuardianHealth[];
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  canRecover: boolean;
  threshold: number;
}

export default function GuardianDashboard({
  switchId,
  guardians,
  thresholdNeeded = 3,
  onRefresh,
}: GuardianDashboardProps) {
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    if (guardians.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const pubkeys = guardians.map((g) => g.npub);
      const health = await checkAllGuardiansHealth(pubkeys, [...DEFAULT_RELAYS]);
      setNetworkHealth(health);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check guardian health');
    } finally {
      setLoading(false);
    }
  }, [guardians]);

  // Initial check and auto-refresh
  useEffect(() => {
    checkHealth();

    if (autoRefresh) {
      const interval = setInterval(checkHealth, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [checkHealth, autoRefresh]);

  const getStatusColor = (status: GuardianStatus): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: GuardianStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (hoursAgo: number | null): string => {
    if (hoursAgo === null) return 'Never seen';
    if (hoursAgo < 1) return 'Just now';
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const days = Math.floor(hoursAgo / 24);
    return `${days}d ago`;
  };

  const getNetworkStatusColor = (): string => {
    if (!networkHealth) return 'bg-gray-200';
    if (networkHealth.canRecover && networkHealth.healthyCount >= thresholdNeeded) {
      return 'bg-green-500';
    }
    if (networkHealth.canRecover) {
      return 'bg-yellow-500';
    }
    return 'bg-red-500';
  };

  const getNetworkStatusText = (): string => {
    if (!networkHealth) return 'Unknown';
    if (networkHealth.canRecover && networkHealth.healthyCount >= thresholdNeeded) {
      return 'Healthy';
    }
    if (networkHealth.canRecover) {
      return 'Degraded';
    }
    return 'Critical';
  };

  // Find matching guardian info for health data
  const getGuardianInfo = (pubkey: string): Guardian | undefined => {
    return guardians.find((g) => g.npub === pubkey);
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Guardian Network Monitor</h3>
            <p className="text-sm text-gray-600">
              Real-time guardian health and availability
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-refresh
          </label>
          <Button
            variant="secondary"
            onClick={() => {
              checkHealth();
              onRefresh?.();
            }}
            disabled={loading}
            className="!p-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Network Status Overview */}
      <div className="mb-6 p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getNetworkStatusColor()}`} />
            <span className="font-bold">Network Status: {getNetworkStatusText()}</span>
          </div>
          {lastChecked && (
            <span className="text-xs text-gray-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        {networkHealth && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 border border-green-200">
              <p className="text-2xl font-bold text-green-600">{networkHealth.healthyCount}</p>
              <p className="text-xs text-green-700">Healthy</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">{networkHealth.warningCount}</p>
              <p className="text-xs text-yellow-700">Warning</p>
            </div>
            <div className="text-center p-3 bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-600">{networkHealth.criticalCount}</p>
              <p className="text-xs text-red-700">Critical</p>
            </div>
            <div className="text-center p-3 bg-gray-50 border border-gray-200">
              <p className="text-2xl font-bold text-gray-600">{networkHealth.unknownCount}</p>
              <p className="text-xs text-gray-700">Unknown</p>
            </div>
          </div>
        )}

        {/* Recovery Readiness */}
        {networkHealth && (
          <div className={`mt-4 p-3 ${networkHealth.canRecover ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
            <div className="flex items-center gap-2">
              {networkHealth.canRecover ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    Recovery Ready: {networkHealth.healthyCount + networkHealth.warningCount} of {thresholdNeeded} guardians available
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    Recovery At Risk: Only {networkHealth.healthyCount + networkHealth.warningCount} of {thresholdNeeded} guardians available
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Individual Guardian Status */}
      <div className="space-y-3">
        <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide">
          Guardian Details
        </h4>

        {guardians.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No guardians configured</p>
          </div>
        ) : (
          networkHealth?.guardians.map((health) => {
            const guardianInfo = getGuardianInfo(health.pubkey);
            return (
              <div
                key={health.pubkey}
                className="p-4 border-2 border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${getStatusColor(health.status)}`}>
                      {getStatusIcon(health.status)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {guardianInfo?.name || `Guardian ${health.pubkey.slice(0, 8)}...`}
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {health.pubkey.slice(0, 16)}...{health.pubkey.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(health.status)}`}>
                      {health.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Last Heartbeat</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(health.hoursAgo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Relays Connected</p>
                    <p className="font-medium flex items-center gap-1">
                      {health.relayUrls.length > 0 ? (
                        <>
                          <Wifi className="w-3 h-3 text-green-600" />
                          {health.relayUrls.length} relay(s)
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 text-gray-400" />
                          No relays
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Share Status</p>
                    <p className="font-medium flex items-center gap-1">
                      {health.acknowledgedShares.includes(switchId) ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Verified
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-yellow-600" />
                          Pending
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Relay URLs */}
                {health.relayUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Connected Relays:</p>
                    <div className="flex flex-wrap gap-1">
                      {health.relayUrls.map((url) => (
                        <span
                          key={url}
                          className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono"
                        >
                          {url.replace('wss://', '').replace('ws://', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Health Thresholds Info */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
        <h4 className="font-bold text-sm mb-2">Health Thresholds</h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Healthy: &lt; {HEALTH_THRESHOLDS.HEALTHY_HOURS}h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Warning: &lt; {HEALTH_THRESHOLDS.WARNING_HOURS}h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Critical: &gt; {HEALTH_THRESHOLDS.CRITICAL_HOURS}h</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
