'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import InteractiveDemo from '@/components/InteractiveDemo'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-blue/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-red/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <header className="border-b-2 border-black relative z-10 bg-cream">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-3 sm:gap-4 animate-fade-in-up">
            <Logo className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 hover:scale-110 transition-transform duration-300" />
            <h1 className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold gradient-text" style={{ letterSpacing: '0.1em' }}>
              ECHOLOCK
            </h1>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-black py-12 sm:py-16 md:py-20 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl mb-4 animate-fade-in-up">
            Decentralized dead man's switch that <span className="gradient-text">cannot be shut down</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-black max-w-2xl animate-fade-in-up opacity-80" style={{ animationDelay: '0.2s' }}>
            Messages encrypted and distributed across a global relay network. Released automatically if you fail to check in. No single point of failure.
          </p>
          <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/auth/login">
              <Button variant="primary">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary">Sign Up</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black py-12 sm:py-16 md:py-20 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-sm sm:text-base font-bold uppercase tracking-wide mb-6 sm:mb-8 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] animate-fade-in-up">
            How It Works
          </h3>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 mt-8 sm:mt-12">
            <div className="p-4 sm:p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.1s' }}>
              <div className="text-base sm:text-lg font-bold text-blue mb-2 font-sans">1. Encrypt Message</div>
              <div className="text-sm sm:text-base text-black leading-relaxed opacity-80">
                Your message is encrypted with AES-256-GCM. The encryption key is split into 5 fragments using Shamir's Secret Sharing.
              </div>
            </div>

            <div className="p-4 sm:p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.2s' }}>
              <div className="text-base sm:text-lg font-bold text-blue mb-2 font-sans">2. Distribute Fragments</div>
              <div className="text-sm sm:text-base text-black leading-relaxed opacity-80">
                Fragments are distributed to 7+ Nostr relays globally. A Bitcoin timelock provides cryptographic proof of timing.
              </div>
            </div>

            <div className="p-4 sm:p-6 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 animate-fade-in-up hover:border-blue" style={{ animationDelay: '0.3s' }}>
              <div className="text-base sm:text-lg font-bold text-blue mb-2 font-sans">3. Automatic Release</div>
              <div className="text-sm sm:text-base text-black leading-relaxed opacity-80">
                If you don't check in within the specified time, any 3 of 5 fragments can reconstruct the key and decrypt your message.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black py-12 sm:py-16 md:py-20 relative z-10 bg-white/30">
        <div className="container mx-auto px-4 sm:px-6">
          <h3 className="inline-block bg-blue text-cream px-3 py-2 text-sm sm:text-base font-bold uppercase tracking-wide mb-6 sm:mb-8 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] animate-fade-in-up">
            Interactive Demo
          </h3>
          <p className="text-base sm:text-lg md:text-xl text-black max-w-2xl mb-8 sm:mb-12 opacity-80">
            See EchoLock in action! Watch how secrets are encrypted, distributed, and automatically released in real-time.
          </p>
          <InteractiveDemo />
        </div>
      </section>

      <section className="py-12 sm:py-16 md:py-20 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-sm sm:text-base font-bold uppercase tracking-wide mb-6 sm:mb-8 shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] animate-fade-in-up">
            Current Status
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
            <div className="p-3 sm:p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Development Stage</div>
              <div className="text-base sm:text-lg font-bold text-blue font-sans">Prototype</div>
            </div>
            <div className="p-3 sm:p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Network</div>
              <div className="text-base sm:text-lg font-bold text-blue font-sans">Bitcoin Testnet</div>
            </div>
            <div className="p-3 sm:p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Security Audit</div>
              <div className="text-base sm:text-lg font-bold text-blue font-sans">Pending</div>
            </div>
            <div className="p-3 sm:p-4 border-2 border-black bg-white/50 neo-brutal-shadow neo-brutal-shadow-hover transition-all duration-300 hover:bg-white animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-xs font-bold text-black uppercase mb-1 opacity-60">Production Ready</div>
              <div className="text-base sm:text-lg font-bold text-blue font-sans">No</div>
            </div>
          </div>

          <p className="mt-6 sm:mt-8 text-sm sm:text-base text-black max-w-2xl opacity-80 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            This is experimental software. The cryptographic implementation requires a professional security audit before handling sensitive information.
          </p>
        </div>
      </section>

      <footer className="bg-black text-cream py-12 sm:py-16 relative border-t-4 border-blue">
        <div className="absolute inset-0 bg-gradient-to-r from-blue/10 to-red/10" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-bold text-sm sm:text-base">ECHOLOCK is open-source software under AGPL-3.0 license.</p>
              <p className="mt-2 text-xs sm:text-sm opacity-75">Contributions are welcome!</p>
            </div>
            <div className="flex gap-4 sm:gap-6 flex-wrap items-center">
              <a
                href="https://github.com/1e9c9h9o/echolock"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 border-2 border-cream bg-transparent hover:bg-cream hover:text-black transition-all duration-200 font-bold text-xs sm:text-sm uppercase tracking-wide"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
              <a
                href="https://github.com/1e9c9h9o/echolock/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm opacity-75 hover:opacity-100 transition-opacity underline"
              >
                Contributing Guide
              </a>
              <a
                href="https://github.com/1e9c9h9o/echolock/blob/main/SECURITY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs sm:text-sm opacity-75 hover:opacity-100 transition-opacity underline"
              >
                Security Policy
              </a>
            </div>
            <p className="mt-2 text-xs sm:text-sm opacity-75">Last updated: 2025-10-14</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
