'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b-2 border-black">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center gap-6">
            <Logo className="w-14 h-14 flex-shrink-0" />
            <div>
              <h1 className="font-sans text-4xl font-bold text-blue" style={{ textShadow: '2px 2px 0 #FF4D00', letterSpacing: '1px' }}>
                ECHOLOCK
              </h1>
              <div className="text-sm text-black mt-1 font-mono">localhost:3001</div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-black py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-5xl font-bold leading-tight max-w-3xl mb-4">
            Decentralized dead man's switch that cannot be shut down
          </h2>
          <p className="text-xl text-black max-w-2xl">
            Messages encrypted and distributed across a global relay network. Released automatically if you fail to check in. No single point of failure.
          </p>
          <div className="flex gap-4 mt-8 flex-wrap">
            <Link href="/auth/login">
              <Button variant="primary">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary">Sign Up</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black py-20">
        <div className="container mx-auto px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-base font-bold uppercase tracking-wide mb-8">
            How It Works
          </h3>

          <div className="grid md:grid-cols-3 gap-12 mt-12">
            <div>
              <div className="text-lg font-bold text-blue mb-2 font-sans">1. Encrypt Message</div>
              <div className="text-base text-black leading-relaxed">
                Your message is encrypted with AES-256-GCM. The encryption key is split into 5 fragments using Shamir's Secret Sharing.
              </div>
            </div>

            <div>
              <div className="text-lg font-bold text-blue mb-2 font-sans">2. Distribute Fragments</div>
              <div className="text-base text-black leading-relaxed">
                Fragments are distributed to 7+ Nostr relays globally. A Bitcoin timelock provides cryptographic proof of timing.
              </div>
            </div>

            <div>
              <div className="text-lg font-bold text-blue mb-2 font-sans">3. Automatic Release</div>
              <div className="text-base text-black leading-relaxed">
                If you don't check in within the specified time, any 3 of 5 fragments can reconstruct the key and decrypt your message.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <h3 className="inline-block bg-red text-cream px-3 py-2 text-base font-bold uppercase tracking-wide mb-8">
            Current Status
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="p-4 border-2 border-black bg-transparent">
              <div className="text-xs font-bold text-black uppercase mb-1">Development Stage</div>
              <div className="text-lg font-bold text-blue font-sans">Prototype</div>
            </div>
            <div className="p-4 border-2 border-black bg-transparent">
              <div className="text-xs font-bold text-black uppercase mb-1">Network</div>
              <div className="text-lg font-bold text-blue font-sans">Bitcoin Testnet</div>
            </div>
            <div className="p-4 border-2 border-black bg-transparent">
              <div className="text-xs font-bold text-black uppercase mb-1">Security Audit</div>
              <div className="text-lg font-bold text-blue font-sans">Pending</div>
            </div>
            <div className="p-4 border-2 border-black bg-transparent">
              <div className="text-xs font-bold text-black uppercase mb-1">Production Ready</div>
              <div className="text-lg font-bold text-blue font-sans">No</div>
            </div>
          </div>

          <p className="mt-8 text-black max-w-2xl">
            This is experimental software. The cryptographic implementation requires a professional security audit before handling sensitive information.
          </p>
        </div>
      </section>

      <footer className="bg-black text-cream py-16">
        <div className="container mx-auto px-6">
          <p>ECHOLOCK is open-source software. Contributions are welcome.</p>
          <p className="mt-2 text-sm opacity-75">Last updated: 2025-10-13</p>
        </div>
      </footer>
    </div>
  )
}
