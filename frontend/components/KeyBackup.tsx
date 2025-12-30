/**
 * Key Backup Component
 *
 * Allows users to export and import their encryption keys.
 * Keys are encrypted with the user's password before export.
 *
 * CRITICAL: If users lose their keys and their backup, they cannot
 * recover their messages. This component emphasizes this risk.
 *
 * @see CLAUDE.md - Phase 1: User-Controlled Keys
 */

'use client';

import { useState } from 'react';
import { Download, Upload, Shield, AlertTriangle, Key, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { exportAllKeys, importKeys, hasStoredKeys } from '@/lib/keystore';
import { showToast } from '@/components/ui/ToastContainer';

interface KeyBackupProps {
  onBackupComplete?: () => void;
}

export default function KeyBackup({ onBackupComplete }: KeyBackupProps) {
  const [mode, setMode] = useState<'menu' | 'export' | 'import'>('menu');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      const hasKeys = await hasStoredKeys();
      if (!hasKeys) {
        showToast('No keys to export', 'error');
        setLoading(false);
        return;
      }

      const backupData = await exportAllKeys(password);

      // Create download
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echolock-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Keys exported successfully! Store this file securely.', 'success');
      setMode('menu');
      setPassword('');
      setConfirmPassword('');
      onBackupComplete?.();
    } catch (error: any) {
      showToast(error.message || 'Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showToast('Please select a backup file', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      const backupData = await importFile.text();
      const result = await importKeys(backupData, password);

      showToast(
        `Imported ${result.imported} keys (${result.skipped} already existed)`,
        'success'
      );
      setMode('menu');
      setPassword('');
      setImportFile(null);
      onBackupComplete?.();
    } catch (error: any) {
      if (error.message.includes('Decryption')) {
        showToast('Wrong password or corrupted backup', 'error');
      } else {
        showToast(error.message || 'Import failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue/10 rounded-full flex items-center justify-center">
            <Key className="w-6 h-6 text-blue" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Key Management</h3>
            <p className="text-sm text-gray-600">
              Backup or restore your encryption keys
            </p>
          </div>
        </div>

        <div className="bg-orange/10 border-2 border-orange p-4 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Critical: Your keys are stored locally</p>
              <p className="text-sm mt-1">
                If you clear your browser data or switch devices without a backup,
                your messages will be permanently unrecoverable. Export your keys now.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('export')}
            className="p-6 border-2 border-black hover:bg-blue hover:text-white transition-colors text-left"
          >
            <Download className="w-8 h-8 mb-3" />
            <h4 className="font-bold text-lg mb-1">Export Keys</h4>
            <p className="text-sm opacity-80">
              Download encrypted backup of all your keys
            </p>
          </button>

          <button
            onClick={() => setMode('import')}
            className="p-6 border-2 border-black hover:bg-blue hover:text-white transition-colors text-left"
          >
            <Upload className="w-8 h-8 mb-3" />
            <h4 className="font-bold text-lg mb-1">Import Keys</h4>
            <p className="text-sm opacity-80">
              Restore keys from a backup file
            </p>
          </button>
        </div>

        <div className="mt-6 p-4 bg-green-50 border-2 border-green-200">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-green-800">Client-Side Encryption</p>
              <p className="text-sm text-green-700 mt-1">
                Your keys never leave your device. The server cannot decrypt your messages.
                This backup is encrypted with your password.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (mode === 'export') {
    return (
      <Card>
        <button
          onClick={() => setMode('menu')}
          className="text-blue hover:text-red font-mono text-sm mb-6"
        >
          ← Back to Key Management
        </button>

        <div className="flex items-center gap-4 mb-6">
          <Download className="w-8 h-8 text-blue" />
          <h3 className="text-xl font-bold">Export Keys</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Your keys will be encrypted with the password you provide.
          Store the backup file securely - you'll need this password to restore.
        </p>

        <div className="space-y-4">
          <Input
            type="password"
            label="Encryption Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a strong password"
            helperText="Minimum 8 characters. Use a unique password."
          />

          <Input
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
          />

          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full"
          >
            {loading ? 'Exporting...' : 'Download Encrypted Backup'}
          </Button>
        </div>
      </Card>
    );
  }

  if (mode === 'import') {
    return (
      <Card>
        <button
          onClick={() => setMode('menu')}
          className="text-blue hover:text-red font-mono text-sm mb-6"
        >
          ← Back to Key Management
        </button>

        <div className="flex items-center gap-4 mb-6">
          <Upload className="w-8 h-8 text-blue" />
          <h3 className="text-xl font-bold">Import Keys</h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Select your backup file and enter the password you used when exporting.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2">Backup File</label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full p-3 border-2 border-black"
            />
            {importFile && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {importFile.name}
              </p>
            )}
          </div>

          <Input
            type="password"
            label="Backup Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the password used when exporting"
          />

          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || !importFile || password.length < 8}
            className="w-full"
          >
            {loading ? 'Importing...' : 'Import Keys'}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
