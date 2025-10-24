import type { Metadata } from 'next'
import './globals.css'
import ToastContainer from '@/components/ui/ToastContainer'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900">
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  )
}
