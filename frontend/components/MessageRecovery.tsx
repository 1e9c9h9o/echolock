/**
 * Message Recovery Component
 *
 * Allows recipients to recover messages without any server.
 * Queries Nostr directly for released shares.
 *
 * @see CLAUDE.md - Phase 5: Full Autonomy
 */

'use client';

import { useState } from 'react';
import {
  Key,
  Search,
  Shield,
  Check,
  AlertTriangle,
  Download,
  Lock,
  Unlock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { showToast } from '@/components/ui/ToastContainer';
import {
  recoverMessage,
  checkRecoveryStatus,
  RecoveryResult,
} from '@/lib/recovery';

interface MessageRecoveryProps {
  onRecovered?: (message: string) => void;
}

export default function MessageRecovery({ onRecovered }: MessageRecoveryProps) {
  const [switchId, setSwitchId] = useState('');
  const [userNpub, setUserNpub] = useState('');
  const [recipientNpub, setRecipientNpub] = useState('');
  const [recipientNsec, setRecipientNsec] = useState('');

  const [checking, setChecking] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [status, setStatus] = useState<{
    sharesReleased: number;
    canRecover: boolean;
    guardians: string[];
  } | null>(null);
  const [result, setResult] = useState<RecoveryResult | null>(null);

  const handleCheckStatus = async () => {
    if (!switchId || !recipientNpub) {
      showToast('Please enter switch ID and your public key', 'error');
      return;
    }

    setChecking(true);
    setStatus(null);

    try {
      const checkResult = await checkRecoveryStatus(switchId, recipientNpub);
      setStatus(checkResult);

      if (checkResult.canRecover) {
        showToast(`${checkResult.sharesReleased} shares found - recovery possible!`, 'success');
      } else {
        showToast(
          `Only ${checkResult.sharesReleased} shares released. Need 3 to recover.`,
          'warning'
        );
      }
    } catch (error) {
      showToast('Failed to check status', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleRecover = async () => {
    if (!switchId || !recipientNpub || !recipientNsec) {
      showToast('Please fill in all fields including your private key', 'error');
      return;
    }

    setRecovering(true);
    setResult(null);

    try {
      const recoveryResult = await recoverMessage(
        switchId,
        userNpub || '',
        recipientNpub,
        recipientNsec
      );

      setResult(recoveryResult);

      if (recoveryResult.success && recoveryResult.message) {
        showToast('Message recovered successfully!', 'success');
        onRecovered?.(recoveryResult.message);
      } else {
        showToast(recoveryResult.error || 'Recovery failed', 'error');
      }
    } catch (error) {
      showToast('Recovery failed', 'error');
    } finally {
      setRecovering(false);
    }
  };

  const downloadMessage = () => {
    if (!result?.message) return;

    const blob = new Blob([result.message], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echolock-message-${switchId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Unlock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Message Recovery</h3>
            <p className="text-sm text-gray-600">
              Recover messages directly from Nostr - no server needed
            </p>
          </div>
        </div>

        {/* Switch Details */}
        <div className="space-y-4 mb-6">
          <Input
            label="Switch ID"
            value={switchId}
            onChange={(e) => setSwitchId(e.target.value)}
            placeholder="The switch identifier"
          />

          <Input
            label="Sender's Public Key (optional)"
            value={userNpub}
            onChange={(e) => setUserNpub(e.target.value)}
            placeholder="64-character hex (helps find the message)"
          />
        </div>

        {/* Recipient Credentials */}
        <div className="space-y-4 mb-6">
          <Input
            label="Your Nostr Public Key"
            value={recipientNpub}
            onChange={(e) => setRecipientNpub(e.target.value)}
            placeholder="Your npub in hex format"
          />

          <Input
            type="password"
            label="Your Nostr Private Key"
            value={recipientNsec}
            onChange={(e) => setRecipientNsec(e.target.value)}
            placeholder="Your nsec in hex format (never sent anywhere)"
            helperText="Your private key stays in your browser - it's used to decrypt shares"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCheckStatus}
            disabled={checking || !switchId || !recipientNpub}
            className="flex-1"
          >
            {checking ? (
              <>
                <Search className="w-4 h-4 mr-2 animate-pulse" />
                Checking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Check Status
              </>
            )}
          </Button>

          <Button
            variant="primary"
            onClick={handleRecover}
            disabled={recovering || !switchId || !recipientNpub || !recipientNsec}
            className="flex-1"
          >
            {recovering ? (
              <>
                <Lock className="w-4 h-4 mr-2 animate-pulse" />
                Recovering...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Recover Message
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Status Display */}
      {status && (
        <Card className={status.canRecover ? 'border-green-200' : 'border-yellow-200'}>
          <div className="flex items-center gap-3 mb-4">
            {status.canRecover ? (
              <Check className="w-6 h-6 text-green-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            )}
            <div>
              <h4 className="font-bold">
                {status.canRecover ? 'Recovery Available' : 'Not Ready Yet'}
              </h4>
              <p className="text-sm text-gray-600">
                {status.sharesReleased} of 3 shares released
              </p>
            </div>
          </div>

          {status.guardians.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Releasing Guardians:</p>
              <div className="space-y-1">
                {status.guardians.map((g, i) => (
                  <p key={i} className="text-xs font-mono">
                    {g.slice(0, 8)}...{g.slice(-8)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recovery Result */}
      {result && (
        <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
          {result.success ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-bold text-green-800">Message Recovered</h4>
                    <p className="text-sm text-gray-600">
                      Used {result.sharesUsed} shares
                    </p>
                  </div>
                </div>
                <Button variant="secondary" onClick={downloadMessage}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="p-4 bg-gray-50 border-2 border-gray-200 font-mono text-sm whitespace-pre-wrap">
                {result.message}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h4 className="font-bold text-red-800">Recovery Failed</h4>
                <p className="text-sm text-gray-600">{result.error}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-blue-800 mb-2">How Recovery Works</p>
            <ol className="list-decimal ml-4 space-y-1 text-blue-700">
              <li>We query Nostr relays for released shares (kind 30080)</li>
              <li>You decrypt each share with your private key (NIP-44)</li>
              <li>We reconstruct the encryption key (Shamir 3-of-5)</li>
              <li>We fetch the encrypted message from Nostr (kind 30081)</li>
              <li>We decrypt the message locally (AES-256-GCM)</li>
            </ol>
            <p className="mt-3 font-bold text-blue-800">
              No server is involved. This works even if EchoLock doesn't exist.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
