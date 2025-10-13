'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-blue/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-red/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <header className="border-b-2 border-black relative z-10 bg-cream">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center gap-6 animate-fade-in-up">
            <Logo className="w-14 h-14 flex-shrink-0 hover:scale-110 transition-transform duration-300" />
            <div>
              <h1 className="font-sans text-4xl font-bold gradient-text animate-pulse-glow" style={{ letterSpacing: '1px' }}>
                ECHOLOCK
              </h1>
              <div className="text-sm text-black mt-1 font-mono opacity-60">localhost:3001</div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-black py-20 relative z-10">
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold leading-tight max-w-3xl mb-4 animate-fade-in-up">
            Decentralized dead man's switch that <span className="gradient-text">cannot be shut down</span>
          </h2>
          <p className="text-xl text-black max-w-2xl animate-fade-in-up opacity-80" style={{ animationDelay: '0.2s' }}>
            Messages encrypted and distributed across a global relay network. Released automatically if you fail to check in. No single point of failure.
          </p>
          <div className="flex gap-4 mt-8 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/auth/login">
              <Button variant="primary">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary">Sign Up</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black py-20 relative z-10">
        <div className="container mx-auto px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-base font-bold uppercase tracking-wide mb-8 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] animate-fade-in-up">
            How It Works
          </h3>

          <div className="grid md:grid-cols-3 gap-12 mt-12">
            <div className="p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.1s' }}>
              <div className="text-lg font-bold text-blue mb-2 font-sans">1. Encrypt Message</div>
              <div className="text-base text-black leading-relaxed opacity-80">
                Your message is encrypted with AES-256-GCM. The encryption key is split into 5 fragments using Shamir's Secret Sharing.
              </div>
            </div>

            <div className="p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.2s' }}>
              <div className="text-lg font-bold text-blue mb-2 font-sans">2. Distribute Fragments</div>
              <div className="text-base text-black leading-relaxed opacity-80">
                Fragments are distributed to 7+ Nostr relays globally. A Bitcoin timelock provides cryptographic proof of timing.
              </div>
            </div>

            <div className="p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.3s' }}>
              <div className="text-lg font-bold text-blue mb-2 font-sans">3. Automatic Release</div>
              <div className="text-base text-black leading-relaxed opacity-80">
                If you don't check in within the specified time, any 3 of 5 fragments can reconstruct the key and decrypt your message.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-base font-bold uppercase tracking-wide mb-8 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] animate-fade-in-up">
            Current Status
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Development Stage</div>
              <div className="text-lg font-bold text-blue font-sans">Prototype</div>
            </div>
            <div className="p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Network</div>
              <div className="text-lg font-bold text-blue font-sans">Bitcoin Testnet</div>
            </div>
            <div className="p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Security Audit</div>
              <div className="text-lg font-bold text-blue font-sans">Pending</div>
            </div>
            <div className="p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Production Ready</div>
              <div className="text-lg font-bold text-blue font-sans">No</div>
            </div>
          </div>

          <p className="mt-8 text-black max-w-2xl opacity-80 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            This is experimental software. The cryptographic implementation requires a professional security audit before handling sensitive information.
          </p>
        </div>
      </section>

      <footer className="bg-black text-cream py-16 relative border-t-4 border-blue">
        <div className="absolute inset-0 bg-gradient-to-r from-blue/10 to-red/10" />
        <div className="container mx-auto px-6 relative z-10">
          <p className="font-bold">ECHOLOCK is open-source software. Contributions are welcome.</p>
          <p className="mt-2 text-sm opacity-75">Last updated: 2025-10-13</p>
        </div>
      </footer>
    </div>
  )
}
