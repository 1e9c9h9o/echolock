'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Image src="/logo.png" alt="EchoLock" width={120} height={40} className="h-10 w-auto" />
          <Link href="/auth/login" className="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black border-2 border-black transition">
            Access System
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b-2 border-black">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl">
            <h1 className="text-6xl font-bold uppercase leading-none mb-6">
              Your secrets.<br />
              Your timeline.<br />
              <span className="bg-black text-white px-2">Your control.</span>
            </h1>
            <p className="text-xl mb-8 max-w-2xl">
              A cryptographic dead man's switch. Secure, automatic, decentralized. No corporation. No surveillance. Just mathematics.
            </p>
            <Link href="/auth/signup" className="inline-block bg-warning text-white px-8 py-4 text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-warning border-2 border-warning transition">
              Create Switch
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="border-b-2 border-black">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-0">
            <div className="border-r-2 border-black p-8 md:border-r-2 md:border-b-0 border-b-2">
              <h3 className="text-2xl font-bold uppercase mb-4">Store</h3>
              <p className="text-sm leading-relaxed">
                Encrypt your message. Split into fragments. Distribute across decentralized relays. Nobody can read it.
              </p>
            </div>
            <div className="border-r-2 border-black p-8 md:border-r-2 md:border-b-0 border-b-2">
              <h3 className="text-2xl font-bold uppercase mb-4">Monitor</h3>
              <p className="text-sm leading-relaxed">
                Check in regularly. Simple. Direct. The system tracks time using Bitcoin's blockchain. Immutable proof.
              </p>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold uppercase mb-4">Release</h3>
              <p className="text-sm leading-relaxed">
                Miss a check-in? Your message automatically reconstructs and delivers. Mathematics, not trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-black bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold uppercase mb-12">System Architecture</h2>
          <div className="space-y-6 max-w-3xl">
            <div className="flex">
              <div className="w-12 flex-shrink-0 font-mono font-bold">01</div>
              <div>
                <h3 className="font-bold uppercase mb-2">AES-256-GCM Encryption</h3>
                <p className="text-sm opacity-90">Military-grade encryption. Your message is encrypted before it leaves your device.</p>
              </div>
            </div>
            <div className="flex">
              <div className="w-12 flex-shrink-0 font-mono font-bold">02</div>
              <div>
                <h3 className="font-bold uppercase mb-2">Shamir Secret Sharing</h3>
                <p className="text-sm opacity-90">Key split into 5 fragments. Need 3 to decrypt. No single point of failure.</p>
              </div>
            </div>
            <div className="flex">
              <div className="w-12 flex-shrink-0 font-mono font-bold">03</div>
              <div>
                <h3 className="font-bold uppercase mb-2">Bitcoin Timelocks</h3>
                <p className="text-sm opacity-90">OP_CHECKLOCKTIMEVERIFY. Cryptographic proof of time. Can't be manipulated.</p>
              </div>
            </div>
            <div className="flex">
              <div className="w-12 flex-shrink-0 font-mono font-bold">04</div>
              <div>
                <h3 className="font-bold uppercase mb-2">Nostr Distribution</h3>
                <p className="text-sm opacity-90">Fragments published to decentralized relays. Censorship-resistant. No single authority.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b-2 border-black">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold uppercase mb-12">Public Services</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            <div>
              <h3 className="text-xl font-bold uppercase mb-3">Digital Inheritance</h3>
              <p className="text-sm leading-relaxed mb-2">Bitcoin seed phrases. Account passwords. Critical access credentials.</p>
              <p className="text-xs uppercase text-gray-600">For families</p>
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase mb-3">Whistleblower Protection</h3>
              <p className="text-sm leading-relaxed mb-2">Time-delayed document release. Insurance against retaliation.</p>
              <p className="text-xs uppercase text-gray-600">For journalists</p>
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase mb-3">Business Continuity</h3>
              <p className="text-sm leading-relaxed mb-2">Critical system access. Disaster recovery credentials.</p>
              <p className="text-xs uppercase text-gray-600">For operators</p>
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase mb-3">Personal Archive</h3>
              <p className="text-sm leading-relaxed mb-2">Final messages. Instructions. Digital legacy.</p>
              <p className="text-xs uppercase text-gray-600">For everyone</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-2 border-black bg-warning text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-5xl font-bold uppercase mb-6">
            Free. Open. Secure.
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            No corporation controls your data. No ads. No tracking. Just cryptographic tools for digital autonomy.
          </p>
          <Link href="/auth/signup" className="inline-block bg-white text-warning px-8 py-4 text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white border-2 border-white transition">
            Start Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0 text-xs uppercase tracking-wider">
              Built on Bitcoin & Nostr
            </div>
            <div className="text-xs">
              Open Source • MIT License
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
