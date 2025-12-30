/**
 * Heartbeat Card Component
 *
 * Displays heartbeat status and allows users to send heartbeats.
 * Part of Phase 2: Nostr-Native Heartbeats
 *
 * @see CLAUDE.md - Phase 2: Nostr-Native Heartbeats
 */

'use client';

import { useState, useEffect } from 'react';
import { Heart, Radio, CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useHeartbeat } from '@/lib/hooks/useHeartbeat';
import { checkHeartbeatStatus } from '@/lib/nostr';
import { showToast } from '@/components/ui/ToastContainer';

interface HeartbeatCardProps {
  switchId: string;
  switchTitle: string;
  nostrPublicKey: string;
  thresholdHours: number;
  onHeartbeatSent?: () => void;
}

export default function HeartbeatCard({
  switchId,
  switchTitle,
  nostrPublicKey,
  thresholdHours,
  onHeartbeatSent,
}: HeartbeatCardProps) {
  const { state, status, publishHeartbeat, checkStatus } = useHeartbeat(switchId);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check status on mount
  useEffect(() => {
    checkStatus(nostrPublicKey, thresholdHours);
  }, [nostrPublicKey, thresholdHours, checkStatus]);

  const handleSendHeartbeat = async () => {
    if (!password) {
      showToast('Please enter your password', 'error');
      return;
    }

    const success = await publishHeartbeat(password, []);

    if (success) {
      showToast(
        `Heartbeat sent to ${state.successfulRelays.length} relays`,
        'success'
      );
      setPassword('');
      setShowPassword(false);
      onHeartbeatSent?.();
      // Refresh status
      setTimeout(() => checkStatus(nostrPublicKey, thresholdHours), 2000);
    } else {
      showToast(state.error || 'Failed to send heartbeat', 'error');
    }
  };

  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() / 1000) - timestamp);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getStatusColor = () => {
    if (status.checking) return 'bg-gray-100';
    if (status.isAlive) return 'bg-green-50 border-green-200';
    return 'bg-red-50 border-red-200';
  };

  const getStatusIcon = () => {
    if (status.checking) return <Clock className="w-5 h-5 text-gray-400 animate-pulse" />;
    if (status.isAlive) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <Card className={`${getStatusColor()} transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{switchTitle}</h3>
            <p className="text-sm text-gray-600">
              Check-in every {thresholdHours} hours
            </p>
          </div>
        </div>
        {getStatusIcon()}
      </div>

      {/* Status Section */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-white border-2 border-black">
        <div>
          <p className="text-xs text-gray-500 uppercase">Last Heartbeat</p>
          <p className="font-mono text-sm">
            {formatTimeAgo(status.lastHeartbeat)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Status</p>
          <p className={`font-mono text-sm ${status.isAlive ? 'text-green-600' : 'text-red-600'}`}>
            {status.checking
              ? 'Checking...'
              : status.isAlive
              ? 'Active'
              : `Overdue ${status.hoursOverdue}h`}
          </p>
        </div>
      </div>

      {/* Relay Status */}
      {state.lastPublished && (
        <div className="mb-4 p-3 bg-white border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-blue" />
            <span className="text-xs font-bold uppercase">Relay Status</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.successfulRelays.map((relay) => (
              <span
                key={relay}
                className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1"
              >
                <Wifi className="w-3 h-3" />
                {new URL(relay).hostname}
              </span>
            ))}
            {state.failedRelays.map((relay) => (
              <span
                key={relay}
                className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1"
              >
                <WifiOff className="w-3 h-3" />
                {new URL(relay).hostname}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Send Heartbeat Form */}
      {!showPassword ? (
        <Button
          variant="primary"
          onClick={() => setShowPassword(true)}
          disabled={state.isPublishing}
          className="w-full"
        >
          <Heart className="w-4 h-4 mr-2" />
          Send Heartbeat
        </Button>
      ) : (
        <div className="space-y-3">
          <Input
            type="password"
            label="Enter your password to sign"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your encryption password"
            helperText="Your private key is needed to sign the heartbeat"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowPassword(false);
                setPassword('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendHeartbeat}
              disabled={state.isPublishing || !password}
              className="flex-1"
            >
              {state.isPublishing ? (
                <>
                  <Radio className="w-4 h-4 mr-2 animate-pulse" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Verification Note */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Heartbeats are signed with your key and published to Nostr.
        <br />
        Anyone can verify your status without trusting EchoLock.
      </p>
    </Card>
  );
}
