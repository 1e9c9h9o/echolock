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
      {/* Industrial column marker */}
      <div className="column-marker hazard-stripe-thin" />

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
              <Link href="/sources" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors hidden sm:block">Sources</Link>
              <Link href="/auth/login" className="btn">Initialize</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hazard bar under header */}
      <div className="h-2 hazard-stripe" />

      {/* Hero */}
      <section className="py-10 lg:py-20">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Hero content */}
            <div>
              <div className="inline-block text-[10px] uppercase tracking-[0.2em] bg-black text-white px-4 py-2 mb-6">
                Open Source
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.05] mb-6 tracking-tight text-black">
                Cryptographic dead man's switch.
              </h1>
              <p className="text-sm text-black/80 mb-8 max-w-md">
                Delivers a message to someone you choose, but only if you stop checking in.
                Keys generated locally. Encryption key split across 5 guardians.
                Works without our servers.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/demo" className="btn">Try Live Demo</Link>
                <Link href="/auth/login" className="btn btn-black">Create Switch</Link>
                <a href="#technical" className="bg-white text-black px-6 py-3 font-bold border-4 border-black hover:bg-black hover:text-white transition-colors text-sm">View Specs</a>
              </div>
            </div>

            {/* Diagram panel */}
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Guardian Network Protocol</span>
                <span>REF: EL-001</span>
              </div>
              <div className="diagram-body">
                <div className="flex flex-col">
                  <div className="diagram-step">
                    <div className="diagram-num active">01</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Generate Keys Locally</div>
                      <div className="diagram-text">Nostr + Bitcoin + encryption keys in your browser</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">02</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Encrypt & Fragment</div>
                      <div className="diagram-text">AES-256-GCM + Shamir's Secret Sharing (3-of-5)</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">03</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Distribute to Guardians</div>
                      <div className="diagram-text">Friends, lawyers, services hold encrypted shares</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">04</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Sign Heartbeats</div>
                      <div className="diagram-text">Nostr events prove you're alive. Anyone can verify.</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">05</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Autonomous Release</div>
                      <div className="diagram-text">No heartbeat → Guardians publish → Recipients reconstruct</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Orange accent bar */}
      <div className="h-3 bg-orange" />

      {/* Specs */}
      <section className="bg-black text-white">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <div className="spec">
            <div className="spec-label">Keys</div>
            <div className="spec-value">User-Controlled</div>
          </div>
          <div className="spec">
            <div className="spec-label">Timer</div>
            <div className="spec-value">Guardian Network</div>
          </div>
          <div className="spec lg:border-r lg:border-white/20">
            <div className="spec-label">Proof</div>
            <div className="spec-value">Bitcoin</div>
          </div>
          <div className="spec">
            <div className="spec-label">Server Required</div>
            <div className="spec-value">None</div>
          </div>
        </div>
      </section>

      {/* Technical */}
      <section id="technical" className="py-20 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange" />
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Technical Implementation</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SPEC-001</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
            <div className="tech-item">
              <div className="tech-num">001</div>
              <div className="tech-title">Client-Side Cryptography</div>
              <div className="tech-desc">
                All keys generated in your browser. AES-256-GCM encryption, Nostr keypairs,
                and Bitcoin keys never leave your device. Server sees only encrypted blobs.
              </div>
              <div className="tech-spec">Zero-knowledge</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">002</div>
              <div className="tech-title">Guardian Network</div>
              <div className="tech-desc">
                Choose 5 guardians (friends, lawyers, services). Each holds one Shamir share.
                Any 3 can trigger release. No single guardian has power alone.
              </div>
              <div className="tech-spec">3-of-5 threshold</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">003</div>
              <div className="tech-title">Nostr Heartbeats</div>
              <div className="tech-desc">
                You sign heartbeat events with your Nostr key. Published to 7+ relays.
                Anyone can verify your proof-of-life. Guardians watch independently.
              </div>
              <div className="tech-spec">BIP-340 Schnorr</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 mt-1">
            <div className="tech-item">
              <div className="tech-num">004</div>
              <div className="tech-title">Bitcoin Timelocks</div>
              <div className="tech-desc">
                Optional OP_CHECKLOCKTIMEVERIFY commitment. Provides unforgeable timestamp
                proof. Verifiable on any block explorer without trusting EchoLock.
              </div>
              <div className="tech-spec">Mainnet ready</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">005</div>
              <div className="tech-title">Autonomous Release</div>
              <div className="tech-desc">
                When guardians detect silence, they publish shares to Nostr. Recipients
                collect 3+ shares, reconstruct the key, decrypt. No server involved.
              </div>
              <div className="tech-spec">Fully autonomous</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">006</div>
              <div className="tech-title">Self-Hostable</div>
              <div className="tech-desc">
                Run your own guardian daemon. Recovery tools work offline.
                Complete documentation for self-hosting. EchoLock is optional.
              </div>
              <div className="tech-spec">AGPL-3.0</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Promise */}
      <section className="bg-white border-t-4 border-b-4 border-black">
        <div className="flex items-stretch">
          <div className="w-16 flex-shrink-0 bg-orange" />
          <div className="p-8 flex items-center gap-6">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-2xl font-bold">✓</div>
            <div>
              <h3 className="text-base font-bold mb-1">The EchoLock Promise</h3>
              <p className="text-xs opacity-70 max-w-xl">
                If EchoLock disappears tomorrow, your switch still works. You have your keys.
                Your guardians are watching. Your heartbeats are on Nostr. Your message will
                release. We built this to be eliminable — because that's the only version worth building.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Proof Section - Show Don't Tell */}
      <section className="py-16 bg-black text-white">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[11px] uppercase tracking-[0.2em]">Proof of Work</h2>
            <div className="text-[10px] opacity-50 tracking-wider">VERIFIED STATS</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="text-center p-6 border border-white/20">
              <div className="text-3xl font-bold text-orange mb-2">501</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Unit Tests</div>
            </div>
            <div className="text-center p-6 border border-white/20">
              <div className="text-3xl font-bold text-orange mb-2">10</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Nostr Relays</div>
            </div>
            <div className="text-center p-6 border border-white/20">
              <div className="text-3xl font-bold text-orange mb-2">3/5</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Threshold</div>
            </div>
            <div className="text-center p-6 border border-white/20">
              <div className="text-3xl font-bold text-orange mb-2">0</div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">Server Keys</div>
            </div>
          </div>
          <div className="bg-white/5 p-6 font-mono text-xs overflow-x-auto">
            <div className="text-white/50 mb-2">// Your keys never leave your device</div>
            <div className="text-green-400">const keys = await crypto.subtle.generateKey(</div>
            <div className="text-white pl-4">{`{ name: 'AES-GCM', length: 256 },`}</div>
            <div className="text-white pl-4">true, ['encrypt', 'decrypt']</div>
            <div className="text-green-400">);</div>
            <div className="text-white/50 mt-2">// Server only sees: encrypted blobs + public keys</div>
          </div>
        </div>
      </section>

      {/* Trust Model */}
      <section className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[11px] uppercase tracking-[0.2em]">Trust Assumptions</h2>
            <div className="text-[10px] opacity-50 tracking-wider">SECURITY MODEL</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold mb-4 text-orange">Must Trust</h3>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-orange">→</span>
                  <span>Cryptographic primitives (AES-256-GCM, secp256k1, Shamir)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange">→</span>
                  <span>Your device security (where keys are generated)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange">→</span>
                  <span>At least 3 of your 5 guardians are honest and available</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-4">Need NOT Trust</h3>
              <ul className="space-y-2 text-xs opacity-70">
                <li className="flex items-start gap-2">
                  <span>✗</span>
                  <span>EchoLock (or any single company)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✗</span>
                  <span>Any individual Nostr relay</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✗</span>
                  <span>Any individual guardian (2 colluding cannot access)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>✗</span>
                  <span>Network infrastructure or ISPs</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container">
          <div className="flex justify-between items-start gap-12 flex-wrap">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10">
                  <LogoMark className="w-full h-full text-white" />
                </div>
                <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
              </div>
              <p className="text-[11px] opacity-50 max-w-[280px] leading-relaxed">
                Cryptographic dead man's switch.
                AGPL-3.0 license. Self-hostable.
              </p>
            </div>
            <div className="flex gap-12">
              <div className="footer-col">
                <h4>Resources</h4>
                <ul className="space-y-2">
                  <li><Link href="/docs">Documentation</Link></li>
                  <li><Link href="/docs#api">API Reference</Link></li>
                  <li><Link href="/docs#security">Security Policy</Link></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Source</h4>
                <ul className="space-y-2">
                  <li><a href="https://github.com/1e9c9h9o/echolock" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                  <li><Link href="/sources">Sources & Credits</Link></li>
                  <li><a href="https://github.com/1e9c9h9o/echolock/issues" target="_blank" rel="noopener noreferrer">Issues</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/10 text-[10px] opacity-40 flex justify-between flex-wrap gap-4 tracking-wider">
            <span>ECHOLOCK v1.0</span>
            <span>Network: Bitcoin Mainnet Ready</span>
            <span>Status: Fully Autonomous</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
