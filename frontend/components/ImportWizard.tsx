/**
 * Import Wizard Component
 *
 * Allows users to restore from backup:
 * - Upload backup file
 * - Enter decryption password
 * - Preview and import
 */

'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  Lock,
  FileText,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  Users,
  Bell,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';
import api from '@/lib/api';

interface ImportResult {
  imported: {
    recipientGroups: number;
    emergencyContacts: number;
    switches: number;
    skipped: number;
    switchTemplates?: number;
  };
  note?: string;
}

interface ImportWizardProps {
  onClose?: () => void;
  onImportComplete?: () => void;
}

export default function ImportWizard({ onClose, onImportComplete }: ImportWizardProps) {
  const [step, setStep] = useState<'upload' | 'password' | 'preview' | 'complete'>('upload');
  const [backupContent, setBackupContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [password, setPassword] = useState('');
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite'>('skip');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Please select a JSON backup file', 'error');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Validate it's a valid JSON
        JSON.parse(content);
        setBackupContent(content);
        setStep('password');
      } catch (error) {
        showToast('Invalid backup file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!password) {
      showToast('Password is required', 'error');
      return;
    }

    setImporting(true);
    try {
      const response = await api.post('/api/account/import', {
        encryptedBackup: backupContent,
        password,
        conflictResolution,
      });

      setImportResult(response.data.data);
      setStep('complete');
      showToast('Import successful', 'success');
      onImportComplete?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Import failed';
      showToast(message, 'error');

      if (message.includes('password') || message.includes('decrypt')) {
        // Wrong password - stay on password step
      }
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep('upload');
    setBackupContent('');
    setFileName('');
    setPassword('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Upload */}
      {step === 'upload' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase">Import Backup</h3>
          </div>

          <Card>
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="font-bold">Click to upload backup file</p>
              <p className="text-sm text-slate-500 mt-1">
                or drag and drop your .json backup file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded text-sm text-slate-500">
              <p className="font-bold mb-1">Looking for your backup?</p>
              <p>
                Backup files are named like{' '}
                <code className="bg-slate-200 px-1 rounded">
                  echolock-backup-YYYY-MM-DD.json
                </code>
              </p>
            </div>
          </Card>

          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}
        </>
      )}

      {/* Step 2: Password */}
      {step === 'password' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5" />
            <h3 className="text-lg font-bold uppercase">Decrypt Backup</h3>
          </div>

          <Card>
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded">
              <FileText className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-bold">{fileName}</p>
                <p className="text-sm text-slate-500">Selected backup file</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Backup Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the password used to encrypt this backup"
              />

              <div>
                <label className="block text-sm font-bold mb-2">
                  If data already exists:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="conflict"
                      checked={conflictResolution === 'skip'}
                      onChange={() => setConflictResolution('skip')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-bold">Skip duplicates</p>
                      <p className="text-sm text-slate-500">
                        Keep existing data, only import new items
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="conflict"
                      checked={conflictResolution === 'overwrite'}
                      onChange={() => setConflictResolution('overwrite')}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-bold">Overwrite existing</p>
                      <p className="text-sm text-slate-500">
                        Replace existing data with backup data
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || !password}>
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Backup
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={resetWizard}>
              Back
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && importResult && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold uppercase">Import Complete</h3>
          </div>

          <Card className="bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-full">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-800">
                  Backup restored
                </p>
              </div>
            </div>

            <div className="bg-white rounded p-4 mb-4">
              <h4 className="font-bold mb-2">Imported Items</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  {importResult.imported.recipientGroups} recipient groups
                </li>
                <li className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  {importResult.imported.emergencyContacts} emergency contacts
                </li>
                {importResult.imported.skipped > 0 && (
                  <li className="flex items-center gap-2 text-amber-600">
                    <X className="w-4 h-4" />
                    {importResult.imported.skipped} items skipped (already exist)
                  </li>
                )}
              </ul>
            </div>

            {importResult.note && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">{importResult.note}</p>
              </div>
            )}
          </Card>

          <div className="flex gap-2">
            {onClose && (
              <Button onClick={onClose}>Done</Button>
            )}
            <Button variant="secondary" onClick={resetWizard}>
              Import Another
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
