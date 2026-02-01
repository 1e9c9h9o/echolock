/**
 * Threshold Selector Component
 *
 * Allows users to select their Shamir secret sharing threshold configuration.
 * Provides preset options (2-of-3, 3-of-5, 4-of-7, 5-of-9) and custom mode.
 *
 * @see CLAUDE.md - Flexible M-of-N Thresholds
 */

'use client';

import { useState } from 'react';
import {
  Shield,
  Users,
  Lock,
  Building,
  Settings,
  Check,
  Info,
  AlertTriangle,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ThresholdConfig,
  THRESHOLD_PRESETS,
  DEFAULT_THRESHOLD,
  validateThreshold,
} from '@/lib/crypto';

interface ThresholdSelectorProps {
  value: ThresholdConfig;
  onChange: (config: ThresholdConfig) => void;
  disabled?: boolean;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  simple: <Users className="w-5 h-5" />,
  balanced: <Shield className="w-5 h-5" />,
  high: <Lock className="w-5 h-5" />,
  enterprise: <Building className="w-5 h-5" />,
};

export default function ThresholdSelector({
  value,
  onChange,
  disabled = false,
}: ThresholdSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(() => {
    // Check if current value matches a preset
    const matchingPreset = Object.entries(THRESHOLD_PRESETS).find(
      ([_, preset]) =>
        preset.totalShares === value.totalShares &&
        preset.threshold === value.threshold
    );
    return matchingPreset ? 'preset' : 'custom';
  });

  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    const matchingPreset = Object.entries(THRESHOLD_PRESETS).find(
      ([_, preset]) =>
        preset.totalShares === value.totalShares &&
        preset.threshold === value.threshold
    );
    return matchingPreset ? matchingPreset[0] : 'balanced';
  });

  const [customTotal, setCustomTotal] = useState(value.totalShares);
  const [customThreshold, setCustomThreshold] = useState(value.threshold);

  const handlePresetSelect = (presetKey: string) => {
    const preset = THRESHOLD_PRESETS[presetKey];
    setSelectedPreset(presetKey);
    onChange({
      totalShares: preset.totalShares,
      threshold: preset.threshold,
    });
  };

  const handleCustomChange = (total: number, threshold: number) => {
    setCustomTotal(total);
    setCustomThreshold(threshold);

    const validation = validateThreshold({ totalShares: total, threshold });
    if (validation.valid) {
      onChange({ totalShares: total, threshold });
    }
  };

  const validation = validateThreshold(value);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'preset' ? 'primary' : 'secondary'}
          className="text-xs px-3 py-2"
          onClick={() => {
            setMode('preset');
            handlePresetSelect(selectedPreset);
          }}
          disabled={disabled}
        >
          <Shield className="w-4 h-4 mr-1" />
          Presets
        </Button>
        <Button
          variant={mode === 'custom' ? 'primary' : 'secondary'}
          className="text-xs px-3 py-2"
          onClick={() => {
            setMode('custom');
            handleCustomChange(customTotal, customThreshold);
          }}
          disabled={disabled}
        >
          <Settings className="w-4 h-4 mr-1" />
          Custom
        </Button>
      </div>

      {mode === 'preset' ? (
        /* Preset Selection */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(THRESHOLD_PRESETS).map(([key, preset]) => {
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => !disabled && handlePresetSelect(key)}
                disabled={disabled}
                className={`p-4 cursor-pointer transition-all text-left w-full border-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-400'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {PRESET_ICONS[key]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {preset.name}
                      </h4>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                      {key === 'balanced' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {preset.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.useCases.map((useCase, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300"
                        >
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Custom Configuration */
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Custom Configuration
          </h4>

          <div className="space-y-4">
            {/* Total Shares Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Guardians (N): {customTotal}
              </label>
              <input
                type="range"
                min="2"
                max="15"
                value={customTotal}
                onChange={(e) => {
                  const total = parseInt(e.target.value);
                  const threshold = Math.min(customThreshold, total);
                  setCustomTotal(total);
                  setCustomThreshold(threshold);
                  handleCustomChange(total, threshold);
                }}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2</span>
                <span>15</span>
              </div>
            </div>

            {/* Threshold Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required to Recover (M): {customThreshold}
              </label>
              <input
                type="range"
                min="2"
                max={customTotal}
                value={customThreshold}
                onChange={(e) => {
                  const threshold = parseInt(e.target.value);
                  handleCustomChange(customTotal, threshold);
                }}
                disabled={disabled}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2</span>
                <span>{customTotal}</span>
              </div>
            </div>

            {/* Visual Representation */}
            <div className="flex items-center justify-center gap-1 py-4">
              {Array.from({ length: customTotal }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i < customThreshold
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {customThreshold} of {customTotal} guardians needed for recovery
            </p>
          </div>
        </Card>
      )}

      {/* Validation Error */}
      {!validation.valid && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {validation.error}
        </div>
      )}

      {/* Info Box */}
      <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p>
            <strong>{value.threshold}-of-{value.totalShares}</strong> means{' '}
            {value.totalShares} guardians will hold shares, and any{' '}
            {value.threshold} of them can recover your message.
          </p>
          <p className="mt-1">
            Higher thresholds provide more security but require more guardians
            to be available for recovery.
          </p>
        </div>
      </div>
    </div>
  );
}
