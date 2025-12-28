'use client'

import { ReactNode } from 'react'
import { PageErrorBoundary } from './ErrorBoundary'

/**
 * Client-side wrapper for PageErrorBoundary
 * Use this in Server Components like layout.tsx
 */
export default function ClientErrorBoundary({ children }: { children: ReactNode }) {
  return <PageErrorBoundary>{children}</PageErrorBoundary>
}
