'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy create page - redirects to the new wizard
 *
 * The old server-side encryption flow is deprecated.
 * All new switches should use client-side encryption via the wizard.
 */
export default function CreateSwitchPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/create-wizard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-mono text-lg">Redirecting to switch wizard...</p>
    </div>
  )
}
