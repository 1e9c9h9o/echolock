'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Lock, Users, Zap, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="EchoLock" width={120} height={40} className="h-10 w-auto" />
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-text-secondary hover:text-secondary">
              Features
            </Link>
            <Link href="#how-it-works" className="text-text-secondary hover:text-secondary">
              How It Works
            </Link>
            <Link href="/auth/login" className="bg-primary text-white px-6 py-2 hover:bg-accent transition">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-secondary mb-6">
            Your Digital Legacy,
            <br />
            <span className="text-primary">Protected by Cryptography</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            A cryptographic dead man's switch that ensures your secrets are delivered
            to the right people at the right time, using Bitcoin timelocks and Nostr distribution.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-primary text-white px-8 py-4 text-lg font-medium hover:bg-accent transition"
            >
              Create Your First Switch
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-border text-secondary px-8 py-4 text-lg font-medium hover:border-primary transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-surface py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-secondary mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Built on proven cryptographic primitives and decentralized technologies
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white border-2 border-warning p-8">
              <div className="bg-warning w-14 h-14 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-3">
                Shamir Secret Sharing
              </h3>
              <p className="text-text-secondary">
                Your secrets are split into encrypted fragments. No single piece reveals anything.
              </p>
            </div>

            <div className="bg-white border-2 border-success p-8">
              <div className="bg-success w-14 h-14 flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-3">
                Bitcoin Timelocks
              </h3>
              <p className="text-text-secondary">
                Cryptographic proof of time passage using Bitcoin's OP_CHECKLOCKTIMEVERIFY.
              </p>
            </div>

            <div className="bg-white border-2 border-primary p-8">
              <div className="bg-primary w-14 h-14 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-secondary mb-3">
                Nostr Distribution
              </h3>
              <p className="text-text-secondary">
                Censorship-resistant delivery via the decentralized Nostr protocol.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-secondary mb-4">
            How It Works
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            Simple to use, impossible to compromise
          </p>

          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-primary text-white w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-2">
                  Create Your Switch
                </h3>
                <p className="text-text-secondary">
                  Write your message, add recipients, and set your check-in interval.
                  Your message is encrypted with military-grade AES-256.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-success text-white w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-2">
                  Fragments are Distributed
                </h3>
                <p className="text-text-secondary">
                  Your encrypted message is split into fragments using Shamir Secret Sharing,
                  then distributed across multiple Nostr relays.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-accent text-white w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-2">
                  Check In Regularly
                </h3>
                <p className="text-text-secondary">
                  Simply log in before your timer expires. Miss a check-in? Your recipients
                  automatically receive their fragments.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-warning text-white w-12 h-12 flex items-center justify-center font-bold flex-shrink-0 text-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-2">
                  Automatic Release
                </h3>
                <p className="text-text-secondary">
                  If you don't check in, your message is automatically reassembled and
                  delivered to your recipients via email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-surface py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-secondary mb-12">
            Use Cases
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white border border-border p-6">
              <Users className="h-10 w-10 text-primary mb-4" strokeWidth={2} />
              <h3 className="font-bold text-secondary mb-2">Family Legacy</h3>
              <p className="text-text-secondary text-sm">
                Share passwords, accounts, and important documents with loved ones.
              </p>
            </div>

            <div className="bg-white border border-border p-6">
              <Lock className="h-10 w-10 text-success mb-4" strokeWidth={2} />
              <h3 className="font-bold text-secondary mb-2">Cryptocurrency</h3>
              <p className="text-text-secondary text-sm">
                Ensure your crypto holdings aren't lost forever if something happens.
              </p>
            </div>

            <div className="bg-white border border-border p-6">
              <CheckCircle className="h-10 w-10 text-accent mb-4" strokeWidth={2} />
              <h3 className="font-bold text-secondary mb-2">Business Continuity</h3>
              <p className="text-text-secondary text-sm">
                Share critical credentials with your team when needed.
              </p>
            </div>

            <div className="bg-white border border-border p-6">
              <Zap className="h-10 w-10 text-warning mb-4" strokeWidth={2} />
              <h3 className="font-bold text-secondary mb-2">Personal Messages</h3>
              <p className="text-text-secondary text-sm">
                Leave final words, instructions, or memories for those you care about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Protect Your Digital Legacy?
          </h2>
          <p className="text-xl text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
            Join the beta and be among the first to experience next-generation secret sharing.
          </p>
          <Link
            href="/auth/signup"
            className="bg-white text-primary px-8 py-4 text-lg font-medium hover:bg-surface transition inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-text-disabled py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <Image src="/logo.png" alt="EchoLock" width={120} height={40} className="h-8 w-auto opacity-70" />
            </div>
            <div className="text-sm">
              © 2025 EchoLock. Built on Bitcoin and Nostr.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
