/**
 * Guardian Alert Settings Component
 *
 * Allows users to configure when and how they receive guardian health alerts.
 *
 * @see CLAUDE.md - Guardian Network health monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Webhook,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';

interface AlertSettings {
  alertOnWarning: boolean;
  alertOnCritical: boolean;
  alertHoursBeforeCritical: number;
  emailAlerts: boolean;
  webhookUrl: string | null;
  isDefault?: boolean;
}

export default function GuardianAlertSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    alertOnWarning: true,
    alertOnCritical: true,
    alertHoursBeforeCritical: 24,
    emailAlerts: true,
    webhookUrl: null,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/guardian-alert-settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alert settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/guardian-alert-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save settings');
      }

      showToast('Alert settings saved', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading settings...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Guardian Alert Settings
        </h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Alert Triggers */}
        <div>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
            Alert Triggers
          </h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alertOnWarning}
                onChange={(e) =>
                  setSettings({ ...settings, alertOnWarning: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Alert on warning status
                </span>
              </div>
              <span className="text-xs text-gray-500 ml-auto">
                When guardian hasn't checked in for 24-72 hours
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alertOnCritical}
                onChange={(e) =>
                  setSettings({ ...settings, alertOnCritical: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Alert on critical status
                </span>
              </div>
              <span className="text-xs text-gray-500 ml-auto">
                When guardian hasn't checked in for 7+ days
              </span>
            </label>
          </div>
        </div>

        {/* Proactive Alert Timing */}
        <div>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Proactive Alert Timing
          </h4>

          <div className="flex items-center gap-3">
            <span className="text-gray-600 dark:text-gray-400">
              Alert me
            </span>
            <Input
              type="number"
              min={1}
              max={168}
              value={settings.alertHoursBeforeCritical}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  alertHoursBeforeCritical: parseInt(e.target.value) || 24,
                })
              }
              className="w-20"
            />
            <span className="text-gray-600 dark:text-gray-400">
              hours before a guardian becomes critical
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Get an early warning so you can take action before it's too late.
          </p>
        </div>

        {/* Notification Channels */}
        <div>
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notification Channels
          </h4>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailAlerts}
                onChange={(e) =>
                  setSettings({ ...settings, emailAlerts: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Email notifications
              </span>
            </label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Webhook URL (optional)
                </span>
              </div>
              <Input
                type="url"
                placeholder="https://your-webhook-endpoint.com/alerts"
                value={settings.webhookUrl || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    webhookUrl: e.target.value || null,
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Receive JSON payloads at this URL when alerts are triggered.
                Must use HTTPS.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          {settings.isDefault && (
            <span className="text-sm text-gray-500">
              Using default settings
            </span>
          )}
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="ml-auto"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
