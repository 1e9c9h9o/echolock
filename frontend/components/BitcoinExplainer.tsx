/**
 * Bitcoin Explainer Component
 *
 * Educational component explaining why Bitcoin timelocks matter.
 * Features Simple/Technical toggle for different audiences.
 *
 * @see CLAUDE.md - Phase 4: Bitcoin Commitments
 */

'use client';

import { useState } from 'react';
import {
  Bitcoin,
  Shield,
  Lock,
  Globe,
  Clock,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type Mode = 'simple' | 'technical';

interface BitcoinExplainerProps {
  /** Default mode */
  defaultMode?: Mode;
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
  /** Custom title */
  title?: string;
  /** Show as inline (no border) */
  inline?: boolean;
}

export default function BitcoinExplainer({
  defaultMode = 'simple',
  defaultCollapsed = true,
  title = 'Why Bitcoin?',
  inline = false,
}: BitcoinExplainerProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const containerClass = inline
    ? ''
    : 'bg-gray-50 border-2 border-gray-200 p-4';

  return (
    <div className={containerClass}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="flex bg-gray-200 rounded p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMode('simple');
                }}
                className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                  mode === 'simple'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Simple
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMode('technical');
                }}
                className={`px-2 py-1 text-xs font-bold rounded transition-colors ${
                  mode === 'technical'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Technical
              </button>
            </div>
          )}
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="mt-4">
          {mode === 'simple' ? <SimpleExplanation /> : <TechnicalExplanation />}
        </div>
      )}
    </div>
  );
}

function SimpleExplanation() {
  return (
    <div className="space-y-4">
      {/* When to use */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          WHEN SHOULD I USE THIS?
        </h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>Skip Bitcoin if:</strong> Your message is personal notes, account passwords for family, or information where timing isn&apos;t critical.</p>
          <p><strong>Use Bitcoin if:</strong> Your message contains financial information, legal documents, sensitive secrets, or anything where you need <em>proof</em> of when the timer was set.</p>
        </div>
      </div>

      {/* The Problem */}
      <div className="p-3 bg-red-50 border border-red-200 rounded">
        <h4 className="font-bold text-sm text-red-800 mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          THE PROBLEM (without Bitcoin)
        </h4>
        <p className="text-sm text-red-700">
          Your switch still works, but you&apos;re trusting that:
        </p>
        <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4">
          <li>- EchoLock set your timer correctly</li>
          <li>- The timer wasn&apos;t modified later</li>
          <li>- EchoLock will still exist when needed</li>
        </ul>
        <p className="text-xs text-red-600 mt-2 italic">
          For most people, this is fine. The Guardian Network is decentralized.
        </p>
      </div>

      {/* The Solution */}
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        <h4 className="font-bold text-sm text-green-800 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          THE SOLUTION
        </h4>
        <p className="text-sm text-green-700 mb-2">
          Bitcoin creates <strong>permanent, public proof</strong>:
        </p>
        <ul className="text-sm text-green-700 space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
            Your timer is recorded on the blockchain
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
            ANYONE can verify when it was set
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
            No one can change it - not even us
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
            Works even if EchoLock disappears
          </li>
        </ul>
      </div>

      {/* Analogy */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-700">
          <strong>Think of it like getting a timestamp notarized</strong> - except
          the notary is the entire Bitcoin network, and the record lasts forever.
        </p>
      </div>

      {/* Cost */}
      <div className="p-3 bg-gray-100 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Cost:</span>
          <span className="text-sm">
            ~$1 <span className="text-gray-500">(1,000 satoshis)</span>
          </span>
        </div>
        <p className="text-xs text-gray-500">
          One-time payment. You&apos;ll need a Bitcoin wallet (testnet coins are free for testing).
        </p>
      </div>
    </div>
  );
}

function TechnicalExplanation() {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="p-3 bg-gray-100 border border-gray-300 rounded">
        <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
          <Bitcoin className="w-4 h-4" />
          Bitcoin Timelock Commitment (BIP-65)
        </h4>
        <p className="text-sm text-gray-700">
          Your switch timer is anchored to Bitcoin using{' '}
          <code className="bg-gray-200 px-1 rounded">OP_CHECKLOCKTIMEVERIFY</code>.
        </p>
      </div>

      {/* Mechanism */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-bold text-xs text-gray-600 uppercase tracking-wider mb-2">
          Mechanism
        </h4>
        <ol className="text-sm text-gray-700 space-y-2">
          <li>
            <strong>1. P2WSH address generated with encoded locktime:</strong>
            <code className="block mt-1 p-2 bg-gray-100 text-xs font-mono rounded overflow-x-auto">
              &lt;locktime&gt; OP_CLTV OP_DROP &lt;pubkey&gt; OP_CHECKSIG
            </code>
          </li>
          <li>
            <strong>2. Funding creates an immutable on-chain record:</strong>
            <ul className="ml-4 mt-1 text-xs text-gray-600 space-y-1">
              <li>- Block height proves creation time</li>
              <li>- Locktime encodes expiration</li>
              <li>- Script enforces release conditions</li>
            </ul>
          </li>
          <li>
            <strong>3. Verification is permissionless:</strong>
            <ul className="ml-4 mt-1 text-xs text-gray-600 space-y-1">
              <li>- Any block explorer can verify</li>
              <li>- No API keys or accounts needed</li>
              <li>- Works offline with a full node</li>
            </ul>
          </li>
        </ol>
      </div>

      {/* Properties */}
      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
        <h4 className="font-bold text-xs text-orange-700 uppercase tracking-wider mb-2">
          Security Properties
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800">Unforgeable</p>
              <p className="text-xs text-orange-600">Can&apos;t fake block timestamps</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800">Immutable</p>
              <p className="text-xs text-orange-600">Can&apos;t modify confirmed TXs</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800">Decentralized</p>
              <p className="text-xs text-orange-600">No single point of failure</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800">Censorship-resistant</p>
              <p className="text-xs text-orange-600">Miners can&apos;t block selectively</p>
            </div>
          </div>
        </div>
      </div>

      {/* References */}
      <div className="p-3 bg-gray-100 border border-gray-200 rounded">
        <h4 className="font-bold text-xs text-gray-600 uppercase tracking-wider mb-2">
          References
        </h4>
        <div className="space-y-1">
          <a
            href="https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3 h-3" />
            BIP-65: OP_CHECKLOCKTIMEVERIFY
          </a>
          <a
            href="https://en.bitcoin.it/wiki/Script"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3 h-3" />
            Bitcoin Script Reference
          </a>
          <a
            href="https://en.bitcoin.it/wiki/Protocol_documentation#Block_Headers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3 h-3" />
            Median Time Past (MTP)
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline version for embedding in other components
 */
export function BitcoinExplainerInline() {
  return (
    <BitcoinExplainer
      inline
      defaultCollapsed={false}
      title="Why Bitcoin?"
    />
  );
}
