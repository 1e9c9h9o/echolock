/**
 * Redundancy Dashboard Component
 *
 * Displays system redundancy status:
 * - Secondary timer verification
 * - Guardian cross-check status
 * - Relay network health
 * - Self-healing events
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface RedundancyCheck {
  type: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  message: string;
  details: Record<string, any>;
}

interface RedundancyData {
  success: boolean;
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  checks: RedundancyCheck[];
  timestamp: string;
}

interface RecentCheck {
  check_type: string;
  status: string;
  details: Record<string, any>;
  checked_at: string;
}

interface RedundancyDashboardProps {
  switchId: string;
}

export default function RedundancyDashboard({ switchId }: RedundancyDashboardProps) {
  const [redundancyData, setRedundancyData] = useState<RedundancyData | null>(null);
  const [recentChecks, setRecentChecks] = useState<RecentCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchRedundancyData();
  }, [switchId]);

  const fetchRedundancyData = async () => {
    try {
      // Run redundancy checks
      const response = await api.get(`/api/switches/${switchId}/health-check`);
      // Transform health check to redundancy format
      const healthData = response.data.data;

      const checks: RedundancyCheck[] = [
        {
          type: 'SECONDARY_TIMER',
          status: healthData.checks.heartbeatActive?.status === 'pass' ? 'PASS' :
                  healthData.checks.heartbeatActive?.status === 'warning' ? 'WARNING' : 'FAIL',
          message: healthData.checks.heartbeatActive?.message || 'Timer status unknown',
          details: healthData.checks.heartbeatActive || {},
        },
        {
          type: 'GUARDIAN_CROSS_CHECK',
          status: healthData.checks.guardianAcknowledgments?.status === 'pass' ? 'PASS' :
                  healthData.checks.guardianAcknowledgments?.status === 'warning' ? 'WARNING' : 'FAIL',
          message: healthData.checks.guardianAcknowledgments?.message || 'Guardian status unknown',
          details: healthData.checks.guardianAcknowledgments || {},
        },
        {
          type: 'RELAY_FAILOVER',
          status: healthData.checks.messageOnRelays?.status === 'pass' ? 'PASS' :
                  healthData.checks.messageOnRelays?.status === 'warning' ? 'WARNING' : 'FAIL',
          message: healthData.checks.messageOnRelays?.message || 'Relay status unknown',
          details: healthData.checks.messageOnRelays || {},
        },
        {
          type: 'HEARTBEAT_VERIFICATION',
          status: healthData.checks.encryption?.status === 'pass' ? 'PASS' : 'WARNING',
          message: healthData.checks.encryption?.message || 'Encryption status unknown',
          details: healthData.checks.encryption || {},
        },
      ];

      const hasFailure = checks.some(c => c.status === 'FAIL');
      const hasWarning = checks.some(c => c.status === 'WARNING');

      setRedundancyData({
        success: true,
        overall: hasFailure ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY',
        checks,
        timestamp: healthData.timestamp,
      });
    } catch (error) {
      console.error('Failed to fetch redundancy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runManualCheck = async () => {
    setRunning(true);
    try {
      await fetchRedundancyData();
      showToast('Redundancy check complete', 'success');
    } catch (error) {
      showToast('Failed to run redundancy check', 'error');
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCheckIcon = (checkType: string) => {
    const icons: Record<string, typeof Activity> = {
      SECONDARY_TIMER: Clock,
      GUARDIAN_CROSS_CHECK: Shield,
      RELAY_FAILOVER: Radio,
      HEARTBEAT_VERIFICATION: Activity,
    };
    const Icon = icons[checkType] || Server;
    return <Icon className="w-4 h-4" />;
  };

  const getCheckLabel = (checkType: string) => {
    const labels: Record<string, string> = {
      SECONDARY_TIMER: 'Secondary Timer',
      GUARDIAN_CROSS_CHECK: 'Guardian Network',
      RELAY_FAILOVER: 'Relay Redundancy',
      HEARTBEAT_VERIFICATION: 'Heartbeat System',
    };
    return labels[checkType] || checkType;
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'HEALTHY':
        return 'bg-emerald-100 border-emerald-300 text-emerald-700';
      case 'WARNING':
        return 'bg-amber-100 border-amber-300 text-amber-700';
      case 'CRITICAL':
        return 'bg-red-100 border-red-300 text-red-700';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Running redundancy checks...</span>
        </div>
      </Card>
    );
  }

  if (!redundancyData) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-500">
          <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Failed to load redundancy data</p>
          <Button variant="secondary" onClick={fetchRedundancyData} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={getOverallColor(redundancyData.overall)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {redundancyData.overall === 'HEALTHY' && (
              <CheckCircle2 className="w-8 h-8" />
            )}
            {redundancyData.overall === 'WARNING' && (
              <AlertTriangle className="w-8 h-8" />
            )}
            {redundancyData.overall === 'CRITICAL' && (
              <XCircle className="w-8 h-8" />
            )}
            <div>
              <h3 className="text-lg font-bold uppercase">
                Redundancy {redundancyData.overall.toLowerCase()}
              </h3>
              <p className="text-sm opacity-75">
                Last checked: {new Date(redundancyData.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={runManualCheck}
            disabled={running}
            className="bg-white/50"
          >
            {running ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </Card>

      {/* Redundancy Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {redundancyData.checks.map((check) => (
          <Card key={check.type} className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded">
                {getCheckIcon(check.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">
                    {getCheckLabel(check.type)}
                  </h4>
                  {getStatusIcon(check.status)}
                </div>
                <p className="text-sm text-slate-500 mt-1">{check.message}</p>

                {/* Show details if available */}
                {Object.keys(check.details).length > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    {check.details.hoursRemaining !== undefined && (
                      <span className="mr-3">
                        {check.details.hoursRemaining}h remaining
                      </span>
                    )}
                    {check.details.acknowledged !== undefined && (
                      <span className="mr-3">
                        {check.details.acknowledged}/{check.details.total} guardians
                      </span>
                    )}
                    {check.details.relayCount !== undefined && (
                      <span>
                        {check.details.relayCount} relays
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Explanation */}
      <Card className="bg-slate-50">
        <h4 className="font-bold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          What is Redundancy?
        </h4>
        <p className="text-sm text-slate-600">
          Redundancy ensures your switch will trigger even if some components fail.
          We verify multiple independent systems: secondary timers, guardian network
          health, and relay network availability. If all checks pass, your message
          will be delivered even if EchoLock's servers go down.
        </p>
      </Card>
    </div>
  );
}
