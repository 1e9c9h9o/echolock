'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { Home, Plus, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { authAPI } from '@/lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      logout()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r-2 border-black dark:border-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="font-sans text-xl font-bold text-blue dark:text-blue" style={{ textShadow: '1px 1px 0 #FF4D00' }}>ECHOLOCK</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <NavLink href="/dashboard" icon={Home}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/create" icon={Plus}>
            Create Switch
          </NavLink>
          <NavLink href="/dashboard/settings" icon={Settings}>
            Settings
          </NavLink>
        </nav>

        {/* User info */}
        <div className="p-6 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <p className="text-sm font-bold text-black dark:text-white truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center text-red hover:text-black dark:hover:text-white text-sm font-bold w-full transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={2} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-cream dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-3 text-black dark:text-white hover:bg-blue hover:text-white transition-colors mb-1 text-sm font-bold rounded"
    >
      <Icon className="h-5 w-5 mr-3" strokeWidth={2} />
      <span>{children}</span>
    </Link>
  )
}
