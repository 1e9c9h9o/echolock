'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, Clock, Users, Key, Shield, Mail, AlertTriangle, CheckCircle, RefreshCw, GraduationCap, Code } from 'lucide-react'

type ExplainMode = 'eli5' | 'technical'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

// Toggle component
function ModeToggle({ mode, setMode }: { mode: ExplainMode; setMode: (m: ExplainMode) => void }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white border-2 border-black p-1">
      <button
        onClick={() => setMode('eli5')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors ${
          mode === 'eli5' ? 'bg-orange text-black' : 'text-black/50 hover:text-black'
        }`}
      >
        <GraduationCap className="h-3 w-3" />
        Simple
      </button>
      <button
        onClick={() => setMode('technical')}
        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-colors ${
          mode === 'technical' ? 'bg-black text-white' : 'text-black/50 hover:text-black'
        }`}
      >
        <Code className="h-3 w-3" />
        Technical
      </button>
    </div>
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
    <div id={id} className="border-b border-black/20">
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
  const [mode, setMode] = useState<ExplainMode>('eli5')
  const isEli5 = mode === 'eli5'

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
              <Link href="/auth/login" className="text-[11px] uppercase tracking-wider px-4 py-2 bg-orange text-black font-bold">Log In</Link>
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
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-4">
            User Guide
          </h1>
          <p className="text-lg text-black/70 mb-4">
            {isEli5
              ? "Learn how EchoLock works. We'll explain it simply!"
              : "How to use EchoLock. Start here if you're new."}
          </p>

          {/* Centered toggle */}
          <div className="flex justify-center">
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-black text-white p-4 mb-8">
          <div className="flex flex-wrap gap-4 text-xs justify-center">
            <a href="#how-it-works" className="opacity-70 hover:opacity-100 hover:text-orange">How It Works</a>
            <span className="opacity-30">|</span>
            <a href="#concepts" className="opacity-70 hover:opacity-100 hover:text-orange">{isEli5 ? "Main Ideas" : "Key Concepts"}</a>
            <span className="opacity-30">|</span>
            <a href="#creating" className="opacity-70 hover:opacity-100 hover:text-orange">{isEli5 ? "Setting Up" : "Creating a Switch"}</a>
            <span className="opacity-30">|</span>
            <a href="#managing" className="opacity-70 hover:opacity-100 hover:text-orange">Managing</a>
            <span className="opacity-30">|</span>
            <a href="#recipients" className="opacity-70 hover:opacity-100 hover:text-orange">{isEli5 ? "Getting Messages" : "For Recipients"}</a>
          </div>
        </div>

        {/* Content sections */}
        <div className="bg-white border-2 border-black">

          {/* How It Works */}
          <Section id="how-it-works" title="How It Works" defaultOpen={true}>
            <div className="space-y-6">
              {isEli5 ? (
                <>
                  <div className="bg-blue-light border-2 border-black p-4">
                    <p className="text-sm mb-4">
                      Think of it like a <strong>safety deposit box</strong> that opens automatically if you don't visit the bank for a while.
                    </p>
                    <ol className="space-y-2 list-decimal list-inside text-sm">
                      <li>You write a secret (like passwords or a message)</li>
                      <li>You pick trusted people to help guard it</li>
                      <li>You agree to check in every few days</li>
                      <li>As long as you check in, nothing happens</li>
                      <li>If you stop checking in, your message gets delivered</li>
                    </ol>
                  </div>
                  <p className="text-sm text-black/70">
                    It's like having a trusted friend who says "If I don't hear from you in a week, give this envelope to my family."
                    Except instead of one friend, you have several — and the math makes it impossible for any of them to peek!
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-blue-light border-2 border-black p-4 font-mono text-sm">
                    <div className="text-black/50 mb-2">// The basic flow</div>
                    <div className="space-y-1">
                      <div>1. You write a secret message</div>
                      <div>2. You choose who receives it (recipient)</div>
                      <div>3. You choose guardians to watch for you (3-9 people)</div>
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
                </>
              )}
            </div>
          </Section>

          {/* Key Concepts */}
          <Section id="concepts" title={isEli5 ? "Main Ideas" : "Key Concepts"}>
            <div className="space-y-6">

              {/* Heartbeat */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  {isEli5 ? <span className="text-lg">👋</span> : <Clock className="h-5 w-5 text-black" />}
                </div>
                <div>
                  <h3 className="font-bold text-black">{isEli5 ? "Check-in (Saying \"I'm OK!\")" : "Heartbeat (Check-in)"}</h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "Every few days, you click a button or link to say \"I'm still here!\" This resets your timer. If you don't check in before time runs out, EchoLock assumes something happened and starts delivering your message."
                      : "A heartbeat is proof you're still active. You send one by clicking a button in the app or clicking a link in an email reminder. Each heartbeat resets your timer. If no heartbeat arrives before the timer expires, the release process begins."}
                  </p>
                </div>
              </div>

              {/* Guardians */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  {isEli5 ? <span className="text-lg">🛡️</span> : <Users className="h-5 w-5 text-black" />}
                </div>
                <div>
                  <h3 className="font-bold text-black">{isEli5 ? "Trusted Helpers" : "Guardians"}</h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "You pick a group of people (or services) to help — typically 3 to 9. Each one holds a \"puzzle piece\" of your secret key. They can be family, friends, your lawyer, or even EchoLock itself. None of them can read your secret alone — they'd need to work together!"
                      : "Guardians are people or services who hold one piece of your encryption key and watch for your heartbeats. You choose how many (3 to 9) and the threshold required. They can be family, friends, professionals, or services like EchoLock."}
                  </p>
                  <div className="mt-3 bg-blue-light border border-black/10 p-3 text-xs">
                    {isEli5 ? (
                      <>
                        <strong>How many helpers do I need?</strong><br />
                        You choose! The default is 5 helpers where any 3 can unlock your message. Fewer helpers (3) is simpler. More helpers (7 or 9) is more secure. The key idea: you always need MORE than half to unlock, so no small group can cheat.
                      </>
                    ) : (
                      <>
                        <strong>Configurable thresholds</strong><br />
                        Presets: 2-of-3 (simple), 3-of-5 (balanced), 4-of-7 (high security), 5-of-9 (enterprise).
                        The threshold is always more than half, so below-threshold collusion reveals nothing.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  {isEli5 ? <span className="text-lg">💌</span> : <Mail className="h-5 w-5 text-black" />}
                </div>
                <div>
                  <h3 className="font-bold text-black">{isEli5 ? "Who Gets Your Message" : "Recipients"}</h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "This is the person (or people) who will receive your secret if you stop checking in. When your helpers release their puzzle pieces, the recipient collects enough pieces to unlock and read your message."
                      : "Recipients are who receive your message when released. When guardians release their key pieces, recipients collect 3+ pieces, combine them to get the encryption key, and decrypt your message."}
                  </p>
                </div>
              </div>

              {/* Threshold */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange flex items-center justify-center flex-shrink-0">
                  {isEli5 ? <span className="text-lg">⏱️</span> : <RefreshCw className="h-5 w-5 text-black" />}
                </div>
                <div>
                  <h3 className="font-bold text-black">{isEli5 ? "How Often to Check In" : "Check-in Interval"}</h3>
                  <p className="text-sm text-black/70 mt-1">
                    {isEli5
                      ? "You decide how long you can go without checking in — from 1 day to 7 days. Pick something realistic! If you travel a lot, choose a longer time. If it's urgent, pick shorter. You'll get email reminders before time runs out."
                      : "How long you can go without checking in before release begins. Options range from 24 hours to 7 days. Choose based on how often you're normally online and how much buffer you want for travel or illness."}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Creating a Switch */}
          <Section id="creating" title={isEli5 ? "Setting Up Your Switch" : "Creating a Switch"}>
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                {isEli5
                  ? "Before you start, think about: What secret do you want to share? Who should get it? Who are your trusted helpers? How often can you check in?"
                  : "Before you start, you need to decide: what message you want to deliver, who receives it, who your guardians are, your threshold level, and how often you can reliably check in."}
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-black">{isEli5 ? "Write Your Secret" : "Write Your Message"}</h4>
                    <p className="text-sm text-black/70">
                      {isEli5
                        ? "This could be your passwords, where important documents are, instructions for your family, or just a personal note. It gets scrambled (encrypted) on YOUR device before going anywhere — nobody can read it!"
                        : "This could be passwords, account credentials, location of documents, instructions, or a personal message. The message is encrypted on your device before anything is sent anywhere."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-black">{isEli5 ? "Choose Who Gets It" : "Add Recipient(s)"}</h4>
                    <p className="text-sm text-black/70">
                      {isEli5
                        ? "Pick the person who should receive your message. They'll need an EchoLock account (it's free) so they have a special ID to receive encrypted messages."
                        : "Enter the Nostr public key (npub) of each person who should receive the message. If they don't have one, they can sign up on EchoLock to get one."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-black">{isEli5 ? "Pick Your Trusted Helpers" : "Configure Guardians"}</h4>
                    <p className="text-sm text-black/70">
                      {isEli5
                        ? "Choose your trusted people — as few as 3 or as many as 9. Good choices: family members, close friends, a professional (like your lawyer), and maybe EchoLock as one helper. Mix it up so you don't depend on just one type of person!"
                        : "Choose your threshold (default 3-of-5) and configure each guardian with a name and their Nostr public key. Suggested mix: family, friends, professionals (lawyer/accountant), and optionally EchoLock service."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">4</div>
                  <div>
                    <h4 className="font-bold text-black">{isEli5 ? "Set Your Check-in Schedule" : "Set Check-in Interval"}</h4>
                    <p className="text-sm text-black/70">
                      {isEli5
                        ? "How often will you check in? Every day? Every 3 days? Every week? Pick something you can stick to. If you travel a lot or get busy, give yourself more time. You'll get email reminders!"
                        : "Choose how often you need to check in: 24 hours (urgent), 3 days (balanced), or 7 days (more buffer). You'll receive reminders before each deadline."}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center flex-shrink-0 font-bold">5</div>
                  <div>
                    <h4 className="font-bold text-black">{isEli5 ? "Double-Check & Go!" : "Confirm"}</h4>
                    <p className="text-sm text-black/70">
                      {isEli5
                        ? "Look everything over, then hit confirm. Your secret gets scrambled, the key gets split into pieces, each piece goes to a helper, and your timer starts ticking!"
                        : "Review everything, then confirm. Your message gets encrypted, the key gets split, shares go to guardians, and your timer starts."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Managing Your Switch */}
          <Section id="managing" title={isEli5 ? "Keeping It Running" : "Managing Your Switch"}>
            <div className="space-y-6">

              <div>
                <h3 className="font-bold text-black mb-2">{isEli5 ? "How to Check In" : "Checking In"}</h3>
                <p className="text-sm text-black/70 mb-3">{isEli5 ? "It's easy! You can check in by:" : "You can check in via:"}</p>
                <ul className="text-sm text-black/70 space-y-1 ml-4">
                  {isEli5 ? (
                    <>
                      <li>• <strong>On the website:</strong> Log in and click the "Check In" button</li>
                      <li>• <strong>From email:</strong> Click the link in your reminder email</li>
                      <li>• <strong>Takes 5 seconds:</strong> Just one click resets your timer!</li>
                    </>
                  ) : (
                    <>
                      <li>• <strong>Dashboard:</strong> Click "Check In" on your switch</li>
                      <li>• <strong>Email:</strong> Click the link in reminder emails</li>
                      <li>• <strong>API:</strong> POST to /api/heartbeat with your signature</li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">{isEli5 ? "Making Changes" : "Modifying a Switch"}</h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "You can change your secret message, who receives it, or how often you check in. But you can't change your helpers — they already have their puzzle pieces! To change helpers, you'd need to start a new switch."
                    : "You can update your message content, recipients, or check-in interval. You cannot change guardians without creating a new switch (they already hold shares)."}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-black mb-2">{isEli5 ? "Going on Vacation?" : "If You'll Be Unavailable"}</h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "If you're going somewhere without internet (surgery, camping, traveling), check in before you leave and change your timer to something longer. There's no pause button, but you can extend your time!"
                    : "For surgery, remote travel, etc: check in before you leave, then extend your interval temporarily. There's no \"pause\" button—extend the interval instead."}
                </p>
              </div>

              <div className="bg-orange/20 border-2 border-orange p-4">
                <h3 className="font-bold text-black mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {isEli5 ? "Oops! Forgot to Check In?" : "False Triggers"}
                </h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "If you just forgot: check in right away to stop things! But if your helpers already released their pieces, you can't take that back. If 3 or more pieces are out, your recipient might already be able to read your message. That's why picking the right check-in time matters!"
                    : "If you simply forgot to check in: you can check in again to stop further releases. But already-released shares cannot be recalled. If 3+ shares were released, the recipient may already have access. Choose your interval carefully."}
                </p>
              </div>
            </div>
          </Section>

          {/* What Happens When Triggered */}
          <Section id="triggered" title={isEli5 ? "When Time Runs Out" : "What Happens When Triggered"}>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                <div>
                  <h4 className="font-bold text-black">{isEli5 ? "Helpers Notice" : "Detection"}</h4>
                  <p className="text-sm text-black/70">
                    {isEli5
                      ? "Each of your helpers independently notices that you haven't checked in. They don't need to talk to each other — each one decides on their own."
                      : "Each guardian independently notices no heartbeat for the configured period. No coordination needed—they each decide on their own."}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                <div>
                  <h4 className="font-bold text-black">{isEli5 ? "Pieces Get Shared" : "Share Release"}</h4>
                  <p className="text-sm text-black/70">
                    {isEli5
                      ? "Each helper shares their puzzle piece publicly, but in a special wrapped way so only your recipient can open it. Like putting it in an envelope addressed only to them."
                      : "Guardians publish their encrypted shares publicly. The shares are encrypted so only the recipient can read them."}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-red-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                <div>
                  <h4 className="font-bold text-black">{isEli5 ? "Pieces Get Combined" : "Reconstruction"}</h4>
                  <p className="text-sm text-black/70">
                    {isEli5
                      ? "Your recipient collects at least 3 pieces, opens their special envelopes, and puts the puzzle together to get the key."
                      : "Recipient collects 3+ shares, decrypts them, and combines them to get the encryption key."}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">4</div>
                <div>
                  <h4 className="font-bold text-black">{isEli5 ? "Message Delivered" : "Decryption"}</h4>
                  <p className="text-sm text-black/70">
                    {isEli5
                      ? "The recipient uses the rebuilt key to unscramble your message."
                      : "Recipient uses the key to decrypt your message."}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* For Recipients */}
          <Section id="recipients" title={isEli5 ? "Getting Someone's Message" : "For Recipients: Recovering a Message"}>
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                {isEli5
                  ? "If someone set you up to receive their message and they stopped checking in, here's how to get it:"
                  : "If you're a recipient and a switch has triggered, here's how to recover the message."}
              </p>

              <div>
                <h3 className="font-bold text-black mb-2">{isEli5 ? "Using the Website" : "Using the Web Recovery Tool"}</h3>
                <ol className="text-sm text-black/70 space-y-2 ml-4 list-decimal">
                  {isEli5 ? (
                    <>
                      <li>Go to the recovery page on EchoLock</li>
                      <li>Log in with your account (your private key stays on your device!)</li>
                      <li>Enter the switch ID (the sender should have given you this)</li>
                      <li>Click "Recover" and the message appears!</li>
                    </>
                  ) : (
                    <>
                      <li>Go to <a href="/recovery-tool.html" className="text-orange hover:underline">echolock.xyz/recovery-tool</a></li>
                      <li>Enter your Nostr private key (decryption happens in your browser—never sent anywhere)</li>
                      <li>Enter the switch ID (provided by the sender, or found in notification)</li>
                      <li>Click "Recover"</li>
                    </>
                  )}
                </ol>
              </div>

              <div className="bg-blue-light border border-black/10 p-4">
                <h3 className="font-bold text-black mb-2">{isEli5 ? "What If EchoLock Goes Away?" : "If EchoLock Is Down"}</h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "Here's the cool part: you don't actually need EchoLock's website! The puzzle pieces and messages are stored on a public system called Nostr. Any tech-savvy person can help you recover using standard tools. EchoLock just makes it easier."
                    : "You can recover using any Nostr client. Look for events with kind 30080 tagged with your public key. Decrypt each share using NIP-44, combine 3+ shares with Shamir's algorithm, then find and decrypt the message (kind 30081)."}
                </p>
              </div>
            </div>
          </Section>

          {/* For Guardians */}
          <Section id="guardians" title={isEli5 ? "Being Someone's Helper" : "For Guardians: What You Need to Do"}>
            <div className="space-y-6">
              <p className="text-sm text-black/70">
                {isEli5
                  ? "If a friend or family member chose you as one of their trusted helpers, here's what that means for you:"
                  : "If someone chose you as a guardian, here's what that means."}
              </p>

              <div>
                <h3 className="font-bold text-black mb-2">{isEli5 ? "The Easy Way (Recommended)" : "Automated (Recommended)"}</h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "Just accept the invitation on EchoLock! The system handles everything automatically. You don't need to do anything — it watches for check-ins and releases your piece if needed. Set it and forget it!"
                    : "Use EchoLock or another guardian service. Accept the guardian invitation, and the service handles monitoring and release automatically. You don't need to do anything."}
                </p>
              </div>

              {!isEli5 && (
                <div>
                  <h3 className="font-bold text-black mb-2">Self-Hosted</h3>
                  <p className="text-sm text-black/70">
                    Run your own guardian daemon. Clone the EchoLock repository, configure it with
                    your keys, and run it. It monitors heartbeats and releases shares automatically.
                  </p>
                  <div className="bg-black text-white p-3 mt-2 font-mono text-xs">
                    <div>git clone https://github.com/1e9c9h9o/echolock.git</div>
                    <div>cd echolock/guardian-daemon</div>
                    <div>npm install</div>
                    <div>node index.ts</div>
                  </div>
                </div>
              )}

              <div className="bg-orange/20 border-2 border-orange p-4">
                <h3 className="font-bold text-black mb-2">{isEli5 ? "Can You Peek at the Secret?" : "Manual (Not Recommended)"}</h3>
                <p className="text-sm text-black/70">
                  {isEli5
                    ? "Nope! You only have ONE puzzle piece, and you'd need to meet the threshold to unlock anything. Fewer pieces than the threshold reveal nothing — the math makes it impossible to cheat. Your friend's secret is safe!"
                    : "If you're a guardian without automation, you'd need to periodically check Nostr for heartbeats and manually publish your share if none arrive. This is error-prone. Automated guardians are strongly recommended."}
                </p>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section id="security" title={isEli5 ? "Is This Safe?" : "Security Notes"}>
            <div className="space-y-6">
              {isEli5 ? (
                <>
                  <div className="bg-blue-light border-2 border-black p-4">
                    <h3 className="font-bold text-black mb-2">
                      What Makes It Secure
                    </h3>
                    <ul className="text-sm text-black/70 space-y-2">
                      <li>Your secret is encrypted on your device — the server never sees it</li>
                      <li>The key is split into pieces — you choose how many are needed to unlock</li>
                      <li>EchoLock cannot read your message — we only see encrypted data</li>
                      <li>If EchoLock disappears, everything still works — it's stored on public networks</li>
                    </ul>
                  </div>

                  <div className="bg-black text-white p-4">
                    <h3 className="font-bold text-orange mb-2">The Big Promise</h3>
                    <p className="text-sm text-white/80">
                      If EchoLock the company vanished tomorrow, your switch would still work exactly the same.
                      Your keys are on your device. The data is on public networks. We're just making it easier to use —
                      but we're not required.
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                      <li>• Enough guardians to meet your threshold are honest and available</li>
                    </ul>
                    <p className="text-sm text-black/70 mt-3 mb-2">You don't need to trust:</p>
                    <ul className="text-sm text-black/70 space-y-1 ml-4">
                      <li>• EchoLock</li>
                      <li>• Any single guardian</li>
                      <li>• Any single Nostr relay</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Glossary */}
          <Section id="glossary" title={isEli5 ? "Word List" : "Glossary"}>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {isEli5 ? (
                <>
                  <div className="space-y-3">
                    <div><strong>Check-in:</strong> Clicking a button to say "I'm OK!"</div>
                    <div><strong>Helper/Guardian:</strong> Someone holding one puzzle piece</div>
                    <div><strong>Recipient:</strong> Who gets your message</div>
                    <div><strong>Puzzle Piece/Share:</strong> One part of your split key</div>
                    <div><strong>Timer/Threshold:</strong> How long before message sends</div>
                  </div>
                  <div className="space-y-3">
                    <div><strong>Scrambled/Encrypted:</strong> Made unreadable without the key</div>
                    <div><strong>Nostr:</strong> A public network for storing data</div>
                    <div><strong>Key:</strong> The secret code that unlocks your message</div>
                    <div><strong>Switch:</strong> Your complete setup (message + helpers + timer)</div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </Section>

        </div>

        {/* Help links */}
        <div className="mt-8 bg-black text-white p-6">
          <h3 className="font-bold text-orange mb-4">{isEli5 ? "Want to Learn More?" : "Need More Help?"}</h3>
          <div className="flex flex-wrap gap-4">
            <Link href="/demo" className="text-sm bg-orange text-black px-4 py-2 font-bold hover:bg-white transition-colors">
              {isEli5 ? "See It In Action" : "Try the Demo"}
            </Link>
            <a href="https://github.com/1e9c9h9o/echolock/blob/main/docs/USER_GUIDE.md"
               target="_blank" rel="noopener noreferrer"
               className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors">
              {isEli5 ? "Full Details" : "Full Documentation"}
            </a>
            <a href="https://github.com/1e9c9h9o/echolock/issues"
               target="_blank" rel="noopener noreferrer"
               className="text-sm border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors">
              {isEli5 ? "Ask a Question" : "Report Issue"}
            </a>
          </div>
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
