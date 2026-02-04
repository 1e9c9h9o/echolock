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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
      setError('Please enter both your private and public keys');
      setIsRecovering(false);
      return;
    }

    if (recipientNsec.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipientNsec)) {
      setError('Private key should be 64 characters (letters a-f and numbers only)');
      setIsRecovering(false);
      return;
    }

    if (recipientNpub.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipientNpub)) {
      setError('Public key should be 64 characters (letters a-f and numbers only)');
      setIsRecovering(false);
      return;
    }

    addLog('Starting recovery...', 'info');

    try {
      const { recoverMessage } = await import('@/lib/recovery/recover');

      const relayList = relays.split('\n').map(r => r.trim()).filter(r => r.startsWith('wss://'));

      setProgress(20);
      setProgressText('Looking for your message...');
      addLog('Searching for encrypted shares...', 'info');

      const result = await recoverMessage(
        switchId,
        userNpub || '',
        recipientNpub,
        recipientNsec,
        relayList,
        threshold
      );

      setProgress(80);

      if (result.success && result.message) {
        setRecoveredMessage(result.message);
        addLog('Message decrypted successfully!', 'success');
        setProgress(100);
        setProgressText('Done!');
      } else {
        throw new Error(result.error || 'Could not recover the message');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      addLog(`Error: ${errorMessage}`, 'error');
      setError(errorMessage);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#7BA3C9] p-5 md:p-10">
      <div className="max-w-[700px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b-[3px] border-black">
          <svg className="w-[50px] h-[50px]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#000" strokeWidth="5" opacity="0.3"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#000" strokeWidth="5" opacity="0.6"/>
            <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
          </svg>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans tracking-tight">Recover Your Message</h1>
            <p className="text-gray-700 text-sm">Someone left you an encrypted message</p>
          </div>
        </div>

        {/* Success State */}
        {recoveredMessage && (
          <div className="mb-6">
            <div className="bg-green-100 border-[3px] border-green-600 p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Message Recovered Successfully
              </div>
            </div>
            <div className="bg-white border-[3px] border-black p-6">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-bold">Your Message</div>
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 p-4 border-2 border-gray-200 rounded">
                {recoveredMessage}
              </div>
            </div>
          </div>
        )}

        {/* Main Form - hide when message is recovered */}
        {!recoveredMessage && (
          <>
            {/* Simple Explanation */}
            <div className="bg-white border-[3px] border-black p-5 mb-5 shadow-[4px_4px_0_#000]">
              <h2 className="font-bold text-lg mb-3">What you need</h2>
              <p className="text-gray-700 mb-4">
                The person who set up this message should have given you two special keys
                to decrypt it. These look like long strings of letters and numbers.
              </p>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[#FF6B00] font-medium text-sm flex items-center gap-1 hover:underline"
              >
                {showHelp ? 'Hide help' : "I don't have my keys"}
                <svg className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHelp && (
                <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded text-sm">
                  <p className="font-bold text-amber-800 mb-2">Where to find your keys:</p>
                  <ul className="list-disc pl-5 space-y-2 text-amber-900">
                    <li>Check if the sender gave you a file, document, or secure note with your keys</li>
                    <li>Look for an email or message from them with &ldquo;recovery keys&rdquo; or &ldquo;decryption keys&rdquo;</li>
                    <li>If you created an EchoLock account as a recipient, your keys are in Settings → Security</li>
                    <li>Contact other recipients of this message - they may be able to help</li>
                  </ul>
                  <p className="mt-3 text-amber-800">
                    <strong>Note:</strong> Without your keys, the message cannot be decrypted.
                    This is by design - it ensures only intended recipients can read it.
                  </p>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-5 p-4 bg-red-100 border-[3px] border-red-500 text-red-700">
                <div className="font-bold mb-1">Could not recover message</div>
                <div className="text-sm">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Your Keys */}
              <div className="bg-white p-5 border-[3px] border-black mb-5 shadow-[4px_4px_0_#000]">
                <h2 className="font-bold text-lg mb-4">Enter Your Keys</h2>

                <div className="mb-4">
                  <label className="block font-medium text-sm mb-1">
                    Your Private Key <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Keep this secret - never share it with anyone</p>
                  <input
                    type="password"
                    value={recipientNsec}
                    onChange={(e) => setRecipientNsec(e.target.value.trim())}
                    placeholder="Paste your private key here"
                    className="w-full p-3 border-2 border-black font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-sm mb-1">
                    Your Public Key <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">This identifies you as a recipient</p>
                  <input
                    type="text"
                    value={recipientNpub}
                    onChange={(e) => setRecipientNpub(e.target.value.trim())}
                    placeholder="Paste your public key here"
                    className="w-full p-3 border-2 border-black font-mono text-sm"
                  />
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-gray-600 text-sm flex items-center gap-1 hover:text-black"
                >
                  Advanced options
                  <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="bg-gray-100 p-5 border-2 border-gray-300 mb-5 space-y-4">
                  <div>
                    <label className="block font-medium text-sm mb-1">Switch ID</label>
                    <input
                      type="text"
                      value={switchId}
                      onChange={(e) => setSwitchId(e.target.value)}
                      className="w-full p-2 border-2 border-gray-400 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-sm mb-1">Sender&apos;s Public Key (optional)</label>
                    <input
                      type="text"
                      value={userNpub}
                      onChange={(e) => setUserNpub(e.target.value)}
                      placeholder="Helps filter results"
                      className="w-full p-2 border-2 border-gray-400 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-sm mb-1">Recovery Threshold</label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value) || 3)}
                      className="w-20 p-2 border-2 border-gray-400 font-mono text-sm"
                    />
                    <span className="text-xs text-gray-500 ml-2">shares needed (usually 3)</span>
                  </div>

                  <div>
                    <label className="block font-medium text-sm mb-1">Relay Servers</label>
                    <textarea
                      value={relays}
                      onChange={(e) => setRelays(e.target.value)}
                      className="w-full p-2 border-2 border-gray-400 font-mono text-xs h-24"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isRecovering || !recipientNsec || !recipientNpub}
                className="w-full bg-[#FF6B00] text-white p-4 border-[3px] border-black font-bold text-lg uppercase tracking-wide shadow-[4px_4px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[4px_4px_0_#000]"
              >
                {isRecovering ? 'Recovering...' : 'Recover Message'}
              </button>
            </form>

            {/* Progress */}
            {isRecovering && (
              <div className="mt-5 bg-white border-[3px] border-black p-4">
                <div className="h-2 bg-gray-200 border border-black mb-2">
                  <div
                    className="h-full bg-[#FF6B00] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{progressText}</p>
              </div>
            )}

            {/* Logs (collapsed by default) */}
            {logs.length > 0 && (
              <details className="mt-5">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-black">
                  Technical details ({logs.length} events)
                </summary>
                <div className="mt-2 bg-gray-900 text-gray-300 p-3 font-mono text-xs max-h-[200px] overflow-y-auto border-2 border-black">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className={`mb-1 ${
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        'text-blue-300'
                      }`}
                    >
                      {log.message}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {/* Security Note - always visible */}
        <div className="mt-6 p-4 bg-white/50 border-2 border-black/20 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <strong>Your privacy is protected.</strong> Everything happens in your browser.
              Your keys are never sent to any server.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>EchoLock Recovery Tool</p>
          <p className="mt-1">
            <a href="/recovery-tool.html" className="underline hover:text-black">
              Download offline version
            </a>
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
          <p className="font-mono">Loading...</p>
        </div>
      </div>
    }>
      <RecoveryContent />
    </Suspense>
  );
}
