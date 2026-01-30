'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Lock, Trash2, Shield, Circle, Clock, Calendar, Key, Mail, Octagon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import KeyBackup from '@/components/KeyBackup'
import { useAuthStore, useSwitchStore } from '@/lib/store'
import { userAPI, switchesAPI } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

/**
 * High Performance HMI Settings/Profile Page
 *
 * Design principles:
 * - Muted structural elements (slate/gray)
 * - Color only for status indicators
 * - Clean information hierarchy
 * - Grouped settings in cards
 */
export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { switches, setSwitches } = useSwitchStore()

  // Load switches for stats
  useEffect(() => {
    const loadSwitches = async () => {
      try {
        const data = await switchesAPI.getAll()
        setSwitches(data)
      } catch (err) {
        // Silently fail - stats just won't show
      }
    }
    loadSwitches()
  }, [setSwitches])

  // Profile update state
  const [newEmail, setNewEmail] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteSection, setShowDeleteSection] = useState(false)

  // Get initials for avatar
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!newEmail || newEmail === user?.email) {
      setProfileError('Please enter a new email address')
      return
    }

    setProfileLoading(true)

    try {
      await userAPI.updateProfile({ email: newEmail })
      setProfileSuccess('Email updated successfully')
      setNewEmail('')
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update email')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordLoading(true)

    try {
      await userAPI.updateProfile({ password: newPassword })
      setPasswordSuccess('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError('')

    if (!deletePassword) {
      setDeleteError('Please enter your password')
      return
    }

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
      return
    }

    setDeleteLoading(true)

    try {
      await userAPI.deleteAccount(deletePassword)
      logout()
      router.push('/')
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  const activeSwitches = switches.filter(s => s.status === 'ARMED').length

  // Mock user for UI experiments
  const displayUser = user || { email: 'demo@echolock.xyz', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }

  return (
    <div className="bg-slate-50 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
      </div>

      {/* Profile Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-slate-800 text-white p-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-slate-600 flex items-center justify-center text-xl font-bold">
              {getInitials(displayUser.email)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1">Account Settings</h1>
              <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" strokeWidth={2} />
                {displayUser.email}
              </p>
              {displayUser.createdAt && (
                <p className="text-slate-500 font-mono text-xs mt-1 flex items-center gap-2">
                  <Calendar className="h-3 w-3" strokeWidth={2} />
                  Member since {formatDistanceToNow(new Date(displayUser.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="text-right">
              <div className="text-3xl font-bold">{switches.length}</div>
              <div className="text-slate-500 text-xs font-mono uppercase">Switches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Security Status
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" strokeWidth={2} />
                  <span className="font-bold text-sm text-emerald-700">Encryption</span>
                </div>
                <p className="text-xs text-emerald-600 font-mono">AES-256-GCM</p>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" strokeWidth={2} />
                  <span className="font-bold text-sm text-emerald-700">Distribution</span>
                </div>
                <p className="text-xs text-emerald-600 font-mono">10+ relays</p>
              </div>

              <div className={`p-4 ${activeSwitches > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'} border`}>
                <div className="flex items-center gap-2 mb-1">
                  {activeSwitches > 0 ? (
                    <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" strokeWidth={2} />
                  ) : (
                    <Circle className="h-3 w-3 text-slate-300" strokeWidth={2} />
                  )}
                  <span className={`font-bold text-sm ${activeSwitches > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    Active
                  </span>
                </div>
                <p className={`text-xs font-mono ${activeSwitches > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {activeSwitches > 0 ? `${activeSwitches} switch${activeSwitches !== 1 ? 'es' : ''}` : 'None'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Backup */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Key Management
            </h2>
          </div>
          <div className="p-4">
            <KeyBackup />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Change Email */}
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Email Address
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-500 font-mono mb-4">
              Current: {displayUser.email}
            </p>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="newemail@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                />
              </div>

              {profileError && (
                <div className="bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700 font-mono">{profileError}</p>
                </div>
              )}

              {profileSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-sm text-emerald-700 font-mono">{profileSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={profileLoading || !newEmail}
                className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors ${
                  profileLoading || !newEmail
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {profileLoading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" strokeWidth={2} />
              Password
            </h2>
          </div>
          <div className="p-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700 font-mono">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-sm text-emerald-700 font-mono">{passwordSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors ${
                  passwordLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowDeleteSection(!showDeleteSection)}
            className="text-xs text-slate-400 hover:text-red-500 font-mono transition-colors"
          >
            {showDeleteSection ? 'Hide' : 'Show'} danger zone
          </button>

          {showDeleteSection && (
            <div className="mt-4 bg-white border border-red-200">
              <div className="p-4 border-b border-red-100 bg-red-50">
                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                  <Octagon className="h-4 w-4" strokeWidth={2} />
                  Delete Account
                </h2>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-500 mb-4">
                  This will permanently delete your account and all switches. This action cannot be undone.
                </p>

                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white font-mono text-sm transition-colors"
                    />
                  </div>

                  {deleteError && (
                    <div className="bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-700 font-mono">{deleteError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 font-bold text-xs uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                    {deleteLoading ? 'Deleting...' : 'Delete Account Permanently'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
