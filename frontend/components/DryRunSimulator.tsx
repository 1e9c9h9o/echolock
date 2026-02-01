/**
 * Dry Run Simulator Component
 *
 * Visual interface for running a simulation of the entire release process.
 * Shows step-by-step progress and provides confidence metrics.
 *
 * @see CLAUDE.md - Dry Run / Simulation Mode
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Shield,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Key,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  runDryRun,
  formatDuration,
  type SimulationStep,
  type SimulationResult,
  type SwitchConfig,
} from '@/lib/simulation/dryRun';

interface DryRunSimulatorProps {
  switchConfig: SwitchConfig;
  onComplete?: (result: SimulationResult) => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  'config-validation': <Shield className="w-5 h-5" />,
  'guardian-health': <Users className="w-5 h-5" />,
  'share-generation': <Key className="w-5 h-5" />,
  'key-reconstruction': <Zap className="w-5 h-5" />,
  'recipient-preview': <Mail className="w-5 h-5" />,
};

function StepStatusIcon({ status }: { status: SimulationStep['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-gray-400" />;
    case 'running':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
  }
}

function SimulationStepCard({
  step,
  expanded,
  onToggle,
}: {
  step: SimulationStep;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = step.details && Object.keys(step.details).length > 0;

  return (
    <Card
      className={`p-4 transition-all ${
        step.status === 'running'
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : step.status === 'error'
          ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
          : step.status === 'warning'
          ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10'
          : ''
      }`}
    >
      <div
        className={`flex items-center gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        <div className="text-gray-500">{STEP_ICONS[step.id]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{step.title}</h4>
            {step.duration !== undefined && (
              <span className="text-xs text-gray-500">({formatDuration(step.duration)})</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
          {step.error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{step.error}</p>
          )}
        </div>
        <StepStatusIcon status={step.status} />
        {hasDetails && (
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && step.details && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            {JSON.stringify(step.details, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export default function DryRunSimulator({ switchConfig, onComplete }: DryRunSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const handleProgress = useCallback((step: SimulationStep) => {
    setSteps((prev) => {
      const index = prev.findIndex((s) => s.id === step.id);
      if (index === -1) {
        return [...prev, step];
      }
      const updated = [...prev];
      updated[index] = step;
      return updated;
    });
  }, []);

  const runSimulation = async () => {
    setIsRunning(true);
    setSteps([]);
    setResult(null);
    setExpandedSteps(new Set());

    try {
      const simulationResult = await runDryRun(switchConfig, handleProgress, {
        queryLiveGuardians: false, // Could be toggled with a checkbox
      });

      setResult(simulationResult);
      onComplete?.(simulationResult);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getConfidenceScore = (result: SimulationResult): number => {
    if (result.overallStatus === 'fail') return 0;
    if (result.overallStatus === 'warning') {
      // Reduce score based on number of warnings
      return Math.max(50, 100 - result.warnings.length * 15);
    }
    return 100;
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dry Run Simulation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Test the entire release process without triggering your switch
          </p>
        </div>
        <Button
          onClick={runSimulation}
          disabled={isRunning}
          variant="primary"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Dry Test
            </>
          )}
        </Button>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step) => (
            <SimulationStepCard
              key={step.id}
              step={step}
              expanded={expandedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
            />
          ))}
        </div>
      )}

      {/* Results Summary */}
      {result && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            Simulation Results
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Confidence Score */}
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${getConfidenceColor(
                  getConfidenceScore(result)
                )}`}
              >
                {getConfidenceScore(result)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
            </div>

            {/* Guardian Status */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {result.guardiansResponded}/{result.guardiansTotal}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Guardians Ready</div>
            </div>

            {/* Threshold Met */}
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  result.thresholdMet ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {result.thresholdMet ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Threshold Met</div>
            </div>

            {/* Estimated Time */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {result.estimatedRecoveryTime > 0
                  ? formatDuration(result.estimatedRecoveryTime)
                  : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Est. Recovery Time</div>
            </div>
          </div>

          {/* Overall Status */}
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              result.overallStatus === 'pass'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : result.overallStatus === 'warning'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {result.overallStatus === 'pass' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  All systems go! Your switch is properly configured and ready.
                </span>
              </>
            ) : result.overallStatus === 'warning' ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Switch will work, but there are some concerns to address.
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span className="font-medium">
                  Critical issues found. Please address them before relying on this switch.
                </span>
              </>
            )}
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                Warnings ({result.warnings.length})
              </h5>
              <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-red-700 dark:text-red-400 mb-2">
                Errors ({result.errors.length})
              </h5>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                {result.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timing Info */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Simulation completed in{' '}
            {formatDuration(result.completedAt.getTime() - result.startedAt.getTime())} at{' '}
            {result.completedAt.toLocaleTimeString()}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isRunning && steps.length === 0 && (
        <Card className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4 dark:bg-blue-900 dark:text-blue-300">
            <Play className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Ready to Test
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Run a dry test to simulate the entire release process. This will test your
            configuration, check guardian availability, and verify that message recovery would
            work.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            No actual data is released during simulation.
          </p>
        </Card>
      )}
    </div>
  );
}
