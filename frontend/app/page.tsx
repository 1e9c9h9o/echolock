'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black bg-white">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Image src="/logo.png" alt="EchoLock" width={200} height={80} className="h-16 w-auto" />
          <Link href="/auth/login" className="bg-echo text-white px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-black border-2 border-black transition">
            Access System
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b-2 border-black bg-white">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-5xl">
            <h1 className="text-7xl md:text-8xl font-bold uppercase leading-none mb-8">
              Your secrets.<br />
              Your timeline.<br />
              <span className="bg-echo text-white px-3 py-1">Your control.</span>
            </h1>
            <p className="text-2xl mb-10 max-w-3xl leading-relaxed">
              A cryptographic dead man's switch. Secure, automatic, decentralized. No corporation. No surveillance. Just mathematics.
            </p>
            <Link href="/auth/signup" className="inline-block bg-echo text-white px-10 py-5 text-base font-bold uppercase tracking-wider hover:bg-black border-2 border-black transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Create Switch
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="border-b-2 border-black bg-white">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-0">
            <div className="border-r-2 border-black p-10 md:border-r-2 md:border-b-0 border-b-2 bg-white hover:bg-echo hover:text-white transition-colors group">
              <div className="w-16 h-16 bg-echo group-hover:bg-white border-2 border-black mb-6 flex items-center justify-center">
                <span className="text-3xl font-bold text-white group-hover:text-echo">1</span>
              </div>
              <h3 className="text-3xl font-bold uppercase mb-4">Store</h3>
              <p className="text-base leading-relaxed">
                Encrypt your message. Split into fragments. Distribute across decentralized relays. Nobody can read it.
              </p>
            </div>
            <div className="border-r-2 border-black p-10 md:border-r-2 md:border-b-0 border-b-2 bg-white hover:bg-lock hover:text-white transition-colors group">
              <div className="w-16 h-16 bg-lock group-hover:bg-white border-2 border-black mb-6 flex items-center justify-center">
                <span className="text-3xl font-bold text-white group-hover:text-lock">2</span>
              </div>
              <h3 className="text-3xl font-bold uppercase mb-4">Monitor</h3>
              <p className="text-base leading-relaxed">
                Check in regularly. Simple. Direct. The system tracks time using Bitcoin's blockchain. Immutable proof.
              </p>
            </div>
            <div className="p-10 bg-white hover:bg-accent hover:text-white transition-colors group">
              <div className="w-16 h-16 bg-accent group-hover:bg-white border-2 border-black mb-6 flex items-center justify-center">
                <span className="text-3xl font-bold text-white group-hover:text-accent">3</span>
              </div>
              <h3 className="text-3xl font-bold uppercase mb-4">Release</h3>
              <p className="text-base leading-relaxed">
                Miss a check-in? Your message automatically reconstructs and delivers. Mathematics, not trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-black bg-echo text-white">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-5xl font-bold uppercase mb-16">System Architecture</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl">
            <div className="border-2 border-white p-8 hover:bg-white hover:text-echo transition-colors">
              <div className="text-5xl font-bold mb-4">01</div>
              <h3 className="text-2xl font-bold uppercase mb-3">AES-256-GCM Encryption</h3>
              <p className="text-base leading-relaxed">Military-grade encryption. Your message is encrypted before it leaves your device.</p>
            </div>
            <div className="border-2 border-white p-8 hover:bg-white hover:text-echo transition-colors">
              <div className="text-5xl font-bold mb-4">02</div>
              <h3 className="text-2xl font-bold uppercase mb-3">Shamir Secret Sharing</h3>
              <p className="text-base leading-relaxed">Key split into 5 fragments. Need 3 to decrypt. No single point of failure.</p>
            </div>
            <div className="border-2 border-white p-8 hover:bg-white hover:text-echo transition-colors">
              <div className="text-5xl font-bold mb-4">03</div>
              <h3 className="text-2xl font-bold uppercase mb-3">Bitcoin Timelocks</h3>
              <p className="text-base leading-relaxed">OP_CHECKLOCKTIMEVERIFY. Cryptographic proof of time. Can't be manipulated.</p>
            </div>
            <div className="border-2 border-white p-8 hover:bg-white hover:text-echo transition-colors">
              <div className="text-5xl font-bold mb-4">04</div>
              <h3 className="text-2xl font-bold uppercase mb-3">Nostr Distribution</h3>
              <p className="text-base leading-relaxed">Fragments published to decentralized relays. Censorship-resistant. No single authority.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-b-2 border-black bg-white">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-5xl font-bold uppercase mb-16">Public Services</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
            <div className="border-2 border-black p-8 hover:border-echo hover:shadow-[8px_8px_0px_0px_rgba(199,62,58,1)] transition-all">
              <h3 className="text-2xl font-bold uppercase mb-4 text-echo">Digital Inheritance</h3>
              <p className="text-base leading-relaxed mb-3">Bitcoin seed phrases. Account passwords. Critical access credentials.</p>
              <p className="text-xs uppercase tracking-wider font-bold">For families</p>
            </div>
            <div className="border-2 border-black p-8 hover:border-lock hover:shadow-[8px_8px_0px_0px_rgba(45,139,60,1)] transition-all">
              <h3 className="text-2xl font-bold uppercase mb-4 text-lock">Whistleblower Protection</h3>
              <p className="text-base leading-relaxed mb-3">Time-delayed document release. Insurance against retaliation.</p>
              <p className="text-xs uppercase tracking-wider font-bold">For journalists</p>
            </div>
            <div className="border-2 border-black p-8 hover:border-accent hover:shadow-[8px_8px_0px_0px_rgba(43,123,158,1)] transition-all">
              <h3 className="text-2xl font-bold uppercase mb-4 text-accent">Business Continuity</h3>
              <p className="text-base leading-relaxed mb-3">Critical system access. Disaster recovery credentials.</p>
              <p className="text-xs uppercase tracking-wider font-bold">For operators</p>
            </div>
            <div className="border-2 border-black p-8 hover:border-black hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
              <h3 className="text-2xl font-bold uppercase mb-4">Personal Archive</h3>
              <p className="text-base leading-relaxed mb-3">Final messages. Instructions. Digital legacy.</p>
              <p className="text-xs uppercase tracking-wider font-bold">For everyone</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b-2 border-black bg-lock text-white">
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-6xl md:text-7xl font-bold uppercase mb-8 leading-tight">
            Free. Open. Secure.
          </h2>
          <p className="text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
            No corporation controls your data. No ads. No tracking. Just cryptographic tools for digital autonomy.
          </p>
          <Link href="/auth/signup" className="inline-block bg-white text-lock px-12 py-6 text-lg font-bold uppercase tracking-wider hover:bg-echo hover:text-white border-2 border-white transition shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            Start Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <Image src="/logo.png" alt="EchoLock" width={150} height={60} className="h-12 w-auto opacity-90" />
            </div>
            <div className="text-center md:text-right">
              <div className="text-sm uppercase tracking-wider mb-2 font-bold">
                Built on Bitcoin & Nostr
              </div>
              <div className="text-sm">
                Open Source • MIT License
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
