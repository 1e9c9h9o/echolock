'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, Clock, Users, Key, Shield, Mail, AlertTriangle, CheckCircle, Terminal, RefreshCw } from 'lucide-react'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

// Collapsible section component
function Section({
  id,
  title,
  children,
  defaultOpen = false
}: {
  id: string
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div id={id} className="border-b-2 border-black">
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

export default function GuidePage() {
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
            <nav className="flex items-center gap-2">
              <Link href="/demo" className="text-[11px] uppercase tracking-wider px-4 py-2 hover:bg-orange hover:text-black transition-colors">Demo</Link>
              <Link href="/auth/login" className="text-[11px] uppercase tracking-wider px-4 py-2 bg-orange text-black font-bold">Sign Up</Link>
            </nav>
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-4">
            User Guide
          </h1>
          <p className="text-lg text-black/70">
            How to use EchoLock. Start here if you're new.
          </p>
        </div>

        {/* Quick links */}
        <div className="bg-black text-white p-4 mb-8">
          <div className="flex flex-wrap gap-4 text-xs">
            <a href="#how-it-works" className="opacity-70 hover:opacity-100 hover:text-orange">How It Works</a>
            <span className="opacity-30">|</span>
            <a href="#concepts" className="opacity-70 hover:opacity-100 hover:text-orange">Key Concepts</a>
            <span className="opacity-30">|</span>
            <a href="#creating" className="opacity-70 hover:opacity-100 hover:text-orange">Creating a Switch</a>
            <span className="opacity-30">|</span>
            <a href="#managing" className="opacity-70 hover:opacity-100 hover:text-orange">Managing</a>
            <span className="opacity-30">|</span>
            <a href="#recipients" className="opacity-70 hover:opacity-100 hover:text-orange">For Recipients</a>
            <span className="opacity-30">|</span>
            <a href="#guardians" className="opacity-70 hover:opacity-100 hover:text-orange">For Guardians</a>
          </div>
        </div>

        {/* Content sections */}
        <div className="bg-white border-4 border-black">

          {/* How It Works */}
          <Section id="how-it-works" title="How It Works" defaultOpen={true}>
            <div className="space-y-6">
              <div className="bg-blue-light border-2 border-black p-4 font-mono text-sm">
                <div className="text-black/50 mb-2">// The basic flow</div>
                <div className="space-y-1">
                  <div>1. You write a secret message</div>
                  <div>2. You choose who receives it (recipient)</div>
                  <div>3. You choose 5 people to watch for you (guardians)</div>
                  <div>4. You set how often you need to check in (1-7 days)</div>
                  <div className="mt-3 text-black/50">// While you're active:</div>
                  <div>- You check in regularly</div>
                  <div>- Nothing happens</div>
                  <div>- Your message stays locked</div>
                  <div className="mt-3 text-black/50">// If you stop checking in:</div>
                  <div>- Guardians notice independently</div>
                  <div>- They release their key pieces</div>
                  <div>- Recipient unlocks your message</div>
                </div>
              </div>

              <p className="text-sm text-black/70">
                EchoLock delivers a message to someone you choose, but only if you stop checking in.
                As long as you keep clicking the check-in button (or link), nothing happens.
              </p>
            </div>
          </Section>

          {/* Key Concepts */}
          <Section id="concepts" title="Key Concepts">
            <div className="space-y-6">

              {/* Heartbeat */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Heartbeat (Check-in)</h3>
                  <p className="text-sm text-black/70 mt-1">
                    A heartbeat is proof you're still active. You send one by clicking a button in the app
                    or clicking a link in an email reminder. Each heartbeat resets your timer. If no heartbeat
                    arrives before the timer expires, the release process begins.
                  </p>
                </div>
              </div>

              {/* Guardians */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Guardians (5 Trusted Contacts)</h3>
                  <p className="text-sm text-black/70 mt-1">
                    Guardians are people or services who hold one piece of your encryption key and watch
                    for your heartbeats. They can be family, friends, professionals (lawyer, accountant),
                    or services like EchoLock.
                  </p>
                  <div className="mt-3 bg-blue-light p-3 text-xs">
                    <strong>Why 5 guardians with 3 required?</strong><br />
                    Your key is split so any 3 pieces can rebuild it, but 2 pieces reveal nothing.
                    This means: if 2 guardians go offline, recovery still works. If 2 guardians
                    try to collude, they can't read your secret.
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Recipients</h3>
                  <p className="text-sm text-black/70 mt-1">
                    Recipients are who receive your message when released. When guardians release their
                    key pieces, recipients collect 3+ pieces, combine them to get the encryption key,
                    and decrypt your message.
                  </p>
                </div>
              </div>

              {/* Threshold */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Check-in Interval</h3>
                  <p className="text-sm text-black/70 mt-1">
                    How long you can go without checking in before release begins. Options range from
                    24 hours to 7 days. Choose based on how often you're normally online and how much
                    buffer you want for travel or illness.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Creating a Switch */}
          <Section id="creating" title="Creating a Switch">
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                Before you start, you need to decide: what message you want to deliver, who receives it,
                who your 5 guardians are, and how often you can reliably check in.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-black">Write Your Message</h4>
                    <p className="text-sm text-black/70">
                      This could be passwords, account credentials, location of documents, instructions,
                      or a personal message. The message is encrypted on your device before anything
                      is sent anywhere.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-black">Add Recipient(s)</h4>
                    <p className="text-sm text-black/70">
                      Enter the Nostr public key (npub) of each person who should receive the message.
                      If they don't have one, they can sign up on EchoLock to get one.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-black">Configure 5 Guardians</h4>
                    <p className="text-sm text-black/70">
                      For each guardian, provide a name (for your reference) and their Nostr public key.
                      Suggested mix: 1 family member, 1 close friend, 1 professional (lawyer/accountant),
                      1 other trusted person, and optionally EchoLock service.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
                  <div>
                    <h4 className="font-bold text-black">Set Check-in Interval</h4>
                    <p className="text-sm text-black/70">
                      Choose how often you need to check in: 24 hours (urgent), 3 days (balanced),
                      or 7 days (more buffer). You'll receive reminders before each deadline.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
                  <div>
                    <h4 className="font-bold text-black">Confirm</h4>
                    <p className="text-sm text-black/70">
                      Review everything, then confirm. Your message gets encrypted, the key gets split,
                      shares go to guardians, and your timer starts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Managing Your Switch */}
          <Section id="managing" title="Managing Your Switch">
            <div className="space-y-6">

              <div>
                <h3 className="font-bold text-black mb-2">Checking In</h3>
                <p className="text-sm text-black/70 mb-3">You can check in via:</p>
                <ul className="text-sm text-black/70 space-y-1 ml-4">
                  <li>• <strong>Dashboard:</strong> Click "Check In" on your switch</li>
                  <li>• <strong>Email:</strong> Click the link in reminder emails</li>
                  <li>• <strong>API:</strong> POST to /api/heartbeat with your signature</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">Modifying a Switch</h3>
                <p className="text-sm text-black/70">
                  You can update your message content, recipients, or check-in interval.
                  You cannot change guardians without creating a new switch (they already hold shares).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">If You'll Be Unavailable</h3>
                <p className="text-sm text-black/70">
                  For surgery, remote travel, etc: check in before you leave, then extend your
                  interval temporarily. There's no "pause" button—extend the interval instead.
                </p>
              </div>

              <div className="bg-orange/20 border-2 border-orange p-4">
                <h3 className="font-bold text-black mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  False Triggers
                </h3>
                <p className="text-sm text-black/70">
                  If you simply forgot to check in: you can check in again to stop further releases.
                  But already-released shares cannot be recalled. If 3+ shares were released,
                  the recipient may already have access. Choose your interval carefully.
                </p>
              </div>
            </div>
          </Section>

          {/* What Happens When Triggered */}
          <Section id="triggered" title="What Happens When Triggered">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                <div>
                  <h4 className="font-bold text-black">Detection</h4>
                  <p className="text-sm text-black/70">
                    Each guardian independently notices no heartbeat for the configured period.
                    No coordination needed—they each decide on their own.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                <div>
                  <h4 className="font-bold text-black">Share Release</h4>
                  <p className="text-sm text-black/70">
                    Guardians publish their encrypted shares publicly. The shares are encrypted
                    so only the recipient can read them.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                <div>
                  <h4 className="font-bold text-black">Reconstruction</h4>
                  <p className="text-sm text-black/70">
                    Recipient collects 3+ shares, decrypts them, and combines them to get
                    the encryption key.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">4</div>
                <div>
                  <h4 className="font-bold text-black">Decryption</h4>
                  <p className="text-sm text-black/70">
                    Recipient uses the key to decrypt your message. Done.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* For Recipients */}
          <Section id="recipients" title="For Recipients: Recovering a Message">
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                If you're a recipient and a switch has triggered, here's how to recover the message.
              </p>

              <div>
                <h3 className="font-bold text-black mb-2">Using the Web Recovery Tool</h3>
                <ol className="text-sm text-black/70 space-y-2 ml-4 list-decimal">
                  <li>Go to <a href="/recover" className="text-orange hover:underline">echolock.xyz/recover</a></li>
                  <li>Enter your Nostr private key (decryption happens in your browser—never sent anywhere)</li>
                  <li>Enter the switch ID (provided by the sender, or found in notification)</li>
                  <li>Click "Recover"</li>
                </ol>
              </div>

              <div className="bg-blue-light p-4">
                <h3 className="font-bold text-black mb-2">If EchoLock Is Down</h3>
                <p className="text-sm text-black/70">
                  You can recover using any Nostr client. Look for events with kind 30080 tagged
                  with your public key. Decrypt each share using NIP-44, combine 3+ shares with
                  Shamir's algorithm, then find and decrypt the message (kind 30081).
                  See the <a href="https://github.com/Sandford28/echolock/blob/main/docs/USER_GUIDE.md" className="text-orange hover:underline">full guide</a> for details.
                </p>
              </div>
            </div>
          </Section>

          {/* For Guardians */}
          <Section id="guardians" title="For Guardians: What You Need to Do">
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                If someone chose you as a guardian, here's what that means.
              </p>

              <div>
                <h3 className="font-bold text-black mb-2">Automated (Recommended)</h3>
                <p className="text-sm text-black/70">
                  Use EchoLock or another guardian service. Accept the guardian invitation, and
                  the service handles monitoring and release automatically. You don't need to
                  do anything.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">Self-Hosted</h3>
                <p className="text-sm text-black/70">
                  Run your own guardian daemon. Clone the EchoLock repository, configure it with
                  your keys, and run it. It monitors heartbeats and releases shares automatically.
                </p>
                <div className="bg-black text-white p-3 mt-2 font-mono text-xs">
                  <div>git clone https://github.com/Sandford28/echolock.git</div>
                  <div>cd echolock/guardian-daemon</div>
                  <div>npm install</div>
                  <div>node index.ts</div>
                </div>
              </div>

              <div className="bg-orange/20 border-2 border-orange p-4">
                <h3 className="font-bold text-black mb-2">Manual (Not Recommended)</h3>
                <p className="text-sm text-black/70">
                  If you're a guardian without automation, you'd need to periodically check Nostr
                  for heartbeats and manually publish your share if none arrive. This is error-prone.
                  Automated guardians are strongly recommended.
                </p>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section id="security" title="Security Notes">
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-black mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    What EchoLock Can See
                  </h3>
                  <ul className="text-sm text-black/70 space-y-1">
                    <li>• Your public key</li>
                    <li>• Encrypted blobs (unreadable)</li>
                    <li>• When you check in</li>
                    <li>• Guardian/recipient public keys</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange" />
                    What EchoLock Cannot See
                  </h3>
                  <ul className="text-sm text-black/70 space-y-1">
                    <li>• Your private key</li>
                    <li>• Your message content</li>
                    <li>• The encryption key</li>
                  </ul>
                </div>
              </div>

              <div className="bg-black text-white p-4">
                <h3 className="font-bold text-orange mb-2">If EchoLock Disappears</h3>
                <p className="text-sm text-white/80">
                  Nothing changes. Your keys are on your device. Heartbeats are on public Nostr relays.
                  Guardians monitor Nostr directly. Recipients recover from Nostr directly.
                  No EchoLock server is required for any operation.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">Trust Model</h3>
                <p className="text-sm text-black/70 mb-2">You must trust:</p>
                <ul className="text-sm text-black/70 space-y-1 ml-4">
                  <li>• Your device isn't compromised</li>
                  <li>• Standard cryptography works (AES-256, Shamir, secp256k1)</li>
                  <li>• At least 3 of your 5 guardians are honest and available</li>
                </ul>
                <p className="text-sm text-black/70 mt-3 mb-2">You don't need to trust:</p>
                <ul className="text-sm text-black/70 space-y-1 ml-4">
                  <li>• EchoLock</li>
                  <li>• Any single guardian</li>
                  <li>• Any single Nostr relay</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Glossary */}
          <Section id="glossary" title="Glossary">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div><strong>Heartbeat:</strong> Signed message proving you're active</div>
                <div><strong>Guardian:</strong> Someone holding one piece of your key</div>
                <div><strong>Recipient:</strong> Someone who receives your message</div>
                <div><strong>Share:</strong> One piece of your split encryption key</div>
                <div><strong>Threshold:</strong> Time without heartbeat before release</div>
              </div>
              <div className="space-y-3">
                <div><strong>Nostr:</strong> Decentralized protocol for messages</div>
                <div><strong>npub:</strong> Nostr public key (starts with npub1)</div>
                <div><strong>nsec:</strong> Nostr private key (starts with nsec1)</div>
                <div><strong>NIP-44:</strong> Nostr encryption standard</div>
                <div><strong>Shamir:</strong> Algorithm to split secrets into pieces</div>
              </div>
            </div>
          </Section>

        </div>

        {/* Help links */}
        <div className="mt-8 bg-black text-white p-6">
          <h3 className="font-bold text-orange mb-4">Need More Help?</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/demo" className="text-sm bg-orange text-black px-4 py-2 font-bold hover:bg-white transition-colors">
              Try the Demo
            </Link>
            <a href="https://github.com/Sandford28/echolock/blob/main/docs/USER_GUIDE.md"
               target="_blank" rel="noopener noreferrer"
               className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors">
              Full Documentation
            </a>
            <a href="https://github.com/Sandford28/echolock/issues"
               target="_blank" rel="noopener noreferrer"
               className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors">
              Report Issue
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs opacity-50">
            ECHOLOCK v1.0 | Fully Decentralized | Open Source (AGPL-3.0)
          </p>
        </div>
      </footer>
    </div>
  )
}
