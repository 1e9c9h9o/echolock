'use client'

import { useState } from 'react'
import { ArrowLeft, User, Lock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import KeyBackup from '@/components/KeyBackup'
import { useAuthStore } from '@/lib/store'
import { userAPI } from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

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

  return (
    <div>
      {/* Header */}
      <div className="mb-grid-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-text-secondary hover:text-secondary text-sm mb-grid-3"
        >
          <ArrowLeft className="h-4 w-4 mr-grid" strokeWidth={1.5} />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-secondary mb-grid-2">Settings</h1>
        <p className="text-text-secondary">Manage your account settings</p>
      </div>

      <div className="space-y-grid-6 max-w-2xl">
        {/* Key Management - Critical for client-side encryption */}
        <KeyBackup />

        {/* Account information */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <User className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Account information
          </h2>
          <div className="space-y-grid-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-grid">
                Current email
              </label>
              <p className="text-secondary mb-grid-2">{user?.email}</p>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-grid-4">
              <Input
                label="New email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newemail@example.com"
              />

              {profileError && (
                <div className="bg-accent bg-opacity-10 border border-accent p-grid-2 text-accent text-sm">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="bg-success bg-opacity-10 border border-success p-grid-2 text-success text-sm">
                  {profileSuccess}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={profileLoading || !newEmail}
              >
                {profileLoading ? 'Updating...' : 'Update email'}
              </Button>
            </form>
          </div>
        </Card>

        {/* Change password */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <Lock className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Change password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-grid-4">
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Minimum 8 characters"
              required
            />

            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {passwordError && (
              <div className="bg-accent bg-opacity-10 border border-accent p-grid-2 text-accent text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-success bg-opacity-10 border border-success p-grid-2 text-success text-sm">
                {passwordSuccess}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </Card>

        {/* Delete account */}
        <Card className="border-accent">
          <h2 className="text-xl font-bold text-accent mb-grid-4">
            <Trash2 className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Delete account
          </h2>
          <p className="text-text-secondary mb-grid-4">
            Once you delete your account, there is no going back. All your switches and data will be permanently deleted.
          </p>

          <form onSubmit={handleDeleteAccount} className="space-y-grid-4">
            <Input
              label="Confirm your password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {deleteError && (
              <div className="bg-accent bg-opacity-10 border border-accent p-grid-2 text-accent text-sm">
                {deleteError}
              </div>
            )}

            <Button
              type="submit"
              variant="secondary"
              disabled={deleteLoading}
              className="border-accent text-accent hover:bg-accent hover:text-white"
            >
              {deleteLoading ? 'Deleting...' : 'Delete account permanently'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
