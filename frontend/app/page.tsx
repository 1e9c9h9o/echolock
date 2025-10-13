'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <Image
          src="/logo.png"
          alt="EchoLock"
          width={300}
          height={120}
          className="w-64 h-auto mx-auto mb-12"
        />

        <h1 className="text-5xl font-bold mb-6">
          Cryptographic Dead Man's Switch
        </h1>

        <p className="text-xl mb-12 text-gray-700">
          Time-locked secret distribution using Bitcoin and Nostr
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/auth/login">
            <button className="bg-blue text-white px-10 py-4 text-base font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Login
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="bg-white text-black px-10 py-4 text-base font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              Sign Up
            </button>
          </Link>
        </div>

        <a
          href="https://www.echolock.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue hover:underline text-sm font-bold"
        >
          Learn more about EchoLock →
        </a>
      </div>
    </div>
  )
}
