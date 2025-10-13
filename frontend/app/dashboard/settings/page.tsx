'use client'

import { useState } from 'react'
import { ArrowLeft, User, Lock } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { useAuthStore } from '@/lib/store'
import { userAPI } from '@/lib/api'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await userAPI.updateProfile({ password: newPassword })
      setSuccess('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password')
    } finally {
      setLoading(false)
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
        {/* Account information */}
        <Card>
          <h2 className="text-xl font-bold text-secondary mb-grid-4">
            <User className="h-5 w-5 inline mr-grid-2" strokeWidth={1.5} />
            Account information
          </h2>
          <div className="space-y-grid-3">
            <div>
              <label className="block text-sm font-medium text-secondary mb-grid">
                Email
              </label>
              <p className="text-secondary">{user?.email}</p>
            </div>
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

            {error && (
              <div className="bg-accent bg-opacity-10 border border-accent p-grid-2 text-accent text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-success bg-opacity-10 border border-success p-grid-2 text-success text-sm">
                {success}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
