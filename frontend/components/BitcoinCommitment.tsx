/**
 * Bitcoin Commitment Component
 *
 * Displays and manages Bitcoin timelock commitments.
 * Provides on-chain proof that a switch timer was set.
 *
 * @see CLAUDE.md - Phase 4: Bitcoin Commitments
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Bitcoin,
  Clock,
  ExternalLink,
  Check,
  AlertTriangle,
  Copy,
  RefreshCw,
  Shield,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { showToast } from '@/components/ui/ToastContainer';

interface CommitmentData {
  switchId: string;
  locktime: number;
  address: string;
  txid: string | null;
  amount: number;
  status: 'pending' | 'confirmed' | 'spent' | 'expired';
  network: 'testnet' | 'mainnet';
  blockHeight: number | null;
}

interface VerificationResult {
  verified: boolean;
  confirmed: boolean;
  blockHeight: number | null;
  spent: boolean;
  amount: number;
  explorerUrl: string;
  reason?: string;
}

interface BitcoinCommitmentProps {
  commitment: CommitmentData | null;
  onCreateCommitment?: () => void;
  onVerify?: () => void;
}

export default function BitcoinCommitment({
  commitment,
  onCreateCommitment,
  onVerify,
}: BitcoinCommitmentProps) {
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);

  useEffect(() => {
    // Fetch current block height on mount
    fetchBlockHeight();
  }, []);

  const fetchBlockHeight = async () => {
    try {
      const network = commitment?.network || 'testnet';
      const baseUrl = network === 'mainnet'
        ? 'https://mempool.space/api'
        : 'https://mempool.space/testnet/api';

      const response = await fetch(`${baseUrl}/blocks/tip/height`);
      if (response.ok) {
        const height = parseInt(await response.text(), 10);
        setCurrentBlockHeight(height);
      }
    } catch {
      // Silently fail - block height is optional
    }
  };

  const handleVerify = async () => {
    if (!commitment?.txid) return;

    setVerifying(true);
    try {
      const network = commitment.network;
      const baseUrl = network === 'mainnet'
        ? 'https://mempool.space/api'
        : 'https://mempool.space/testnet/api';

      // Fetch transaction
      const txResponse = await fetch(`${baseUrl}/tx/${commitment.txid}`);
      if (!txResponse.ok) {
        setVerification({
          verified: false,
          confirmed: false,
          blockHeight: null,
          spent: false,
          amount: 0,
          explorerUrl: '',
          reason: 'Transaction not found',
        });
        return;
      }

      const tx = await txResponse.json();

      // Check output
      const output = tx.vout[0];
      const confirmed = tx.status?.confirmed ?? false;
      const blockHeight = tx.status?.block_height ?? null;

      // Check if spent
      const utxoResponse = await fetch(`${baseUrl}/tx/${commitment.txid}/outspend/0`);
      const utxoData = await utxoResponse.json();
      const spent = utxoData.spent ?? false;

      const explorerUrl = network === 'mainnet'
        ? `https://mempool.space/tx/${commitment.txid}`
        : `https://mempool.space/testnet/tx/${commitment.txid}`;

      setVerification({
        verified: output?.scriptpubkey_address === commitment.address,
        confirmed,
        blockHeight,
        spent,
        amount: output?.value ?? 0,
        explorerUrl,
      });

      onVerify?.();
    } catch (error) {
      showToast('Failed to verify commitment', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const copyAddress = () => {
    if (commitment?.address) {
      navigator.clipboard.writeText(commitment.address);
      showToast('Address copied', 'success');
    }
  };

  const copyTxid = () => {
    if (commitment?.txid) {
      navigator.clipboard.writeText(commitment.txid);
      showToast('Transaction ID copied', 'success');
    }
  };

  const formatLocktime = (locktime: number) => {
    if (locktime < 500000000) {
      // Block height
      return `Block ${locktime.toLocaleString()}`;
    }
    // Unix timestamp
    return new Date(locktime * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!commitment) return null;

    const now = Math.floor(Date.now() / 1000);
    if (commitment.locktime < 500000000) {
      // Block height
      if (!currentBlockHeight) return 'Unknown';
      const blocksRemaining = commitment.locktime - currentBlockHeight;
      if (blocksRemaining <= 0) return 'Expired';
      const hoursRemaining = Math.ceil((blocksRemaining * 10) / 60);
      return `~${hoursRemaining} hours (${blocksRemaining} blocks)`;
    }

    // Timestamp
    const secondsRemaining = commitment.locktime - now;
    if (secondsRemaining <= 0) return 'Expired';
    const hoursRemaining = Math.ceil(secondsRemaining / 3600);
    if (hoursRemaining < 24) return `${hoursRemaining} hours`;
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `${daysRemaining} days`;
  };

  const getStatusBadge = () => {
    if (!commitment) return null;

    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Awaiting Funding' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'On-Chain' },
      spent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Spent (Alive)' },
      expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Expired' },
    };

    const config = statusConfig[commitment.status];
    return (
      <span className={`${config.bg} ${config.text} px-2 py-1 text-xs font-bold`}>
        {config.label}
      </span>
    );
  };

  if (!commitment) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Bitcoin className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Bitcoin Commitment</h3>
            <p className="text-sm text-gray-600">On-chain proof of timer</p>
          </div>
        </div>

        <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 mb-4">
          <Bitcoin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No commitment yet</p>
          <p className="text-sm text-gray-500">
            Create an on-chain proof that your timer was set
          </p>
        </div>

        <Button
          variant="primary"
          onClick={onCreateCommitment}
          className="w-full"
        >
          <Bitcoin className="w-4 h-4 mr-2" />
          Create Bitcoin Commitment
        </Button>

        <div className="mt-4 p-3 bg-orange-50 border-2 border-orange-200">
          <div className="flex gap-2">
            <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700">
              <strong>Optional but recommended.</strong> A Bitcoin commitment provides
              unforgeable proof that your timer was set at a specific time.
              Anyone can verify this on any block explorer.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={commitment.status === 'confirmed' ? 'border-green-200' : ''}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Bitcoin className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Bitcoin Commitment</h3>
            <p className="text-sm text-gray-600">
              {commitment.network === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Commitment Details */}
      <div className="space-y-3 mb-4">
        {/* Address */}
        <div className="p-3 bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Timelock Address</p>
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono break-all">{commitment.address}</code>
            <button onClick={copyAddress} className="ml-2 p-1 hover:bg-gray-200">
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Transaction ID */}
        {commitment.txid && (
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono">
                {commitment.txid.slice(0, 16)}...{commitment.txid.slice(-16)}
              </code>
              <div className="flex gap-1">
                <button onClick={copyTxid} className="p-1 hover:bg-gray-200">
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
                <a
                  href={`https://mempool.space/${commitment.network === 'testnet' ? 'testnet/' : ''}tx/${commitment.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-200"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Locktime & Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Expires</p>
            <p className="text-sm font-medium">{formatLocktime(commitment.locktime)}</p>
            <p className="text-xs text-gray-500">{getTimeRemaining()} remaining</p>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="text-sm font-medium">{commitment.amount.toLocaleString()} sats</p>
            <p className="text-xs text-gray-500">
              ~${((commitment.amount / 100000000) * 100000).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Section */}
      {commitment.txid && (
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={handleVerify}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Verify On-Chain
              </>
            )}
          </Button>

          {verification && (
            <div
              className={`mt-3 p-3 border-2 ${
                verification.verified
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {verification.verified ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-bold text-sm">
                  {verification.verified ? 'Verified On-Chain' : 'Verification Failed'}
                </span>
              </div>
              {verification.verified && (
                <div className="text-xs space-y-1">
                  <p>
                    <strong>Confirmed:</strong>{' '}
                    {verification.confirmed ? `Yes (Block ${verification.blockHeight})` : 'Pending'}
                  </p>
                  <p>
                    <strong>Amount:</strong> {verification.amount.toLocaleString()} sats
                  </p>
                  <p>
                    <strong>Spent:</strong> {verification.spent ? 'Yes (User alive)' : 'No'}
                  </p>
                </div>
              )}
              {verification.reason && (
                <p className="text-xs text-red-600">{verification.reason}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Funding Instructions (if pending) */}
      {commitment.status === 'pending' && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200">
          <div className="flex gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="font-bold text-sm text-yellow-800">Awaiting Funding</p>
          </div>
          <p className="text-sm text-yellow-700">
            Send <strong>{commitment.amount.toLocaleString()} sats</strong> to the address above
            to create your on-chain commitment. Use any Bitcoin wallet.
          </p>
        </div>
      )}

      {/* What This Proves */}
      <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200">
        <div className="flex gap-2">
          <Shield className="w-4 h-4 text-blue flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-bold">What This Proves</p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>Timer was set at a specific blockchain height</li>
              <li>Expires at {formatLocktime(commitment.locktime)}</li>
              <li>Verifiable by anyone on any block explorer</li>
              <li>Cannot be faked or backdated</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
