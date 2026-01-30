/**
 * Health Check Dashboard Component
 *
 * Displays comprehensive switch health status:
 * - Message availability on relays
 * - Guardian acknowledgments
 * - Bitcoin commitment status
 * - Heartbeat activity
 * - Generate proof documents
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Radio,
  Bitcoin,
  Users,
  Lock,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface HealthCheck {
  status: 'pass' | 'warning' | 'fail' | 'optional' | 'pending';
  message: string;
  [key: string]: any;
}

interface HealthData {
  switchId: string;
  overall: 'healthy' | 'warning' | 'critical';
  checks: {
    messageOnRelays: HealthCheck;
    guardianAcknowledgments: HealthCheck;
    bitcoinCommitment: HealthCheck;
    heartbeatActive: HealthCheck;
    recipientsConfigured: HealthCheck;
    encryption: HealthCheck;
  };
  proofDocument: {
    available: boolean;
    documentId?: string;
    generatedAt?: string;
  };
  timestamp: string;
}

interface HealthCheckDashboardProps {
  switchId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function HealthCheckDashboard({
  switchId,
  autoRefresh = true,
  refreshInterval = 30000,
}: HealthCheckDashboardProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [switchId, autoRefresh, refreshInterval]);

  const fetchHealthData = async () => {
    try {
      const response = await api.get(`/api/switches/${switchId}/health-check`);
      setHealthData(response.data.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateProofDocument = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/api/switches/${switchId}/health-check/generate-proof`);
      showToast('Proof document generated', 'success');
      // Refresh health data to get new proof document info
      await fetchHealthData();
    } catch (error) {
      console.error('Failed to generate proof:', error);
      showToast('Failed to generate proof document', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-slate-400" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCheckIcon = (checkName: string) => {
    const icons: Record<string, typeof Activity> = {
      messageOnRelays: Radio,
      guardianAcknowledgments: Shield,
      bitcoinCommitment: Bitcoin,
      heartbeatActive: Activity,
      recipientsConfigured: Users,
      encryption: Lock,
    };
    const Icon = icons[checkName] || Activity;
    return <Icon className="w-4 h-4" />;
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'healthy':
        return 'bg-emerald-100 border-emerald-300 text-emerald-700';
      case 'warning':
        return 'bg-amber-100 border-amber-300 text-amber-700';
      case 'critical':
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
          <span className="ml-2 text-slate-500">Running health checks...</span>
        </div>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-500">
          <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Failed to load health data</p>
          <Button variant="secondary" onClick={fetchHealthData} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className={getOverallColor(healthData.overall)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {healthData.overall === 'healthy' && (
              <CheckCircle2 className="w-8 h-8" />
            )}
            {healthData.overall === 'warning' && (
              <AlertTriangle className="w-8 h-8" />
            )}
            {healthData.overall === 'critical' && (
              <XCircle className="w-8 h-8" />
            )}
            <div>
              <h3 className="text-lg font-bold uppercase">
                System {healthData.overall}
              </h3>
              <p className="text-sm opacity-75">
                Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={fetchHealthData}
            className="bg-white/50"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Health Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(healthData.checks).map(([key, check]) => (
          <Card key={key} className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-100 rounded">
                {getCheckIcon(key)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  {getStatusIcon(check.status)}
                </div>
                <p className="text-sm text-slate-500 mt-1">{check.message}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Proof Document Section */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold flex items-center gap-2">
              <Download className="w-4 h-4" />
              Proof Document
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {healthData.proofDocument.available
                ? `Generated ${new Date(healthData.proofDocument.generatedAt!).toLocaleDateString()}`
                : 'Generate a proof document for legal purposes'}
            </p>
          </div>
          <Button
            variant={healthData.proofDocument.available ? 'secondary' : 'primary'}
            onClick={generateProofDocument}
            disabled={generating}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : healthData.proofDocument.available ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Regenerate
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1" />
                Generate Proof
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Auto-refresh indicator */}
      {autoRefresh && lastRefresh && (
        <p className="text-xs text-slate-400 text-center">
          Auto-refreshing every {refreshInterval / 1000}s
        </p>
      )}
    </div>
  );
}
