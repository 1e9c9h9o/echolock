'use client'

import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-8">
      <div className="text-center max-w-3xl">
        <Image
          src="/logo.png"
          alt="EchoLock"
          width={200}
          height={200}
          className="w-48 h-auto mx-auto mb-16"
        />

        <h1 className="text-6xl font-extrabold mb-8 leading-tight">
          Cryptographic<br />Dead Man's Switch
        </h1>

        <p className="text-xl mb-16 font-mono leading-relaxed">
          Time-locked secret distribution using Bitcoin and Nostr
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
          <Link href="/auth/login">
            <Button variant="primary">Login</Button>
          </Link>
          <Link href="/auth/signup">
            <Button variant="secondary">Sign Up</Button>
          </Link>
        </div>

        <a
          href="https://www.echolock.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue hover:underline font-mono font-bold"
        >
          Learn more about EchoLock →
        </a>
      </div>
    </div>
  )
}
