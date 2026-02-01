'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Plus, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authAPI } from '@/lib/api'
import TwoFactorPrompt from '@/components/TwoFactorPrompt'
import WelcomeModal from '@/components/WelcomeModal'
import OnboardingChecklist from '@/components/OnboardingChecklist'

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.3"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.6"/>
      <circle cx="50" cy="50" r="16" fill="#FF6B00"/>
    </svg>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, setUser, logout } = useAuthStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    // Verify session on page load
    const verifySession = async () => {
      try {
        const currentUser = await authAPI.getMe()
        if (currentUser) {
          setUser(currentUser)
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Session verification failed:', error)
        router.push('/auth/login')
      } finally {
        setIsVerifying(false)
      }
    }

    // Only verify if we're not already authenticated
    if (!isAuthenticated) {
      verifySession()
    } else {
      setIsVerifying(false)
    }
  }, [isAuthenticated, setUser, router])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Show loading while verifying session
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-blue flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <LogoMark className="w-full h-full text-black animate-pulse" />
          </div>
          <p className="text-sm text-black/60 uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-blue flex flex-col">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-orange hover:text-black transition-colors"
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href="/dashboard" className="flex items-center gap-4">
                <div className="w-10 h-10">
                  <LogoMark className="w-full h-full text-white" />
                </div>
                <span className="text-sm font-bold tracking-[0.2em] uppercase hidden sm:inline">Echolock</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs opacity-60 hidden md:inline">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-[11px] uppercase tracking-wider px-4 py-2 hover:bg-orange hover:text-black transition-colors flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-2 hazard-stripe" />

      <div className="flex flex-1">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          w-64 bg-white border-r-4 border-black flex flex-col
          fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          mt-[72px] lg:mt-0
        `}>
          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="text-[9px] uppercase tracking-widest text-black/50 px-4 py-2 mb-2">Navigation</div>
            <NavLink href="/dashboard" icon={Home} onClick={() => setIsSidebarOpen(false)}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/create" icon={Plus} onClick={() => setIsSidebarOpen(false)}>
              Create Switch
            </NavLink>
            <NavLink href="/dashboard/settings" icon={Settings} onClick={() => setIsSidebarOpen(false)}>
              Settings
            </NavLink>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t-2 border-black/10">
            <div className="text-[9px] uppercase tracking-widest text-black/50 mb-2">System Status</div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-orange rounded-full animate-pulse" />
              <span>Operational</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-blue-light">
          <div className="max-w-6xl mx-auto p-6 lg:p-8">
            <TwoFactorPrompt />
            <OnboardingChecklist className="mb-6" />
            {children}
          </div>
        </main>
      </div>

      {/* Onboarding modal for first-time users */}
      <WelcomeModal />
    </div>
  )
}

function NavLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string
  icon: any
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-4 py-3 text-black hover:bg-orange hover:text-black transition-colors mb-1 text-sm font-bold border-l-4 border-transparent hover:border-black"
    >
      <Icon className="h-5 w-5 mr-3" strokeWidth={2} />
      <span>{children}</span>
    </Link>
  )
}
