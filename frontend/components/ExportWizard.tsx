/**
 * Export Wizard Component
 *
 * Allows users to export their account data:
 * - Select what to include
 * - Set encryption password
 * - Download encrypted backup
 */

'use client';

import { useState } from 'react';
import {
  Download,
  Lock,
  Shield,
  Check,
  AlertTriangle,
  FileText,
  Users,
  Bell,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface ExportOptions {
  includeSwitches: boolean;
  includeGroups: boolean;
  includeContacts: boolean;
  includeSettings: boolean;
}

interface ExportWizardProps {
  onClose?: () => void;
}

export default function ExportWizard({ onClose }: ExportWizardProps) {
  const [step, setStep] = useState<'options' | 'password' | 'download'>('options');
  const [options, setOptions] = useState<ExportOptions>({
    includeSwitches: true,
    includeGroups: true,
    includeContacts: true,
    includeSettings: true,
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    encryptedBackup: string;
    checksum: string;
    summary: {
      switches: number;
      recipientGroups: number;
      emergencyContacts: number;
    };
  } | null>(null);

  const handleExport = async () => {
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setExporting(true);
    try {
      const response = await api.post('/api/account/export', {
        password,
        ...options,
      });

      setExportResult(response.data.data);
      setStep('download');
      showToast('Export generated', 'success');
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Export failed',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  const downloadBackup = () => {
    if (!exportResult) return;

    const blob = new Blob([exportResult.encryptedBackup], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echolock-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Backup downloaded', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Options */}
      {step === 'options' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase">Export Account</h3>
          </div>

          <Card>
            <p className="text-sm text-slate-500 mb-4">
              Select what to include in your backup. All data will be encrypted
              with a password you choose.
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={options.includeSwitches}
                  onChange={(e) =>
                    setOptions({ ...options, includeSwitches: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <FileText className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-bold">Switches</p>
                  <p className="text-sm text-slate-500">
                    Switch configurations and recipients (not encrypted messages)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={options.includeGroups}
                  onChange={(e) =>
                    setOptions({ ...options, includeGroups: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <Users className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-bold">Recipient Groups</p>
                  <p className="text-sm text-slate-500">
                    Groups for organizing recipients
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={options.includeContacts}
                  onChange={(e) =>
                    setOptions({ ...options, includeContacts: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <Bell className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-bold">Emergency Contacts</p>
                  <p className="text-sm text-slate-500">
                    Pre-trigger notification contacts
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Encrypted message content is not included.
                Messages are encrypted with your local keys and must be
                re-created when restoring.
              </p>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => setStep('password')}>
              Continue
            </Button>
            {onClose && (
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}

      {/* Step 2: Password */}
      {step === 'password' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase">Set Backup Password</h3>
          </div>

          <Card>
            <p className="text-sm text-slate-500 mb-4">
              Your backup will be encrypted with AES-256-GCM. Choose a strong
              password and store it safely - you'll need it to restore.
            </p>

            <div className="space-y-4">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                helperText="Use a strong, unique password"
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                error={
                  confirmPassword && password !== confirmPassword
                    ? 'Passwords do not match'
                    : undefined
                }
              />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={
                exporting ||
                password.length < 8 ||
                password !== confirmPassword
              }
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Export & Encrypt
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={() => setStep('options')}>
              Back
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Download */}
      {step === 'download' && exportResult && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold uppercase">Export Ready</h3>
          </div>

          <Card className="bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-full">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-800">
                  Backup generated
                </p>
                <p className="text-sm text-emerald-600">
                  Encrypted with your password
                </p>
              </div>
            </div>

            <div className="bg-white rounded p-4 mb-4">
              <h4 className="font-bold mb-2">Backup Contents</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {exportResult.summary.switches} switches
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  {exportResult.summary.recipientGroups} recipient groups
                </li>
                <li className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  {exportResult.summary.emergencyContacts} emergency contacts
                </li>
              </ul>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-slate-500 font-mono break-all">
                  Checksum: {exportResult.checksum.substring(0, 32)}...
                </p>
              </div>
            </div>

            <Button onClick={downloadBackup} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Encrypted Backup
            </Button>
          </Card>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-bold">Keep your password safe</p>
              <p>
                Without your password, you cannot restore this backup. Store
                both the backup file and password in a secure location.
              </p>
            </div>
          </div>

          {onClose && (
            <Button variant="secondary" onClick={onClose} className="w-full">
              Done
            </Button>
          )}
        </>
      )}
    </div>
  );
}
