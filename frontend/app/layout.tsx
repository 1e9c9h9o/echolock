import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EchoLock - Cryptographic Dead Man Switch',
  description: 'Secure secret sharing with Bitcoin timelocks and Nostr distribution',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
