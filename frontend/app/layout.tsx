import type { Metadata } from 'next'
import './globals.css'
import ToastContainer from '@/components/ui/ToastContainer'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UIPreferencesProvider } from '@/contexts/UIPreferencesContext'
import ClientErrorBoundary from '@/components/ClientErrorBoundary'

export const metadata: Metadata = {
  title: 'ECHOLOCK — Cryptographic Dead Man\'s Switch',
  description: 'Decentralized dead man\'s switch with AES-256-GCM encryption, Shamir\'s Secret Sharing, Nostr relays, and Bitcoin timelocks',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-blue">
        <ThemeProvider>
          <UIPreferencesProvider>
            <ClientErrorBoundary>
              {children}
            </ClientErrorBoundary>
            <ToastContainer />
          </UIPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
