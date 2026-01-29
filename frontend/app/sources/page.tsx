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

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-orange hover:text-yellow transition-colors"
    >
      {children}
    </a>
  )
}

export default function SourcesPage() {
  return (
    <div className="min-h-screen bg-blue">
      {/* Industrial column marker */}
      <div className="column-marker hazard-stripe-thin" />

      {/* Header */}
      <header className="bg-black text-white">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-4">
              <div className="w-10 h-10">
                <LogoMark className="w-full h-full text-white" />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/docs" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Docs</Link>
              <Link href="/sources" className="text-[11px] uppercase tracking-wider px-4 py-3 bg-orange text-black">Sources</Link>
              <Link href="/auth/login" className="btn">Log In</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hazard bar under header */}
      <div className="h-2 hazard-stripe" />

      {/* Page Title */}
      <section className="py-10 lg:py-16">
        <div className="container">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">Attribution & References</div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">Sources</h1>
            </div>
          </div>
          <p className="text-sm text-black/70 max-w-2xl">
            ECHOLOCK is built on the foundations of established cryptographic research, open-source libraries,
            and decentralized protocols. This page acknowledges the work that makes this project possible.
          </p>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-black text-white">
        <div className="container py-6">
          <div className="flex flex-wrap gap-4">
            <a href="#cryptography" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Cryptography</a>
            <span className="opacity-30">|</span>
            <a href="#libraries" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Libraries</a>
            <span className="opacity-30">|</span>
            <a href="#protocols" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Protocols</a>
            <span className="opacity-30">|</span>
            <a href="#research" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Research</a>
            <span className="opacity-30">|</span>
            <a href="#license" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">License</a>
          </div>
        </div>
      </section>

      {/* Cryptographic Foundations */}
      <section id="cryptography" className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">01</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Cryptographic Foundations</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-001</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 mb-8">
            <div className="tech-item">
              <div className="tech-num">CRYPTO-001</div>
              <div className="tech-title">AES-256-GCM</div>
              <div className="tech-desc">
                Advanced Encryption Standard with Galois/Counter Mode. Provides authenticated
                encryption with associated data (AEAD). Standardized by NIST in FIPS 197.
              </div>
              <div className="tech-spec">NIST FIPS 197</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">CRYPTO-002</div>
              <div className="tech-title">Shamir's Secret Sharing</div>
              <div className="tech-desc">
                Threshold cryptography scheme invented by Adi Shamir in 1979. Enables splitting
                secrets into n shares where any k shares can reconstruct the original.
              </div>
              <div className="tech-spec">Comm. ACM 1979</div>
            </div>
            <div className="tech-item">
              <div className="tech-num">CRYPTO-003</div>
              <div className="tech-title">PBKDF2-SHA512</div>
              <div className="tech-desc">
                Password-Based Key Derivation Function 2 with SHA-512 hash. Provides
                computational resistance against brute-force attacks on passwords.
              </div>
              <div className="tech-spec">RFC 8018</div>
            </div>
          </div>

          <div className="diagram-panel">
            <div className="diagram-header">
              <span>Cryptographic Standards</span>
              <span>REFERENCES</span>
            </div>
            <div className="diagram-body">
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-blue">
                  <div className="w-16 text-[10px] opacity-50 flex-shrink-0">NIST</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">FIPS 197: Advanced Encryption Standard (AES)</div>
                    <div className="text-xs opacity-70">
                      <ExternalLink href="https://csrc.nist.gov/publications/detail/fips/197/final">
                        csrc.nist.gov/publications/detail/fips/197/final
                      </ExternalLink>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-blue">
                  <div className="w-16 text-[10px] opacity-50 flex-shrink-0">NIST</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">SP 800-38D: GCM Mode</div>
                    <div className="text-xs opacity-70">
                      <ExternalLink href="https://csrc.nist.gov/publications/detail/sp/800-38d/final">
                        csrc.nist.gov/publications/detail/sp/800-38d/final
                      </ExternalLink>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-blue">
                  <div className="w-16 text-[10px] opacity-50 flex-shrink-0">ACM</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">How to Share a Secret — Adi Shamir (1979)</div>
                    <div className="text-xs opacity-70">
                      <ExternalLink href="https://dl.acm.org/doi/10.1145/359168.359176">
                        dl.acm.org/doi/10.1145/359168.359176
                      </ExternalLink>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-16 text-[10px] opacity-50 flex-shrink-0">IETF</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">RFC 8018: PKCS #5 (PBKDF2)</div>
                    <div className="text-xs opacity-70">
                      <ExternalLink href="https://datatracker.ietf.org/doc/html/rfc8018">
                        datatracker.ietf.org/doc/html/rfc8018
                      </ExternalLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Libraries */}
      <section id="libraries" className="py-16 bg-white border-t-4 border-b-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">02</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Open Source Libraries</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-002</div>
          </div>

          {/* Core Dependencies */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-orange"></span>
              Cryptographic Libraries
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>shamir-secret-sharing</span>
                  <span>v0.0.4</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Shamir's Secret Sharing implementation by Privy. This library has undergone
                    professional security audits by both Cure53 and Zellic, ensuring cryptographic correctness.
                  </div>
                  <div className="space-y-2 text-[11px] mb-4">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Author</span>
                      <span className="font-bold">Privy</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">License</span>
                      <span className="font-bold">MIT</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Audits</span>
                      <span className="font-bold text-orange">Cure53, Zellic</span>
                    </div>
                  </div>
                  <ExternalLink href="https://github.com/privy-io/shamir-secret-sharing">
                    <span className="text-xs">github.com/privy-io/shamir-secret-sharing</span>
                  </ExternalLink>
                </div>
              </div>

              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>bitcoinjs-lib</span>
                  <span>v6.1.7</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Industry-standard JavaScript library for Bitcoin. Used for creating
                    OP_CHECKLOCKTIMEVERIFY timelock scripts and transaction handling.
                  </div>
                  <div className="space-y-2 text-[11px] mb-4">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Author</span>
                      <span className="font-bold">bitcoinjs</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">License</span>
                      <span className="font-bold">MIT</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Status</span>
                      <span className="font-bold">Production</span>
                    </div>
                  </div>
                  <ExternalLink href="https://github.com/bitcoinjs/bitcoinjs-lib">
                    <span className="text-xs">github.com/bitcoinjs/bitcoinjs-lib</span>
                  </ExternalLink>
                </div>
              </div>
            </div>
          </div>

          {/* Protocol Libraries */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-yellow"></span>
              Protocol Libraries
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>nostr-tools</span>
                  <span>v2.17.0</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Reference implementation for Nostr protocol. Provides event creation,
                    signing, relay connections, and NIP compliance.
                  </div>
                  <div className="space-y-2 text-[11px] mb-4">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Author</span>
                      <span className="font-bold">nbd-wtf</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">License</span>
                      <span className="font-bold">Unlicense</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">NIPs</span>
                      <span className="font-bold">01, 78, +</span>
                    </div>
                  </div>
                  <ExternalLink href="https://github.com/nbd-wtf/nostr-tools">
                    <span className="text-xs">github.com/nbd-wtf/nostr-tools</span>
                  </ExternalLink>
                </div>
              </div>

              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>ecpair + tiny-secp256k1</span>
                  <span>v3.0.0 / v2.2.4</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Elliptic curve cryptography for Bitcoin key pairs. tiny-secp256k1 provides
                    WebAssembly-based secp256k1 operations.
                  </div>
                  <div className="space-y-2 text-[11px] mb-4">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Author</span>
                      <span className="font-bold">bitcoinjs</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">License</span>
                      <span className="font-bold">MIT</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Curve</span>
                      <span className="font-bold">secp256k1</span>
                    </div>
                  </div>
                  <ExternalLink href="https://github.com/bitcoinjs/ecpair">
                    <span className="text-xs">github.com/bitcoinjs/ecpair</span>
                  </ExternalLink>
                </div>
              </div>
            </div>
          </div>

          {/* Frontend Stack */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-black"></span>
              Frontend Stack
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">Next.js</div>
                <div className="text-[10px] opacity-50 mb-2">v14.2.0</div>
                <div className="text-xs opacity-70">React framework with App Router</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">React</div>
                <div className="text-[10px] opacity-50 mb-2">v18.3.0</div>
                <div className="text-xs opacity-70">UI component library</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">Tailwind CSS</div>
                <div className="text-[10px] opacity-50 mb-2">v3.4.0</div>
                <div className="text-xs opacity-70">Utility-first CSS framework</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">TypeScript</div>
                <div className="text-[10px] opacity-50 mb-2">v5.x</div>
                <div className="text-xs opacity-70">Type-safe JavaScript</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">Zustand</div>
                <div className="text-[10px] opacity-50 mb-2">v4.x</div>
                <div className="text-xs opacity-70">State management</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">Lucide React</div>
                <div className="text-[10px] opacity-50 mb-2">v0.x</div>
                <div className="text-xs opacity-70">Icon library</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">react-joyride</div>
                <div className="text-[10px] opacity-50 mb-2">v2.x</div>
                <div className="text-xs opacity-70">Onboarding tours</div>
              </div>
              <div className="bg-blue p-4">
                <div className="font-bold text-sm mb-1">next-intl</div>
                <div className="text-[10px] opacity-50 mb-2">v3.x</div>
                <div className="text-xs opacity-70">Internationalization</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocols */}
      <section id="protocols" className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">03</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Protocol Specifications</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-003</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bitcoin */}
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Bitcoin Protocol</span>
                <span>BIPs</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="pb-4 border-b border-blue">
                  <div className="font-bold text-sm mb-1">BIP-65: OP_CHECKLOCKTIMEVERIFY</div>
                  <div className="text-xs opacity-70 mb-2">
                    Enables time-locked Bitcoin transactions. Funds cannot be spent until
                    a specified block height or Unix timestamp.
                  </div>
                  <ExternalLink href="https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki">
                    <span className="text-xs">github.com/bitcoin/bips/blob/master/bip-0065.mediawiki</span>
                  </ExternalLink>
                </div>
                <div className="pb-4 border-b border-blue">
                  <div className="font-bold text-sm mb-1">BIP-16: Pay to Script Hash</div>
                  <div className="text-xs opacity-70 mb-2">
                    P2SH allows complex scripts to be represented as simple addresses.
                    Used for timelock script encapsulation.
                  </div>
                  <ExternalLink href="https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki">
                    <span className="text-xs">github.com/bitcoin/bips/blob/master/bip-0016.mediawiki</span>
                  </ExternalLink>
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">Bitcoin Whitepaper</div>
                  <div className="text-xs opacity-70 mb-2">
                    Satoshi Nakamoto's original paper describing the Bitcoin protocol
                    and proof-of-work consensus mechanism.
                  </div>
                  <ExternalLink href="https://bitcoin.org/bitcoin.pdf">
                    <span className="text-xs">bitcoin.org/bitcoin.pdf</span>
                  </ExternalLink>
                </div>
              </div>
            </div>

            {/* Nostr */}
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Nostr Protocol</span>
                <span>NIPs</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="pb-4 border-b border-blue">
                  <div className="font-bold text-sm mb-1">NIP-01: Basic Protocol Flow</div>
                  <div className="text-xs opacity-70 mb-2">
                    Core Nostr protocol specification. Defines events, signatures,
                    relay communication, and message formats.
                  </div>
                  <ExternalLink href="https://github.com/nostr-protocol/nips/blob/master/01.md">
                    <span className="text-xs">github.com/nostr-protocol/nips/blob/master/01.md</span>
                  </ExternalLink>
                </div>
                <div className="pb-4 border-b border-blue">
                  <div className="font-bold text-sm mb-1">NIP-78: Application-Specific Data</div>
                  <div className="text-xs opacity-70 mb-2">
                    Defines kind 30078 events for storing arbitrary application data.
                    Used for fragment storage with deduplication.
                  </div>
                  <ExternalLink href="https://github.com/nostr-protocol/nips/blob/master/78.md">
                    <span className="text-xs">github.com/nostr-protocol/nips/blob/master/78.md</span>
                  </ExternalLink>
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">NIP-65: Relay List Metadata</div>
                  <div className="text-xs opacity-70 mb-2">
                    Enables dynamic relay discovery. Planned for future implementation
                    to improve relay selection and redundancy.
                  </div>
                  <ExternalLink href="https://github.com/nostr-protocol/nips/blob/master/65.md">
                    <span className="text-xs">github.com/nostr-protocol/nips/blob/master/65.md</span>
                  </ExternalLink>
                </div>
              </div>
            </div>
          </div>

          {/* Default Relays */}
          <div className="diagram-panel">
            <div className="diagram-header">
              <span>Default Nostr Relays</span>
              <span>7+ NODES</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange rounded-full"></span>
                  <span>wss://relay.damus.io</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange rounded-full"></span>
                  <span>wss://nos.lol</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange rounded-full"></span>
                  <span>wss://relay.nostr.band</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow rounded-full"></span>
                  <span>wss://relay.snort.social</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow rounded-full"></span>
                  <span>wss://nostr.wine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow rounded-full"></span>
                  <span>wss://relay.nostr.info</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-black rounded-full"></span>
                  <span>wss://nostr-pub.wellorder.net</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research & Papers */}
      <section id="research" className="py-16 bg-white border-t-4 border-b-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">04</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Research & Academic Papers</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-004</div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue p-6 border-l-4 border-orange">
              <div className="text-[10px] opacity-40 mb-2 tracking-wider">1979 • ACM</div>
              <h3 className="font-bold text-lg mb-2">How to Share a Secret</h3>
              <p className="text-xs opacity-70 mb-3">
                Adi Shamir's seminal paper introducing threshold secret sharing. The foundation of
                ECHOLOCK's key fragmentation scheme.
              </p>
              <div className="text-xs">
                <span className="opacity-50">Citation: </span>
                <span className="font-mono">Shamir, A. (1979). Communications of the ACM, 22(11), 612-613.</span>
              </div>
            </div>

            <div className="bg-blue p-6 border-l-4 border-yellow">
              <div className="text-[10px] opacity-40 mb-2 tracking-wider">2008 • Cryptography</div>
              <h3 className="font-bold text-lg mb-2">Bitcoin: A Peer-to-Peer Electronic Cash System</h3>
              <p className="text-xs opacity-70 mb-3">
                Satoshi Nakamoto's whitepaper introducing Bitcoin and blockchain consensus.
                ECHOLOCK uses Bitcoin for immutable timestamping.
              </p>
              <div className="text-xs">
                <span className="opacity-50">Citation: </span>
                <span className="font-mono">Nakamoto, S. (2008). bitcoin.org/bitcoin.pdf</span>
              </div>
            </div>

            <div className="bg-blue p-6 border-l-4 border-black">
              <div className="text-[10px] opacity-40 mb-2 tracking-wider">2007 • IEEE</div>
              <h3 className="font-bold text-lg mb-2">The Galois/Counter Mode of Operation (GCM)</h3>
              <p className="text-xs opacity-70 mb-3">
                David McGrew and John Viega's specification of GCM mode, providing authenticated
                encryption with excellent performance characteristics.
              </p>
              <div className="text-xs">
                <span className="opacity-50">Citation: </span>
                <span className="font-mono">McGrew, D., Viega, J. (2007). NIST SP 800-38D</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Audits */}
      <section className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">05</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Security Audit References</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-005</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Cure53</span>
                <span>AUDIT</span>
              </div>
              <div className="p-6">
                <div className="text-xs opacity-70 leading-relaxed mb-4">
                  Cure53 is a Berlin-based security firm specializing in penetration testing
                  and code review. They audited the shamir-secret-sharing library used by ECHOLOCK.
                </div>
                <div className="text-[11px] mb-4">
                  <div className="flex justify-between py-2 border-b border-blue">
                    <span className="opacity-50">Target</span>
                    <span className="font-bold">shamir-secret-sharing</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="opacity-50">Focus</span>
                    <span className="font-bold">Cryptographic correctness</span>
                  </div>
                </div>
                <ExternalLink href="https://cure53.de/">
                  <span className="text-xs">cure53.de</span>
                </ExternalLink>
              </div>
            </div>

            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Zellic</span>
                <span>AUDIT</span>
              </div>
              <div className="p-6">
                <div className="text-xs opacity-70 leading-relaxed mb-4">
                  Zellic provides blockchain and cryptography security audits.
                  Their review of shamir-secret-sharing provides additional assurance
                  for ECHOLOCK's key splitting implementation.
                </div>
                <div className="text-[11px] mb-4">
                  <div className="flex justify-between py-2 border-b border-blue">
                    <span className="opacity-50">Target</span>
                    <span className="font-bold">shamir-secret-sharing</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="opacity-50">Focus</span>
                    <span className="font-bold">Implementation security</span>
                  </div>
                </div>
                <ExternalLink href="https://www.zellic.io/">
                  <span className="text-xs">zellic.io</span>
                </ExternalLink>
              </div>
            </div>
          </div>

          {/* ECHOLOCK Audit Status */}
          <div className="mt-8 bg-white border-4 border-black">
            <div className="flex items-stretch">
              <div className="w-16 flex-shrink-0 hazard-stripe" />
              <div className="p-6">
                <h3 className="text-base font-bold mb-2">ECHOLOCK Audit Status</h3>
                <p className="text-xs opacity-70 mb-4">
                  ECHOLOCK itself has not yet undergone professional security audit.
                  While we use audited libraries, the integration and application logic
                  requires independent review before production use.
                </p>
                <div className="flex gap-3 text-xs">
                  <span className="bg-yellow text-black px-3 py-1 font-bold">PENDING AUDIT</span>
                  <span className="opacity-50">Security researchers welcome</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* License */}
      <section id="license" className="py-16 bg-white border-t-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">06</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">License</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-006</div>
          </div>

          <div className="diagram-panel">
            <div className="diagram-header">
              <span>GNU Affero General Public License v3.0</span>
              <span>AGPL-3.0</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs opacity-70 leading-relaxed mb-4">
                    ECHOLOCK is licensed under AGPL-3.0, a strong copyleft license that ensures
                    source code remains open and available. This is appropriate for security-critical
                    software where transparency and auditability are essential.
                  </p>
                  <p className="text-xs opacity-70 leading-relaxed mb-4">
                    Key requirements:
                  </p>
                  <ul className="text-xs opacity-70 leading-relaxed space-y-2 ml-4">
                    <li>• Source code must be made available when used over a network</li>
                    <li>• Modifications must be released under the same license</li>
                    <li>• Changes must be documented</li>
                    <li>• Original copyright and license notices must be preserved</li>
                  </ul>
                </div>
                <div>
                  <div className="bg-black text-white p-6 font-mono text-[11px] leading-relaxed">
                    <div className="text-orange mb-4">ECHOLOCK — Cryptographic Dead Man's Switch</div>
                    <div className="opacity-70 mb-4">
                      Copyright (C) 2025 ECHOLOCK Contributors
                    </div>
                    <div className="opacity-70 mb-4">
                      This program is free software: you can redistribute it and/or modify
                      it under the terms of the GNU Affero General Public License as published
                      by the Free Software Foundation, version 3.
                    </div>
                    <div className="opacity-50">
                      See LICENSE file for complete terms.
                    </div>
                  </div>
                  <div className="mt-4">
                    <ExternalLink href="https://www.gnu.org/licenses/agpl-3.0.en.html">
                      <span className="text-xs">Full license text at gnu.org</span>
                    </ExternalLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Acknowledgments */}
      <section className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">07</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Acknowledgments</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-SRC-007</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 border-l-4 border-orange">
              <div className="font-bold mb-2">Cryptographic Community</div>
              <p className="text-xs opacity-70">
                The researchers and practitioners who developed and refined the cryptographic
                primitives that make secure communication possible.
              </p>
            </div>
            <div className="bg-white p-6 border-l-4 border-yellow">
              <div className="font-bold mb-2">Bitcoin Developers</div>
              <p className="text-xs opacity-70">
                The Bitcoin Core team and community for creating and maintaining the most
                robust decentralized timestamping system.
              </p>
            </div>
            <div className="bg-white p-6 border-l-4 border-black">
              <div className="font-bold mb-2">Nostr Protocol</div>
              <p className="text-xs opacity-70">
                fiatjaf and the Nostr community for creating a simple, open protocol for
                decentralized social networking and data distribution.
              </p>
            </div>
            <div className="bg-white p-6 border-l-4 border-orange">
              <div className="font-bold mb-2">Open Source Maintainers</div>
              <p className="text-xs opacity-70">
                The maintainers of the many open source libraries that ECHOLOCK depends on,
                whose work enables rapid development of secure systems.
              </p>
            </div>
            <div className="bg-white p-6 border-l-4 border-yellow">
              <div className="font-bold mb-2">Security Researchers</div>
              <p className="text-xs opacity-70">
                Those who audit, test, and improve cryptographic implementations,
                making the ecosystem safer for everyone.
              </p>
            </div>
            <div className="bg-white p-6 border-l-4 border-black">
              <div className="font-bold mb-2">Privacy Advocates</div>
              <p className="text-xs opacity-70">
                Activists, journalists, and individuals who demonstrate the importance
                of secure, private communication tools.
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
              <Link href="/" className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10">
                  <LogoMark className="w-full h-full text-white" />
                </div>
                <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
              </Link>
              <p className="text-[11px] opacity-50 max-w-[280px] leading-relaxed">
                Open-source cryptographic dead man's switch.
                AGPL-3.0 license. Contributions welcome.
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
            <span>Network: Bitcoin Mainnet</span>
            <span>AGPL-3.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
