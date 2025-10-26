'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Activity } from 'lucide-react'
import Card from './ui/Card'

// Nostr relays from backend constants
const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
  'wss://relay.snort.social',
  'wss://nos.lol',
  'wss://nostr.mom',
  'wss://relay.current.fyi',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.bg',
  'wss://nostr.orangepill.dev',
]

interface RelayStatus {
  url: string
  status: 'connected' | 'disconnected' | 'checking'
  latency?: number
}

export default function NostrRelayHealth() {
  const [relays, setRelays] = useState<RelayStatus[]>(
    NOSTR_RELAYS.map(url => ({ url, status: 'checking' as const }))
  )

  useEffect(() => {
    // Simulate relay health check
    // In production, this would actually check WebSocket connections
    const checkRelays = async () => {
      const updated = NOSTR_RELAYS.map(url => ({
        url,
        status: Math.random() > 0.1 ? ('connected' as const) : ('disconnected' as const),
        latency: Math.random() > 0.1 ? Math.floor(Math.random() * 500) + 50 : undefined,
      }))
      setRelays(updated)
    }

    const timer = setTimeout(checkRelays, 1000)
    return () => clearTimeout(timer)
  }, [])

  const connectedCount = relays.filter(r => r.status === 'connected').length
  const healthPercentage = Math.round((connectedCount / relays.length) * 100)

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Activity className="h-6 w-6 mr-3" strokeWidth={2} />
          <h3 className="text-xl font-bold">NOSTR RELAY NETWORK</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 border-2 border-black font-bold text-sm ${
            healthPercentage >= 70 ? 'bg-green text-black' :
            healthPercentage >= 50 ? 'bg-yellow text-black' :
            'bg-red text-cream'
          }`}>
            {connectedCount}/{relays.length} ONLINE
          </div>
        </div>
      </div>

      {/* Health bar */}
      <div className="mb-6">
        <div className="h-3 w-full border-2 border-black bg-cream">
          <div
            className={`h-full transition-all duration-500 ${
              healthPercentage >= 70 ? 'bg-green' :
              healthPercentage >= 50 ? 'bg-yellow' :
              'bg-red'
            }`}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
        <p className="text-xs font-mono mt-2 text-gray-600">
          Minimum 7 relays required for redundancy • {healthPercentage}% network health
        </p>
      </div>

      {/* Relay list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {relays.map((relay) => (
          <div
            key={relay.url}
            className="flex items-center justify-between p-3 border border-gray-300 bg-white hover:border-black transition-colors"
          >
            <div className="flex items-center flex-1 min-w-0">
              {relay.status === 'connected' ? (
                <Wifi className="h-4 w-4 mr-2 text-green flex-shrink-0" strokeWidth={2} />
              ) : relay.status === 'disconnected' ? (
                <WifiOff className="h-4 w-4 mr-2 text-red flex-shrink-0" strokeWidth={2} />
              ) : (
                <div className="h-4 w-4 mr-2 animate-pulse bg-gray-400 flex-shrink-0" />
              )}
              <span className="font-mono text-xs truncate">
                {relay.url.replace('wss://', '')}
              </span>
            </div>
            {relay.latency && (
              <span className="text-xs font-mono text-gray-600 ml-2 flex-shrink-0">
                {relay.latency}ms
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t-2 border-black">
        <p className="text-xs font-mono text-gray-700">
          <strong>NIP SUPPORT:</strong> NIP-01 (Events) • NIP-40 (Expiration) • NIP-78 (Parameterized Replaceable)
        </p>
      </div>
    </Card>
  )
}
