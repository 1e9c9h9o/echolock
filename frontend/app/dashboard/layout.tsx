'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Home, Plus, Settings, LogOut } from 'lucide-react'
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
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-grid-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center space-x-grid-2">
            <Shield className="h-8 w-8 text-primary" strokeWidth={1.5} />
            <span className="text-xl font-bold text-secondary">EchoLock</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-grid-3">
          <NavLink href="/dashboard" icon={Home}>
            Dashboard
          </NavLink>
          <NavLink href="/dashboard/create" icon={Plus}>
            Create switch
          </NavLink>
          <NavLink href="/dashboard/settings" icon={Settings}>
            Settings
          </NavLink>
        </nav>

        {/* User info */}
        <div className="p-grid-4 border-t border-border">
          <div className="mb-grid-2">
            <p className="text-sm font-medium text-secondary truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-grid text-text-secondary hover:text-secondary text-sm w-full"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-grid-6">
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
      className="flex items-center space-x-grid-2 px-grid-3 py-grid-2 text-text-secondary hover:text-secondary hover:bg-surface transition-colors mb-grid"
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
      <span className="text-sm font-medium">{children}</span>
    </Link>
  )
}
