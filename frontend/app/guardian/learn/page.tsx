'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Users,
  Eye,
  HelpCircle,
  Lock,
  Server,
  Github
} from 'lucide-react'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

function Section({
  title,
  children,
  defaultOpen = false
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-black/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-white hover:bg-blue-light transition-colors text-left"
      >
        <h2 className="text-lg font-bold text-black">{title}</h2>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-black/50" />
        ) : (
          <ChevronRight className="h-5 w-5 text-black/50" />
        )}
      </button>
      {isOpen && (
        <div className="p-6 pt-0 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

export default function GuardianLearnPage() {
  return (
    <div className="min-h-screen bg-blue">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-4">
              <div className="w-10 h-10">
                <LogoMark className="w-full h-full text-white" />
              </div>
              <span className="text-sm font-bold tracking-[0.2em] uppercase">Echolock</span>
            </Link>
          </div>
        </div>
      </header>
      <div className="h-2 hazard-stripe" />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-black/70 hover:text-orange text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Home
        </Link>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-4">
            Someone asked you to be a Guardian
          </h1>
          <p className="text-lg text-black/70">
            Here's what that means, in plain language. Takes 2 minutes to read.
          </p>
        </div>

        {/* Content sections */}
        <div className="bg-white border-2 border-black">

          {/* What is EchoLock? */}
          <Section title="What is EchoLock?" defaultOpen={true}>
            <div className="space-y-4">
              <div className="bg-blue-light border-2 border-black p-4">
                <p className="text-sm">
                  Think of EchoLock like a <strong>digital safety deposit box</strong> that opens
                  automatically if the owner stops showing up.
                </p>
              </div>

              <p className="text-sm text-black/70">
                Someone you know has written an important message &mdash; it could be passwords,
                instructions, or a personal note &mdash; and they want to make sure it reaches
                the right people if something ever happens to them.
              </p>

              <p className="text-sm text-black/70">
                As long as they check in regularly (clicking a button every few days), nothing
                happens. The message stays locked. But if they stop checking in, the system
                delivers their message automatically.
              </p>

              <div className="bg-gray-100 p-4 border border-gray-200">
                <p className="text-sm text-black/70">
                  <strong>Use cases:</strong> Sharing account passwords with family, leaving
                  instructions for a business partner, making sure important information isn't
                  lost if something unexpected happens.
                </p>
              </div>
            </div>
          </Section>

          {/* What does a guardian do? */}
          <Section title="What does a guardian do?">
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                Being a guardian is simple. You hold one piece of a digital key, and that's
                basically it.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-10 h-10 bg-blue-light flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-black/70" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Day to day: nothing</p>
                    <p className="text-xs text-black/70">
                      You don't need to check anything, install anything, or do anything
                      on a regular basis. The system runs on its own.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-10 h-10 bg-blue-light flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-black/70" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">If the switch triggers: your piece is released</p>
                    <p className="text-xs text-black/70">
                      If the person stops checking in, your piece of the key is automatically
                      shared so the intended recipients can read the message. You may get a
                      notification, but no action is required from you.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-gray-200">
                  <div className="w-10 h-10 bg-blue-light flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 text-black/70" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Your piece alone is useless</p>
                    <p className="text-xs text-black/70">
                      Multiple guardians must participate to unlock anything. Your piece on
                      its own reveals nothing &mdash; it's like having one piece of a jigsaw
                      puzzle with no picture on it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Common questions */}
          <Section title="Common questions">
            <div className="space-y-4">
              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">Is this a scam?</p>
                    <p className="text-xs text-black/70">
                      No. EchoLock is open-source software &mdash; anyone can inspect the code.
                      You're not being asked for money, passwords, or personal information.
                      Someone you know personally chose you because they trust you. If you're
                      unsure, ask them directly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">Can I see the message?</p>
                    <p className="text-xs text-black/70">
                      No. You hold one piece of the encryption key, not the message itself.
                      Even if you tried, your piece alone can't decrypt anything. The math
                      makes it impossible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">Does it cost anything?</p>
                    <p className="text-xs text-black/70">
                      No. Being a guardian is free. You don't need a paid account or subscription.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Server className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">Do I need to install anything?</p>
                    <p className="text-xs text-black/70">
                      No. Everything happens in your web browser. You just click a link to
                      accept the invitation. That's it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">What if I change my mind?</p>
                    <p className="text-xs text-black/70">
                      You can decline the invitation or ask the person to remove you. Being
                      a guardian is voluntary. However, once you accept, the person is counting
                      on you, so it's best to discuss any concerns with them first.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm mb-1">What if EchoLock shuts down?</p>
                    <p className="text-xs text-black/70">
                      The system still works. EchoLock is designed so that no company is
                      required. Messages and key pieces are stored on a public network called
                      Nostr. Even without EchoLock's website, everything still functions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* How the technology works */}
          <Section title="How the technology works">
            <div className="space-y-4">
              <p className="text-sm text-black/70">
                For the curious. You don't need to understand any of this to be a guardian.
              </p>

              <div className="bg-gray-100 p-4 border border-gray-200">
                <ol className="space-y-3 text-sm text-black/70">
                  <li className="flex gap-3">
                    <span className="font-bold text-black flex-shrink-0">1.</span>
                    <span>The person writes a message and encrypts it on their own device. Nobody else can read it.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-black flex-shrink-0">2.</span>
                    <span>The encryption key is split into pieces using a technique called Shamir's Secret Sharing. Each guardian gets one piece.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-black flex-shrink-0">3.</span>
                    <span>The person checks in regularly by publishing a signed "heartbeat" to a public network (Nostr).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-black flex-shrink-0">4.</span>
                    <span>Guardians (or automated software) watch for these heartbeats. Each guardian acts independently.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-black flex-shrink-0">5.</span>
                    <span>If heartbeats stop, guardians release their pieces. When enough pieces are collected, the message can be decrypted.</span>
                  </li>
                </ol>
              </div>

              <div className="bg-black text-white p-4">
                <p className="text-xs font-bold text-orange mb-2">Technical details</p>
                <ul className="text-xs text-white/70 space-y-1">
                  <li>Encryption: AES-256-GCM</li>
                  <li>Key splitting: Shamir's Secret Sharing (configurable M-of-N)</li>
                  <li>Share encryption: NIP-44 (Nostr encrypted messages)</li>
                  <li>Heartbeats: Signed Nostr events (kind 30078)</li>
                  <li>Optional: Bitcoin timelock commitments for verifiable timestamps</li>
                </ul>
              </div>
            </div>
          </Section>

        </div>

        {/* Footer CTA */}
        <div className="mt-8 bg-black text-white p-6">
          <p className="text-sm text-white/80 mb-4">
            When your friend sends the invitation, click the link. Accepting takes about 30 seconds.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/guide"
              className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors"
            >
              Full User Guide
            </Link>
            <a
              href="https://github.com/1e9c9h9o/echolock"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors inline-flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              View Source Code
            </a>
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-black/50">
            EchoLock is open-source (AGPL-3.0). Being a guardian is voluntary and free.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs opacity-50">
            ECHOLOCK v1.0 | Open Source (AGPL-3.0)
          </p>
        </div>
      </footer>
    </div>
  )
}
