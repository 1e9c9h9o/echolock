'use client'

import { Shield, CheckCircle2 } from 'lucide-react'

interface SecurityStrengthProps {
  showDetails?: boolean
  compact?: boolean
}

export default function SecurityStrengthIndicator({
  showDetails = true,
  compact = false
}: SecurityStrengthProps) {
  const securityFeatures = [
    { name: 'AES-256-GCM', enabled: true },
    { name: 'Shamir (3/5)', enabled: true },
    { name: 'HMAC Auth', enabled: true },
    { name: 'Nostr Distributed', enabled: true },
    { name: 'PBKDF2 (600k)', enabled: true },
  ]

  const score = securityFeatures.filter(f => f.enabled).length
  const maxScore = securityFeatures.length

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green text-black border-2 border-black">
        <Shield className="h-4 w-4 text-black" strokeWidth={2} />
        <span className="font-bold text-sm text-black">MAXIMUM SECURITY</span>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-black p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Shield className="h-6 w-6 mr-2 text-green" strokeWidth={2} />
          <h4 className="text-lg font-bold text-black dark:text-white">SECURITY STRENGTH</h4>
        </div>
        <div className="px-4 py-2 bg-green border-2 border-black font-bold text-black">
          {score}/{maxScore}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-3">
          {securityFeatures.map((feature) => (
            <div key={feature.name} className="flex items-center">
              <CheckCircle2
                className={`h-5 w-5 mr-3 flex-shrink-0 ${
                  feature.enabled ? 'text-green' : 'text-gray-400'
                }`}
                strokeWidth={2}
              />
              <span className="font-mono text-sm text-black dark:text-white">{feature.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
        <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
          Your data is protected by military-grade cryptography and distributed across multiple decentralized networks.
        </p>
      </div>
    </div>
  )
}
