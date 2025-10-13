'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r-2 border-black flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b-2 border-black">
          <Link href="/dashboard">
            <Image src="/logo.png" alt="EchoLock" width={120} height={40} className="h-10 w-auto" />
          </Link>
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
        <div className="p-6 border-t-2 border-black">
          <div className="mb-3">
            <p className="text-xs uppercase font-bold text-black truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center text-black hover:text-warning text-xs uppercase font-bold tracking-wider w-full transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={2} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-white">
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
      className="flex items-center px-4 py-3 text-black hover:bg-black hover:text-white transition-colors mb-1 border-2 border-transparent hover:border-black uppercase text-xs font-bold tracking-wider"
    >
      <Icon className="h-5 w-5 mr-3" strokeWidth={2} />
      <span>{children}</span>
    </Link>
  )
}
