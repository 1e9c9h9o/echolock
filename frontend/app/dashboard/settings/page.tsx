'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Lock, Trash2, Shield, CheckCircle, Clock, Calendar, Key, Mail, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import KeyBackup from '@/components/KeyBackup'
import { useAuthStore, useSwitchStore } from '@/lib/store'
import { userAPI, switchesAPI } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

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
  const [currentPassword, setCurrentPassword] = useState('')
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
      setCurrentPassword('')
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-black/70 hover:text-orange text-base font-mono font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="!bg-black !text-white mb-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-orange flex items-center justify-center text-black text-2xl font-bold">
            {user?.email ? getInitials(user.email) : 'U'}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">Your Account</h1>
            <p className="text-white/70 font-mono text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" strokeWidth={2} />
              {user?.email}
            </p>
            {user?.createdAt && (
              <p className="text-white/50 font-mono text-xs mt-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" strokeWidth={2} />
                Member since {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="text-right">
            <div className="text-3xl font-bold text-orange">{switches.length}</div>
            <div className="text-white/50 text-xs font-mono uppercase">Switches</div>
          </div>
        </div>
      </Card>

      {/* Security Status */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green" strokeWidth={2} />
          Security Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border-2 border-green bg-green/5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green" strokeWidth={2} />
              <span className="font-bold text-sm">Encryption</span>
            </div>
            <p className="text-xs text-black/60 font-mono">AES-256-GCM active</p>
          </div>

          <div className="p-4 border-2 border-green bg-green/5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green" strokeWidth={2} />
              <span className="font-bold text-sm">Distribution</span>
            </div>
            <p className="text-xs text-black/60 font-mono">10+ Nostr relays</p>
          </div>

          <div className={`p-4 border-2 ${activeSwitches > 0 ? 'border-green bg-green/5' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              {activeSwitches > 0 ? (
                <CheckCircle className="h-4 w-4 text-green" strokeWidth={2} />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" strokeWidth={2} />
              )}
              <span className="font-bold text-sm">Active Switches</span>
            </div>
            <p className="text-xs text-black/60 font-mono">
              {activeSwitches > 0 ? `${activeSwitches} switch${activeSwitches !== 1 ? 'es' : ''} armed` : 'No active switches'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Backup */}
      <div className="mb-8">
        <KeyBackup />
      </div>

      {/* Account Settings */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <User className="h-5 w-5" strokeWidth={2} />
          Account Settings
        </h2>

        {/* Change Email */}
        <Card>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-black/60" strokeWidth={2} />
            Email Address
          </h3>
          <p className="text-sm text-black/60 font-mono mb-4">
            Current: {user?.email}
          </p>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <Input
              label="New Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="newemail@example.com"
            />

            {profileError && (
              <div className="bg-red/10 border border-red p-3 text-red text-sm font-mono">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="bg-green/10 border border-green p-3 text-green text-sm font-mono">
                {profileSuccess}
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              disabled={profileLoading || !newEmail}
            >
              {profileLoading ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
        </Card>

        {/* Change Password */}
        <Card>
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-black/60" strokeWidth={2} />
            Password
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Minimum 8 characters"
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            {passwordError && (
              <div className="bg-red/10 border border-red p-3 text-red text-sm font-mono">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green/10 border border-green p-3 text-green text-sm font-mono">
                {passwordSuccess}
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>

        {/* Danger Zone */}
        <div className="pt-8 border-t-2 border-gray-200">
          <button
            onClick={() => setShowDeleteSection(!showDeleteSection)}
            className="text-sm text-black/40 hover:text-red font-mono transition-colors"
          >
            {showDeleteSection ? 'Hide' : 'Show'} danger zone
          </button>

          {showDeleteSection && (
            <Card className="mt-4 !border-red/30 !bg-red/5">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-red">
                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                Delete Account
              </h3>
              <p className="text-sm text-black/60 mb-4">
                This will permanently delete your account and all your switches. This action cannot be undone.
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <Input
                  label="Confirm your password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                />

                {deleteError && (
                  <div className="bg-red/10 border border-red p-3 text-red text-sm font-mono">
                    {deleteError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={deleteLoading}
                  className="!border-red !text-red hover:!bg-red hover:!text-white"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account Permanently'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
