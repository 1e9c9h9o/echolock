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

export default function DocsPage() {
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
              <Link href="/docs" className="text-[11px] uppercase tracking-wider px-4 py-3 bg-orange text-black">Docs</Link>
              <Link href="/sources" className="text-[11px] uppercase tracking-wider px-4 py-3 hover:bg-orange hover:text-black transition-colors">Sources</Link>
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
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">Reference Manual</div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">Documentation</h1>
            </div>
          </div>
          <p className="text-sm text-black/70 max-w-2xl">
            Complete technical reference for ECHOLOCK cryptographic dead man's switch.
            Covers system architecture, API endpoints, CLI commands, and security protocols.
          </p>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="bg-black text-white">
        <div className="container py-6">
          <div className="flex flex-wrap gap-4">
            <a href="#overview" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Overview</a>
            <span className="opacity-30">|</span>
            <a href="#architecture" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Architecture</a>
            <span className="opacity-30">|</span>
            <a href="#api" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">API Reference</a>
            <span className="opacity-30">|</span>
            <a href="#cli" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">CLI Commands</a>
            <span className="opacity-30">|</span>
            <a href="#security" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Security</a>
            <span className="opacity-30">|</span>
            <a href="#configuration" className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 hover:text-orange transition-all">Configuration</a>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section id="overview" className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">01</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">System Overview</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-001</div>
          </div>

          <div className="diagram-panel mb-8">
            <div className="diagram-header">
              <span>Dead Man's Switch Operation</span>
              <span>PROTOCOL v0.1</span>
            </div>
            <div className="diagram-body">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-lg mb-4">What is ECHOLOCK?</h3>
                  <p className="text-xs opacity-80 leading-relaxed mb-4">
                    ECHOLOCK is a cryptographic dead man's switch — a system that automatically releases encrypted
                    information if the user fails to check in within a specified time interval. Unlike centralized
                    solutions, ECHOLOCK eliminates single points of failure through distributed storage and
                    cryptographic key splitting.
                  </p>
                  <p className="text-xs opacity-80 leading-relaxed">
                    The system combines industry-standard encryption (AES-256-GCM), threshold cryptography
                    (Shamir's Secret Sharing), decentralized storage (Nostr protocol), and blockchain
                    timestamping (Bitcoin OP_CHECKLOCKTIMEVERIFY) to create a censorship-resistant,
                    tamper-proof mechanism for conditional information release.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-4">Operation Sequence</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-orange text-black text-[10px] flex items-center justify-center flex-shrink-0 font-bold">1</div>
                      <div className="text-xs"><strong>Encrypt</strong> — Message encrypted with AES-256-GCM</div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-orange text-black text-[10px] flex items-center justify-center flex-shrink-0 font-bold">2</div>
                      <div className="text-xs"><strong>Fragment</strong> — Encryption key split via Shamir's (3-of-5)</div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-yellow text-black text-[10px] flex items-center justify-center flex-shrink-0 font-bold">3</div>
                      <div className="text-xs"><strong>Distribute</strong> — Fragments sent to 7+ Nostr relays globally</div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-yellow text-black text-[10px] flex items-center justify-center flex-shrink-0 font-bold">4</div>
                      <div className="text-xs"><strong>Timelock</strong> — Bitcoin OP_CLTV script created on-chain</div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-black text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold">5</div>
                      <div className="text-xs"><strong>Monitor</strong> — User checks in to reset timer</div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-6 h-6 bg-black text-white text-[10px] flex items-center justify-center flex-shrink-0 font-bold">6</div>
                      <div className="text-xs"><strong>Release</strong> — On expiry, fragments retrieved & key reconstructed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div className="bg-white p-6 border-l-4 border-orange">
              <div className="text-[10px] opacity-40 mb-3 tracking-wider">USE CASE 001</div>
              <div className="font-bold mb-2">Whistleblowing</div>
              <div className="text-xs opacity-70">Ensure evidence release if unable to publish personally. Provides dead man's protection for journalists and activists.</div>
            </div>
            <div className="bg-white p-6 border-l-4 border-yellow">
              <div className="text-[10px] opacity-40 mb-3 tracking-wider">USE CASE 002</div>
              <div className="font-bold mb-2">Digital Inheritance</div>
              <div className="text-xs opacity-70">Pass cryptocurrency keys, passwords, or sensitive documents to heirs without third-party custody.</div>
            </div>
            <div className="bg-white p-6 border-l-4 border-black">
              <div className="text-[10px] opacity-40 mb-3 tracking-wider">USE CASE 003</div>
              <div className="font-bold mb-2">Emergency Protocols</div>
              <div className="text-xs opacity-70">Automatic notification to trusted parties if check-in fails. Serves as a backup communication channel.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-16 bg-white border-t-4 border-b-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">02</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">System Architecture</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-002</div>
          </div>

          {/* Cryptographic Layer */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-orange"></span>
              Cryptographic Layer
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>Encryption</span>
                  <span>AES-256-GCM</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Messages encrypted using AES-256-GCM (Galois/Counter Mode), providing both confidentiality
                    and authenticity. Uses Node.js native crypto module.
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Key Size</span>
                      <span className="font-bold">256 bits</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">IV Size</span>
                      <span className="font-bold">96 bits</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Auth Tag</span>
                      <span className="font-bold">128 bits</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Mode</span>
                      <span className="font-bold">Authenticated</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>Key Splitting</span>
                  <span>Shamir SSS</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Encryption key split using Shamir's Secret Sharing scheme. Any k fragments
                    reconstruct the key; fewer than k reveal nothing.
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Threshold (k)</span>
                      <span className="font-bold">3 fragments</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Total (n)</span>
                      <span className="font-bold">5 fragments</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Library</span>
                      <span className="font-bold">shamir-secret-sharing</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Audit Status</span>
                      <span className="font-bold text-orange">Cure53 + Zellic</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>Key Derivation</span>
                  <span>PBKDF2</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    When password-based encryption is used, keys derived using PBKDF2 with
                    high iteration count for resistance to brute-force attacks.
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Algorithm</span>
                      <span className="font-bold">PBKDF2-SHA512</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Iterations</span>
                      <span className="font-bold">100,000</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Salt Size</span>
                      <span className="font-bold">128 bits</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Output</span>
                      <span className="font-bold">256-bit key</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Layer */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-yellow"></span>
              Distribution Layer
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>Nostr Protocol</span>
                  <span>NIP-78</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Key fragments distributed as application-specific data events (kind 30078) across
                    geographically diverse Nostr relays. Protocol ensures censorship resistance.
                  </div>
                  <div className="bg-blue/30 p-4 text-[11px] font-mono">
                    <div className="opacity-50 mb-2">// Event Structure</div>
                    <div>{"{"}</div>
                    <div className="pl-4">"kind": 30078,</div>
                    <div className="pl-4">"tags": [["d", "echolock-fragment"]],</div>
                    <div className="pl-4">"content": "&lt;encrypted_fragment&gt;"</div>
                    <div>{"}"}</div>
                  </div>
                </div>
              </div>

              <div className="diagram-panel">
                <div className="diagram-header">
                  <span>Relay Network</span>
                  <span>7+ NODES</span>
                </div>
                <div className="p-6">
                  <div className="text-xs opacity-70 leading-relaxed mb-4">
                    Fragments distributed to minimum 7 healthy relays with geographic diversity.
                    Health monitoring uses exponential backoff for failed connections.
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Min Relays</span>
                      <span className="font-bold">7 nodes</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Min Success</span>
                      <span className="font-bold">5 publishes</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Health Check</span>
                      <span className="font-bold">Exponential backoff</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">Fallback</span>
                      <span className="font-bold">Local storage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bitcoin Layer */}
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-black"></span>
              Bitcoin Timelock Layer
            </h3>
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>OP_CHECKLOCKTIMEVERIFY</span>
                <span>BIP-65</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <div className="text-xs opacity-70 leading-relaxed mb-4">
                      Bitcoin's OP_CHECKLOCKTIMEVERIFY (CLTV) opcode creates cryptographic proof of the
                      switch creation time. The timelock script ensures funds cannot be spent before
                      the specified block height, providing immutable timestamping.
                    </div>
                    <div className="bg-blue/30 p-4 text-[11px] font-mono mb-4">
                      <div className="opacity-50 mb-2">// Timelock Script</div>
                      <div>&lt;locktime&gt; OP_CLTV OP_DROP</div>
                      <div>&lt;pubkey&gt; OP_CHECKSIG</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Network</span>
                      <span className="font-bold text-yellow">Testnet (Development)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Script Type</span>
                      <span className="font-bold">P2SH</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Lock Type</span>
                      <span className="font-bold">Block height</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue">
                      <span className="opacity-50">Library</span>
                      <span className="font-bold">bitcoinjs-lib</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="opacity-50">API</span>
                      <span className="font-bold">Blockstream</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section id="api" className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">03</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">API Reference</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-003</div>
          </div>

          <div className="diagram-panel mb-8">
            <div className="diagram-header">
              <span>REST API Endpoints</span>
              <span>v1.0</span>
            </div>
            <div className="diagram-body p-0">
              {/* Auth endpoints */}
              <div className="border-b-2 border-blue">
                <div className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest">Authentication</div>
                <div className="divide-y divide-blue">
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/auth/signup</span>
                    <span className="text-xs opacity-60">Register new user account</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/auth/login</span>
                    <span className="text-xs opacity-60">Authenticate and receive JWT</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/auth/refresh</span>
                    <span className="text-xs opacity-60">Refresh access token</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/auth/verify-email</span>
                    <span className="text-xs opacity-60">Verify email address</span>
                  </div>
                </div>
              </div>

              {/* Switch endpoints */}
              <div className="border-b-2 border-blue">
                <div className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest">Switches</div>
                <div className="divide-y divide-blue">
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/switches</span>
                    <span className="text-xs opacity-60">Create new dead man's switch</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-yellow">GET</span>
                    <span className="flex-1 font-mono text-sm">/api/switches</span>
                    <span className="text-xs opacity-60">List all user switches</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-yellow">GET</span>
                    <span className="flex-1 font-mono text-sm">/api/switches/:id</span>
                    <span className="text-xs opacity-60">Get switch status and details</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-orange">POST</span>
                    <span className="flex-1 font-mono text-sm">/api/switches/:id/checkin</span>
                    <span className="text-xs opacity-60">Reset switch timer (check-in)</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold">DELETE</span>
                    <span className="flex-1 font-mono text-sm">/api/switches/:id</span>
                    <span className="text-xs opacity-60">Delete switch permanently</span>
                  </div>
                </div>
              </div>

              {/* System endpoints */}
              <div>
                <div className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest">System</div>
                <div className="divide-y divide-blue">
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-yellow">GET</span>
                    <span className="flex-1 font-mono text-sm">/health</span>
                    <span className="text-xs opacity-60">API health check</span>
                  </div>
                  <div className="flex items-center px-6 py-4">
                    <span className="w-20 text-[10px] font-bold text-yellow">WS</span>
                    <span className="flex-1 font-mono text-sm">/ws</span>
                    <span className="text-xs opacity-60">WebSocket for real-time updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Request/Response Examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Create Switch Request</span>
                <span>POST</span>
              </div>
              <div className="p-6">
                <pre className="bg-black text-white p-4 text-[11px] font-mono overflow-x-auto">
{`{
  "message": "My secret message",
  "checkInIntervalHours": 72,
  "name": "My Dead Man's Switch",
  "notifyEmails": ["backup@example.com"]
}`}
                </pre>
              </div>
            </div>
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Switch Status Response</span>
                <span>200 OK</span>
              </div>
              <div className="p-6">
                <pre className="bg-black text-white p-4 text-[11px] font-mono overflow-x-auto">
{`{
  "id": "sw_abc123",
  "status": "ARMED",
  "expiresAt": "2025-01-15T12:00:00Z",
  "checkInCount": 3,
  "fragmentCount": 5,
  "relayCount": 7
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLI Commands */}
      <section id="cli" className="py-16 bg-white border-t-4 border-b-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">04</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">CLI Commands</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-004</div>
          </div>

          <div className="diagram-panel">
            <div className="diagram-header">
              <span>Interactive CLI</span>
              <span>npm run cli</span>
            </div>
            <div className="diagram-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-sm mb-4">Switch Management</h4>
                  <div className="space-y-3">
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-orange px-3 py-1 text-xs font-mono">create</code>
                      <span className="text-xs opacity-70">Create a new dead man's switch with message and interval</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-orange px-3 py-1 text-xs font-mono">check-in</code>
                      <span className="text-xs opacity-70">Reset the timer for the current switch</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-orange px-3 py-1 text-xs font-mono">status</code>
                      <span className="text-xs opacity-70">Display current switch status and countdown</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-orange px-3 py-1 text-xs font-mono">list</code>
                      <span className="text-xs opacity-70">Show all configured switches</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-orange px-3 py-1 text-xs font-mono">select &lt;id&gt;</code>
                      <span className="text-xs opacity-70">Select a switch by ID for operations</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-4">Testing & Debug</h4>
                  <div className="space-y-3">
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-yellow px-3 py-1 text-xs font-mono">test-release</code>
                      <span className="text-xs opacity-70">Manually trigger release sequence (testing only)</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-yellow px-3 py-1 text-xs font-mono">delete</code>
                      <span className="text-xs opacity-70">Permanently delete current switch</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-white px-3 py-1 text-xs font-mono">help</code>
                      <span className="text-xs opacity-70">Display available commands</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <code className="bg-black text-white px-3 py-1 text-xs font-mono">exit</code>
                      <span className="text-xs opacity-70">Quit the CLI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-blue p-6">
              <h4 className="font-bold text-sm mb-3">Demo Mode</h4>
              <code className="bg-black text-orange px-3 py-1 text-xs font-mono block mb-3">npm run demo</code>
              <p className="text-xs opacity-70">Complete demonstration of cryptographic operations with visual output</p>
            </div>
            <div className="bg-blue p-6">
              <h4 className="font-bold text-sm mb-3">Bitcoin Demo</h4>
              <code className="bg-black text-orange px-3 py-1 text-xs font-mono block mb-3">npm run bitcoin-demo</code>
              <p className="text-xs opacity-70">Bitcoin testnet timelock integration demonstration</p>
            </div>
            <div className="bg-blue p-6">
              <h4 className="font-bold text-sm mb-3">Nostr Demo</h4>
              <code className="bg-black text-orange px-3 py-1 text-xs font-mono block mb-3">npm run nostr-demo</code>
              <p className="text-xs opacity-70">Nostr relay distribution and fragment publishing demo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-16 bg-blue-light">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">05</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Security Model</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-005</div>
          </div>

          {/* Warning Panel */}
          <div className="bg-white border-4 border-black mb-8">
            <div className="flex items-stretch">
              <div className="w-16 flex-shrink-0 hazard-stripe" />
              <div className="p-6 flex items-center gap-6">
                <div className="warning-icon">!</div>
                <div>
                  <h3 className="text-base font-bold mb-1">Experimental Software</h3>
                  <p className="text-xs opacity-70 max-w-xl">
                    ECHOLOCK has not undergone professional security audit. Do not use for sensitive data.
                    Currently operating on Bitcoin Testnet only. Security researchers encouraged to review and report issues.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Security Properties</span>
                <span>GUARANTEES</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-orange flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</div>
                  <div>
                    <div className="font-bold text-sm">Confidentiality</div>
                    <div className="text-xs opacity-70">AES-256-GCM encryption prevents unauthorized access</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-orange flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</div>
                  <div>
                    <div className="font-bold text-sm">Integrity</div>
                    <div className="text-xs opacity-70">Authenticated encryption detects tampering</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-orange flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</div>
                  <div>
                    <div className="font-bold text-sm">Threshold Security</div>
                    <div className="text-xs opacity-70">k-1 fragments reveal nothing about the key</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-orange flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</div>
                  <div>
                    <div className="font-bold text-sm">Censorship Resistance</div>
                    <div className="text-xs opacity-70">Distributed storage across independent relays</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="diagram-panel">
              <div className="diagram-header">
                <span>Known Limitations</span>
                <span>DISCLOSURE</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-yellow flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</div>
                  <div>
                    <div className="font-bold text-sm">No Audit</div>
                    <div className="text-xs opacity-70">Professional security audit not yet completed</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-yellow flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</div>
                  <div>
                    <div className="font-bold text-sm">Testnet Only</div>
                    <div className="text-xs opacity-70">Bitcoin operations restricted to testnet</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-yellow flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</div>
                  <div>
                    <div className="font-bold text-sm">Relay Availability</div>
                    <div className="text-xs opacity-70">Depends on third-party Nostr relay uptime</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-yellow flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</div>
                  <div>
                    <div className="font-bold text-sm">Client-Side Trust</div>
                    <div className="text-xs opacity-70">Encryption performed in browser/client</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting */}
          <div className="mt-8 bg-white p-6 border-4 border-black">
            <h4 className="font-bold text-sm mb-3">Report Security Issues</h4>
            <p className="text-xs opacity-70 mb-4">
              Found a vulnerability? We encourage responsible disclosure. Please report security issues through:
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="https://github.com/1e9c9h9o/echolock/security/advisories/new" target="_blank" rel="noopener noreferrer"
                 className="text-xs bg-black text-white px-4 py-2 hover:bg-orange hover:text-black transition-colors">
                GitHub Security Advisory
              </a>
              <a href="mailto:echoooolock@gmail.com"
                 className="text-xs border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors">
                echoooolock@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section id="configuration" className="py-16 bg-white border-t-4 border-black">
        <div className="container">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange flex items-center justify-center text-black font-bold">06</div>
              <h2 className="text-[11px] uppercase tracking-[0.2em]">Configuration</h2>
            </div>
            <div className="text-[10px] opacity-50 tracking-wider">ECHOLOCK-DOC-006</div>
          </div>

          <div className="diagram-panel">
            <div className="diagram-header">
              <span>Environment Variables</span>
              <span>.env</span>
            </div>
            <div className="p-6">
              <div className="bg-black text-white p-6 font-mono text-[12px] leading-relaxed overflow-x-auto">
                <div className="text-blue-light"># Nostr Distribution</div>
                <div>USE_NOSTR_DISTRIBUTION=<span className="text-orange">true</span></div>
                <div>NOSTR_RELAYS=<span className="text-yellow">"wss://relay.damus.io,wss://nos.lol"</span></div>
                <div>MIN_RELAY_COUNT=<span className="text-orange">7</span></div>
                <br />
                <div className="text-blue-light"># Bitcoin (Testnet)</div>
                <div>BITCOIN_NETWORK=<span className="text-yellow">"testnet"</span></div>
                <br />
                <div className="text-blue-light"># Switch Defaults</div>
                <div>CHECK_IN_HOURS=<span className="text-orange">72</span></div>
                <br />
                <div className="text-blue-light"># Database (API Mode)</div>
                <div>DATABASE_URL=<span className="text-yellow">"postgresql://..."</span></div>
                <div>JWT_SECRET=<span className="text-yellow">"your-secret-key"</span></div>
                <br />
                <div className="text-blue-light"># Email Service</div>
                <div>SMTP_HOST=<span className="text-yellow">"smtp.example.com"</span></div>
                <div>SMTP_USER=<span className="text-yellow">"user@example.com"</span></div>
                <div>SMTP_PASS=<span className="text-yellow">"password"</span></div>
              </div>
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
                  <li><a href="#api">API Reference</a></li>
                  <li><a href="#security">Security Policy</a></li>
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
