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
              <a href="#" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Docs</a>
              <a href="#" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Source</a>
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
                Cryptographic Infrastructure
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.05] mb-6 tracking-tight text-black">
                Decentralized dead man's switch.<br/>
                <span className="text-orange">No single point of failure.</span>
              </h1>
              <p className="text-sm text-black/80 mb-8 max-w-md">
                Encrypt. Fragment. Distribute. Release. Messages secured with AES-256-GCM,
                split via Shamir's Secret Sharing, broadcast across global Nostr relays,
                timestamped on Bitcoin.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/auth/login" className="btn">Initialize Switch</Link>
                <a href="#technical" className="btn btn-black">View Specifications</a>
              </div>
            </div>

            {/* Diagram panel */}
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>System Operation Flow</span>
                <span>REF: EL-001</span>
              </div>
              <div className="diagram-body">
                <div className="flex flex-col">
                  <div className="diagram-step">
                    <div className="diagram-num active">01</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Encrypt Message</div>
                      <div className="diagram-text">AES-256-GCM authenticated encryption</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">02</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Fragment Key</div>
                      <div className="diagram-text">Shamir's Secret Sharing (3-of-5)</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">03</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Distribute</div>
                      <div className="diagram-text">7+ Nostr relays globally</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">04</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Timelock</div>
                      <div className="diagram-text">Bitcoin OP_CHECKLOCKTIMEVERIFY</div>
                    </div>
                  </div>
                  <div className="diagram-step">
                    <div className="diagram-num">05</div>
                    <div className="diagram-content">
                      <div className="diagram-label">Release</div>
                      <div className="diagram-text">Check-in failure → reconstruction</div>
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
            <div className="spec-label">Encryption</div>
            <div className="spec-value">AES-256-GCM</div>
          </div>
          <div className="spec">
            <div className="spec-label">Key Split</div>
            <div className="spec-value">3-of-5 SSS</div>
          </div>
          <div className="spec lg:border-r lg:border-white/20">
            <div className="spec-label">Relay Network</div>
            <div className="spec-value">7+ Nodes</div>
          </div>
          <div className="spec">
            <div className="spec-label">Timestamp</div>
            <div className="spec-value">Bitcoin</div>
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
              <div className="tech-title">Encryption Layer</div>
              <div className="tech-desc">
                Message payload encrypted using AES-256-GCM authenticated encryption.
                Provides confidentiality and integrity verification upon decryption.
              </div>
              <div className="tech-spec">256-bit key</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">002</div>
              <div className="tech-title">Key Fragmentation</div>
              <div className="tech-desc">
                Encryption key split using Shamir's Secret Sharing scheme.
                Any 3 of 5 fragments sufficient for key reconstruction.
              </div>
              <div className="tech-spec">k=3, n=5</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">003</div>
              <div className="tech-title">Distribution</div>
              <div className="tech-desc">
                Fragments distributed to geographically diverse Nostr relay servers.
                Protocol ensures censorship resistance and availability.
              </div>
              <div className="tech-spec">NIP-01</div>
            </div>
          </div>
        </div>
      </section>

      {/* Warning */}
      <section className="bg-white border-t-4 border-b-4 border-black">
        <div className="flex items-stretch">
          <div className="w-16 flex-shrink-0 hazard-stripe" />
          <div className="p-8 flex items-center gap-6">
            <div className="warning-icon">!</div>
            <div>
              <h3 className="text-base font-bold mb-1">Development Status: Prototype</h3>
              <p className="text-xs opacity-70 max-w-xl">
                Experimental software. Requires security audit prior to production.
                Currently on Bitcoin Testnet. Do not use for sensitive information.
              </p>
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
                Open-source cryptographic dead man's switch.
                AGPL-3.0 license. Contributions welcome.
              </p>
            </div>
            <div className="flex gap-12">
              <div className="footer-col">
                <h4>Resources</h4>
                <ul className="space-y-2">
                  <li><a href="#">Documentation</a></li>
                  <li><a href="#">API Reference</a></li>
                  <li><a href="#">Security Policy</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Source</h4>
                <ul className="space-y-2">
                  <li><a href="https://github.com/1e9c9h9o/echolock" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                  <li><a href="#">Contributing</a></li>
                  <li><a href="#">Issues</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/10 text-[10px] opacity-40 flex justify-between flex-wrap gap-4 tracking-wider">
            <span>ECHOLOCK v0.1.0-alpha</span>
            <span>Network: Bitcoin Testnet</span>
            <span>Status: Development</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
