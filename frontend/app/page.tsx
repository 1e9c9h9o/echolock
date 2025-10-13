'use client'

import Link from 'next/link'
import { Shield, Clock, Lock, Users, Zap, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">EchoLock</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">
              How It Works
            </Link>
            <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Digital Legacy,
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Protected by Cryptography
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A cryptographic dead man's switch that ensures your secrets are delivered
            to the right people at the right time, using Bitcoin timelocks and Nostr distribution.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Create Your First Switch
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Built on proven cryptographic primitives and decentralized technologies
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl">
              <div className="bg-blue-600 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Shamir Secret Sharing
              </h3>
              <p className="text-gray-600">
                Your secrets are split into encrypted fragments. No single piece reveals anything.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl">
              <div className="bg-purple-600 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Bitcoin Timelocks
              </h3>
              <p className="text-gray-600">
                Cryptographic proof of time passage using Bitcoin's OP_CHECKLOCKTIMEVERIFY.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl">
              <div className="bg-green-600 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Nostr Distribution
              </h3>
              <p className="text-gray-600">
                Censorship-resistant delivery via the decentralized Nostr protocol.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Simple to use, impossible to compromise
          </p>

          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Create Your Switch
                </h3>
                <p className="text-gray-600">
                  Write your message, add recipients, and set your check-in interval.
                  Your message is encrypted with military-grade AES-256.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Fragments are Distributed
                </h3>
                <p className="text-gray-600">
                  Your encrypted message is split into fragments using Shamir Secret Sharing,
                  then distributed across multiple Nostr relays.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Check In Regularly
                </h3>
                <p className="text-gray-600">
                  Simply log in before your timer expires. Miss a check-in? Your recipients
                  automatically receive their fragments.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Automatic Release
                </h3>
                <p className="text-gray-600">
                  If you don't check in, your message is automatically reassembled and
                  delivered to your recipients via email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Use Cases
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-xl">
              <Users className="h-10 w-10 text-blue-600 mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Family Legacy</h3>
              <p className="text-gray-600 text-sm">
                Share passwords, accounts, and important documents with loved ones.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <Shield className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Cryptocurrency</h3>
              <p className="text-gray-600 text-sm">
                Ensure your crypto holdings aren't lost forever if something happens.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <Lock className="h-10 w-10 text-green-600 mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Business Continuity</h3>
              <p className="text-gray-600 text-sm">
                Share critical credentials with your team when needed.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <CheckCircle className="h-10 w-10 text-orange-600 mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Personal Messages</h3>
              <p className="text-gray-600 text-sm">
                Leave final words, instructions, or memories for those you care about.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Protect Your Digital Legacy?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the beta and be among the first to experience next-generation secret sharing.
          </p>
          <Link
            href="/dashboard"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition shadow-lg inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6" />
              <span className="text-lg font-bold text-white">EchoLock</span>
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
