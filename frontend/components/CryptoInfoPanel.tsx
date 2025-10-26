'use client'

import { Shield, Lock, Key, Database, Bitcoin } from 'lucide-react'
import Card from './ui/Card'

export default function CryptoInfoPanel() {
  return (
    <Card className="!bg-blue !text-white border-2 border-black">
      <div className="flex items-center mb-6">
        <Shield className="h-8 w-8 mr-3 text-white" strokeWidth={2} />
        <h3 className="text-2xl font-bold text-white">CRYPTOGRAPHIC SECURITY</h3>
      </div>

      <div className="space-y-6">
        {/* Encryption */}
        <div className="flex items-start">
          <Lock className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-white" strokeWidth={2} />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide mb-1 text-white">
              AES-256-GCM Encryption
            </p>
            <p className="text-sm font-mono text-white/90">
              Military-grade authenticated encryption with Galois/Counter Mode
            </p>
          </div>
        </div>

        {/* Secret Sharing */}
        <div className="flex items-start">
          <Key className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-white" strokeWidth={2} />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide mb-1 text-white">
              Shamir Secret Sharing (3-of-5)
            </p>
            <p className="text-sm font-mono text-white/90">
              Encryption key split into 5 fragments. Need 3 to decrypt. HMAC authenticated.
            </p>
          </div>
        </div>

        {/* Nostr Distribution */}
        <div className="flex items-start">
          <Database className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-white" strokeWidth={2} />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide mb-1 text-white">
              Nostr Protocol Distribution
            </p>
            <p className="text-sm font-mono text-white/90">
              Fragments distributed across 10+ decentralized relays (NIP-78)
            </p>
          </div>
        </div>

        {/* Bitcoin Timelock */}
        <div className="flex items-start">
          <Bitcoin className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-white" strokeWidth={2} />
          <div>
            <p className="font-bold text-sm uppercase tracking-wide mb-1 text-white">
              Bitcoin Timelock (Optional)
            </p>
            <p className="text-sm font-mono text-white/90">
              OP_CHECKLOCKTIMEVERIFY for blockchain-verified expiration
            </p>
          </div>
        </div>

        {/* Key Derivation */}
        <div className="border-t-2 border-white/30 pt-4 mt-4">
          <p className="text-xs font-mono text-white/80">
            <strong className="text-white">KEY DERIVATION:</strong> PBKDF2-SHA256 (600,000 iterations) •
            <strong className="text-white"> INTEGRITY:</strong> SHA-256 hashing •
            <strong className="text-white"> LIBRARY:</strong> Cure53 & Zellic audited
          </p>
        </div>
      </div>
    </Card>
  )
}
