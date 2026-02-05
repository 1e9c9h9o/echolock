'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { decryptWithRecoveryPassword } from '@/lib/crypto';
import Explainer from '@/components/ui/Explainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface RecoveryInfo {
  switchId: string;
  title: string;
  triggeredAt: string;
  hasPasswordRecovery: boolean;
  recoveryMethods: string[];
}

function RecoveryContent() {
  const searchParams = useSearchParams();
  const switchIdFromUrl = searchParams.get('switchId') || '';

  const [switchId, setSwitchId] = useState(switchIdFromUrl);
  const [password, setPassword] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveredMessage, setRecoveredMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Advanced mode state (Nostr keys)
  const [recipientNsec, setRecipientNsec] = useState('');
  const [recipientNpub, setRecipientNpub] = useState('');

  useEffect(() => {
    if (switchIdFromUrl) {
      setSwitchId(switchIdFromUrl);
      fetchRecoveryInfo(switchIdFromUrl);
    }
  }, [switchIdFromUrl]);

  const fetchRecoveryInfo = async (id: string) => {
    setLoadingInfo(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/recover/${id}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('This switch has not been triggered yet.');
        } else if (response.status === 404) {
          setError('Switch not found. Please check the link.');
        } else {
          setError(data.message || 'Failed to get recovery info');
        }
        return;
      }

      setRecoveryInfo(data.data);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    setError(null);
    setRecoveredMessage(null);

    if (!password) {
      setError('Please enter the recovery password');
      setIsRecovering(false);
      return;
    }

    try {
      // Fetch encrypted data from server
      const response = await fetch(`${API_URL}/api/recover/${switchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Recovery failed');
      }

      // Decrypt client-side using the password
      const message = await decryptWithRecoveryPassword(
        data.data.recoveryEncrypted,
        password
      );

      setRecoveredMessage(message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery failed';
      // Check for decryption errors which likely mean wrong password
      if (errorMessage.includes('decrypt') || errorMessage.includes('authentication')) {
        setError('Incorrect password. Please check and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const handleNostrRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    setError(null);
    setRecoveredMessage(null);

    if (!recipientNsec || !recipientNpub) {
      setError('Please enter both your private and public keys');
      setIsRecovering(false);
      return;
    }

    try {
      const { recoverMessage } = await import('@/lib/recovery/recover');

      const result = await recoverMessage(
        switchId,
        '', // userNpub not required
        recipientNpub,
        recipientNsec,
        undefined, // use default relays
        3 // default threshold
      );

      if (result.success && result.message) {
        setRecoveredMessage(result.message);
      } else {
        throw new Error(result.error || 'Recovery failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery failed';
      setError(errorMessage);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#7BA3C9] p-5 md:p-10">
      <div className="max-w-[600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-5 border-b-[3px] border-black">
          <svg className="w-[50px] h-[50px]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#000" strokeWidth="5" opacity="0.3"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#000" strokeWidth="5" opacity="0.6"/>
            <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
          </svg>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans tracking-tight">Recover Your Message</h1>
            <p className="text-gray-700 text-sm">Someone left you a{' '}
              <Explainer
                detail="This message was locked until the sender stopped checking in. Now that they have, it's been released to you."
                why="The sender wanted to make sure you'd receive this if something happened to them. The message was always meant for you."
              >
                protected message
              </Explainer>
            </p>
          </div>
        </div>

        {/* Success State */}
        {recoveredMessage && (
          <div className="mb-6">
            <div className="bg-green-100 border-[3px] border-green-600 p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 font-bold mb-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Message Recovered
              </div>
              {recoveryInfo?.title && (
                <p className="text-green-700 text-sm">{recoveryInfo.title}</p>
              )}
            </div>
            <div className="bg-white border-[3px] border-black p-6">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-bold">Your Message</div>
              <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 p-4 border-2 border-gray-200 rounded">
                {recoveredMessage}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loadingInfo && (
          <div className="bg-white border-[3px] border-black p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="font-mono text-sm">Loading recovery options...</p>
          </div>
        )}

        {/* Main Recovery Form - hide when message is recovered or loading */}
        {!recoveredMessage && !loadingInfo && (
          <>
            {/* Error Display */}
            {error && (
              <div className="mb-5 p-4 bg-red-100 border-[3px] border-red-500 text-red-700">
                <div className="font-bold mb-1">Recovery Error</div>
                <div className="text-sm">{error}</div>
              </div>
            )}

            {/* Recovery Info */}
            {recoveryInfo && (
              <div className="bg-white border-[3px] border-black p-5 mb-5 shadow-[4px_4px_0_#000]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-bold uppercase tracking-wide">
                    <Explainer
                      detail="The person who wrote this message set up a timer. They needed to check in regularly to keep the message locked. They stopped checking in, so the message was released to you."
                      why="This is sometimes called a 'dead man's switch' - a way to make sure important information reaches the right people if something happens."
                    >
                      Message Released
                    </Explainer>
                  </span>
                </div>
                {recoveryInfo.title && (
                  <h2 className="text-xl font-bold mb-2">{recoveryInfo.title}</h2>
                )}
                <p className="text-sm text-gray-600">
                  Released {new Date(recoveryInfo.triggeredAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Password Recovery (Simple Mode) */}
            {recoveryInfo?.hasPasswordRecovery && (
              <form onSubmit={handlePasswordRecovery}>
                <div className="bg-white p-5 border-[3px] border-black mb-5 shadow-[4px_4px_0_#000]">
                  <h2 className="font-bold text-lg mb-3">Enter the Password</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    The sender should have{' '}
                    <Explainer
                      detail="The password was shared separately from this link - maybe in person, over the phone, or in a text message. It's not in the email you received."
                      why="Keeping the password separate from the link means even if someone gets into your email, they still can't read the message."
                    >
                      shared a password
                    </Explainer>
                    {' '}with you.
                  </p>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full p-3 border-2 border-black font-mono text-base mb-4"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={isRecovering || !password}
                    className="w-full bg-[#FF6B00] text-white p-4 border-[3px] border-black font-bold text-lg uppercase tracking-wide shadow-[4px_4px_0_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isRecovering ? 'Decrypting...' : 'Recover Message'}
                  </button>
                </div>
              </form>
            )}

            {/* No password recovery available */}
            {recoveryInfo && !recoveryInfo.hasPasswordRecovery && (
              <div className="bg-amber-50 border-[3px] border-amber-400 p-5 mb-5">
                <h2 className="font-bold mb-2">Different Recovery Method Needed</h2>
                <p className="text-sm">
                  The sender set up a{' '}
                  <Explainer
                    detail="Instead of a simple password, the sender used cryptographic keys for extra security. You'll need the special keys they gave you to unlock this message."
                    why="This method is more secure but requires you to have received specific keys from the sender beforehand."
                  >
                    more advanced security method
                  </Explainer>
                  . Check the section below if you have the keys they shared with you.
                </p>
              </div>
            )}

            {/* Manual Switch ID Entry (if not from URL) */}
            {!switchIdFromUrl && !recoveryInfo && (
              <div className="bg-white p-5 border-[3px] border-black mb-5 shadow-[4px_4px_0_#000]">
                <h2 className="font-bold text-lg mb-3">Enter Switch ID</h2>
                <input
                  type="text"
                  value={switchId}
                  onChange={(e) => setSwitchId(e.target.value)}
                  placeholder="Paste switch ID from email"
                  className="w-full p-3 border-2 border-black font-mono text-sm mb-4"
                />
                <button
                  type="button"
                  onClick={() => fetchRecoveryInfo(switchId)}
                  disabled={!switchId || loadingInfo}
                  className="w-full bg-blue-600 text-white p-3 border-[3px] border-black font-bold uppercase tracking-wide disabled:bg-gray-400"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Advanced Mode Toggle */}
            {recoveryInfo && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-gray-600 text-sm flex items-center gap-1 hover:text-black"
                >
                  Advanced recovery (Nostr keys)
                  <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Advanced Mode (Nostr Keys) */}
            {showAdvanced && (
              <form onSubmit={handleNostrRecovery} className="mt-4">
                <div className="bg-gray-100 p-5 border-2 border-gray-300">
                  <h3 className="font-bold mb-4">Nostr Key Recovery</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    If you have Nostr keys assigned for this switch, enter them here.
                  </p>

                  <div className="mb-4">
                    <label className="block font-medium text-sm mb-1">Private Key (hex)</label>
                    <input
                      type="password"
                      value={recipientNsec}
                      onChange={(e) => setRecipientNsec(e.target.value.trim())}
                      placeholder="64-character hex"
                      className="w-full p-2 border-2 border-gray-400 font-mono text-xs"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block font-medium text-sm mb-1">Public Key (hex)</label>
                    <input
                      type="text"
                      value={recipientNpub}
                      onChange={(e) => setRecipientNpub(e.target.value.trim())}
                      placeholder="64-character hex"
                      className="w-full p-2 border-2 border-gray-400 font-mono text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRecovering || !recipientNsec || !recipientNpub}
                    className="w-full bg-gray-700 text-white p-3 border-2 border-black font-bold uppercase text-sm disabled:bg-gray-400"
                  >
                    {isRecovering ? 'Recovering...' : 'Recover with Nostr Keys'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Security Note */}
        <div className="mt-6 p-4 bg-white/50 border-2 border-black/20 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <Explainer
                detail="The message is unlocked right here in your browser. Your password is never sent anywhere - the decryption happens on your device."
                why="This means no one can intercept your password. Not us, not hackers, not anyone. The math happens locally."
              >
                <strong>Your privacy is protected.</strong>
              </Explainer>
              {' '}Only you can unlock this message with the password.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>EchoLock Recovery</p>
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
