'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://purplepag.es',
  'wss://relay.primal.net',
];

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: Date;
}

function RecoveryContent() {
  const searchParams = useSearchParams();
  const switchIdFromUrl = searchParams.get('switchId') || '';

  const [recipientNsec, setRecipientNsec] = useState('');
  const [recipientNpub, setRecipientNpub] = useState('');
  const [switchId, setSwitchId] = useState(switchIdFromUrl);
  const [userNpub, setUserNpub] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [relays, setRelays] = useState(DEFAULT_RELAYS.join('\n'));
  const [isRecovering, setIsRecovering] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [recoveredMessage, setRecoveredMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (switchIdFromUrl) {
      setSwitchId(switchIdFromUrl);
    }
  }, [switchIdFromUrl]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    setLogs([]);
    setRecoveredMessage(null);
    setError(null);
    setProgress(0);

    // Validation
    if (!recipientNsec || !recipientNpub || !switchId) {
      setError('Please fill in all required fields');
      setIsRecovering(false);
      return;
    }

    if (recipientNsec.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipientNsec)) {
      setError('Private key must be 64 hex characters');
      setIsRecovering(false);
      return;
    }

    if (recipientNpub.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipientNpub)) {
      setError('Public key must be 64 hex characters');
      setIsRecovering(false);
      return;
    }

    addLog('Starting recovery process...', 'info');
    addLog(`Switch ID: ${switchId}`, 'info');
    addLog(`Threshold: ${threshold} shares required`, 'info');

    try {
      // Dynamic import to load the recovery library
      const { recoverMessage } = await import('@/lib/recovery/recover');

      const relayList = relays.split('\n').map(r => r.trim()).filter(r => r.startsWith('wss://'));
      addLog(`Using ${relayList.length} relays`, 'info');

      setProgress(20);
      setProgressText('Searching for shares on Nostr...');
      addLog('Collecting released shares from Nostr...', 'info');

      // The recoverMessage function signature:
      // recoverMessage(switchId, userNpub, recipientNpub, recipientPrivateKey, relays?, threshold?)
      const result = await recoverMessage(
        switchId,
        userNpub || '', // userNpub is optional for filtering
        recipientNpub,
        recipientNsec,
        relayList,
        threshold
      );

      setProgress(80);
      addLog(`Shares used: ${result.sharesUsed}`, 'info');

      if (result.success && result.message) {
        setRecoveredMessage(result.message);
        addLog('Message successfully decrypted!', 'success');
        setProgress(100);
        setProgressText('Recovery complete!');
      } else {
        throw new Error(result.error || 'Recovery failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error: ${errorMessage}`, 'error');
      setError(errorMessage);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#7BA3C9] p-5 md:p-10">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b-[3px] border-black">
          <svg className="w-[60px] h-[60px]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#000" strokeWidth="5" opacity="0.3"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#000" strokeWidth="5" opacity="0.6"/>
            <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
          </svg>
          <div>
            <h1 className="text-[32px] font-bold font-sans tracking-tight">ECHOLOCK RECOVERY</h1>
            <p className="text-gray-700">Standalone message recovery - no server required</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#FFD000] border-[3px] border-black p-4 mb-5 font-bold">
          This tool runs entirely in your browser. Your private key never leaves your device.
          All cryptographic operations happen locally using WebCrypto API.
        </div>

        <form onSubmit={handleSubmit}>
          {/* Your Credentials */}
          <div className="bg-white p-6 border-[3px] border-black mb-5 shadow-[6px_6px_0_#000]">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-4">Your Credentials</h2>

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Your Nostr Private Key (hex format, 64 characters)
            </label>
            <input
              type="password"
              value={recipientNsec}
              onChange={(e) => setRecipientNsec(e.target.value)}
              placeholder="64-character hex private key"
              className="w-full p-3 border-2 border-black font-mono text-sm mb-4"
            />

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Your Nostr Public Key (hex format, 64 characters)
            </label>
            <input
              type="text"
              value={recipientNpub}
              onChange={(e) => setRecipientNpub(e.target.value)}
              placeholder="64-character hex public key"
              className="w-full p-3 border-2 border-black font-mono text-sm"
            />
          </div>

          {/* Switch Details */}
          <div className="bg-white p-6 border-[3px] border-black mb-5 shadow-[6px_6px_0_#000]">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-4">Switch Details</h2>

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Switch ID
            </label>
            <input
              type="text"
              value={switchId}
              onChange={(e) => setSwitchId(e.target.value)}
              placeholder="e.g., abc123def456..."
              className="w-full p-3 border-2 border-black font-mono text-sm mb-4"
            />

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Sender&apos;s Public Key (optional, helps filter results)
            </label>
            <input
              type="text"
              value={userNpub}
              onChange={(e) => setUserNpub(e.target.value)}
              placeholder="The original switch creator's public key"
              className="w-full p-3 border-2 border-black font-mono text-sm mb-4"
            />

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Recovery Threshold (shares required)
            </label>
            <div className="flex gap-3 items-center mb-4">
              <input
                type="number"
                min="2"
                max="15"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 3)}
                className="w-20 p-3 border-2 border-black font-mono text-sm"
              />
              <span className="text-xs text-gray-600">
                Common values: 2 (2-of-3), 3 (3-of-5), 4 (4-of-7), 5 (5-of-9)
              </span>
            </div>
          </div>

          {/* Relays */}
          <div className="bg-white p-6 border-[3px] border-black mb-5 shadow-[6px_6px_0_#000]">
            <h2 className="text-lg font-bold uppercase tracking-wide mb-4">Relays (optional)</h2>

            <label className="block font-bold text-xs uppercase tracking-widest mb-1">
              Nostr Relays (one per line)
            </label>
            <textarea
              value={relays}
              onChange={(e) => setRelays(e.target.value)}
              placeholder={DEFAULT_RELAYS.join('\n')}
              className="w-full p-3 border-2 border-black font-mono text-sm min-h-[100px] resize-y"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isRecovering}
            className="w-full bg-[#FF6B00] text-black p-5 border-[3px] border-black font-bold text-base uppercase tracking-widest shadow-[4px_4px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isRecovering ? 'RECOVERING...' : 'RECOVER MESSAGE'}
          </button>
        </form>

        {/* Progress */}
        {progress > 0 && (
          <div className="mt-5">
            <div className="h-2 bg-gray-300 border-2 border-black">
              <div
                className="h-full bg-[#FF6B00] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs mt-1">{progressText}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 p-4 bg-red-100 border-2 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-2">Recovery Log</h3>
            <div className="bg-[#0A0A0A] text-gray-300 p-4 font-mono text-xs max-h-[300px] overflow-y-auto border-2 border-black">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`mb-1 ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warn' ? 'text-yellow-400' :
                    'text-blue-300'
                  }`}
                >
                  [{log.timestamp.toLocaleTimeString()}] {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovered Message */}
        {recoveredMessage && (
          <div className="mt-5">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-2">Recovered Message</h3>
            <div className="bg-gray-100 border-[3px] border-green-500 p-5 whitespace-pre-wrap font-mono break-words">
              {recoveredMessage}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-white border-[3px] border-black p-5 mt-5 text-sm">
          <strong>How this works:</strong>
          <ol className="mt-3 pl-5 list-decimal space-y-2">
            <li>Queries Nostr relays for released shares (kind 30080)</li>
            <li>Decrypts each share using your private key (NIP-44 / secp256k1 ECDH)</li>
            <li>Reconstructs the encryption key using Shamir&apos;s Secret Sharing (configurable threshold)</li>
            <li>Fetches the encrypted message from Nostr (kind 30081)</li>
            <li>Decrypts the final message using AES-256-GCM</li>
          </ol>
          <p className="mt-4 p-3 bg-gray-100 border-2 border-black">
            <strong>No server needed.</strong> This page works even if EchoLock no longer exists.
            You can also use the <a href="/recovery-tool.html" className="text-[#FF6B00] underline">standalone recovery tool</a> which can be saved offline.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 p-4 bg-gray-800 text-gray-400 text-xs border-[3px] border-black">
          <div className="flex justify-between items-center">
            <span>EchoLock Recovery Tool v2.0.0</span>
            <span>Supported formats: v1-basic, v2-versioned</span>
          </div>
          <p className="mt-2 text-gray-500">
            This tool supports multiple share format versions for forward compatibility.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#7BA3C9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="font-mono">Loading recovery tool...</p>
        </div>
      </div>
    }>
      <RecoveryContent />
    </Suspense>
  );
}
