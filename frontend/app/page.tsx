'use client'

import Link from 'next/link'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10">
                <LogoMark className="w-full h-full text-white" />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/guide" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Guide</Link>
              <Link href="/docs" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Docs</Link>
              <Link href="/demo" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Demo</Link>
              <Link href="/auth/login" className="btn">Log In</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="h-2 hazard-stripe" />

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-black">
              A message that delivers itself when you can't.
            </h1>
            <p className="text-base text-black/80 mb-8 leading-relaxed">
              Write a message. Choose who receives it. Check in periodically to keep it locked.
              If you stop checking in, the message is delivered. No one can read it until then. Not even us.
            </p>
            <div className="flex gap-3">
              <Link href="/demo" className="btn">Demo</Link>
              <Link href="/guide" className="btn btn-black">How It Works</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="bg-black text-white">
        <div className="container px-0 lg:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="spec">
            <div className="spec-label">Encryption</div>
            <div className="spec-value">AES-256-GCM</div>
          </div>
          <div className="spec">
            <div className="spec-label">Key Splitting</div>
            <div className="spec-value">Shamir 3-of-5</div>
          </div>
          <div className="spec">
            <div className="spec-label">Protocol</div>
            <div className="spec-value">Nostr</div>
          </div>
          <div className="spec">
            <div className="spec-label">Server Dependency</div>
            <div className="spec-value">None</div>
          </div>
        </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-black/40 mb-2">01</div>
              <h3 className="font-bold mb-2">Write</h3>
              <p className="text-sm text-black/70">
                Compose your message. It's encrypted in your browser before it leaves your device.
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-black/40 mb-2">02</div>
              <h3 className="font-bold mb-2">Check In</h3>
              <p className="text-sm text-black/70">
                Confirm you're okay at an interval you choose. Each check-in resets the timer.
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-black/40 mb-2">03</div>
              <h3 className="font-bold mb-2">Delivery</h3>
              <p className="text-sm text-black/70">
                If you stop checking in, your recipients receive the message automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-8 bg-orange" />
            <h2 className="text-[11px] uppercase tracking-[0.2em]">Architecture</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Client-Side Encryption</h3>
                <p className="text-sm text-black/70">
                  All cryptographic operations happen in your browser. Keys are generated locally and never transmitted.
                  The server stores only encrypted data.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Guardian Network</h3>
                <p className="text-sm text-black/70">
                  Your encryption key is split into 5 shares using Shamir's Secret Sharing.
                  Each share is held by a guardian. Any 3 shares can reconstruct the key.
                  No individual guardian can access your message.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Decentralized Storage</h3>
                <p className="text-sm text-black/70">
                  Messages and heartbeats are stored on Nostr relays.
                  The system functions without EchoLock's servers.
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-black p-6">
              <div className="text-[11px] uppercase tracking-wider text-black/40 mb-4">Trust Model</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-black/10">
                  <span className="text-black/70">EchoLock servers</span>
                  <span className="font-bold">Not required</span>
                </div>
                <div className="flex justify-between py-2 border-b border-black/10">
                  <span className="text-black/70">Individual guardian</span>
                  <span className="font-bold">Cannot access alone</span>
                </div>
                <div className="flex justify-between py-2 border-b border-black/10">
                  <span className="text-black/70">Any 2 guardians colluding</span>
                  <span className="font-bold">Cannot access</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-black/70">Any 3 guardians</span>
                  <span className="font-bold">Can reconstruct key</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Optional Bitcoin */}
      <section className="bg-black text-white py-12">
        <div className="container">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Optional</div>
            <h3 className="font-bold mb-3">Bitcoin Timelock</h3>
            <p className="text-sm text-white/60">
              For additional verification, you can anchor your timer to the Bitcoin blockchain.
              This creates a cryptographic proof of when your switch was set,
              verifiable by anyone without trusting EchoLock.
            </p>
          </div>
        </div>
      </section>

      {/* Source */}
      <section className="py-12 bg-white border-t-2 border-black">
        <div className="container">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-black/70">
              Open source. AGPL-3.0. Self-hostable.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="https://github.com/1e9c9h9o/echolock" target="_blank" rel="noopener noreferrer" className="text-black hover:text-orange transition-colors">
                GitHub
              </a>
              <Link href="/docs" className="text-black hover:text-orange transition-colors">
                Documentation
              </Link>
              <Link href="/sources" className="text-black hover:text-orange transition-colors">
                Sources
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8">
                <LogoMark className="w-full h-full text-white" />
              </div>
              <span className="text-xs tracking-wider uppercase opacity-50">Echolock v1.0</span>
            </div>
            <div className="text-xs opacity-40">
              AGPL-3.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
