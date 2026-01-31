'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, User, X, Loader2 } from 'lucide-react'
import { userAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userAPI.getProfile()
        setDisplayName(data.user.displayName || '')
        setBio(data.user.bio || '')
        setAvatarUrl(data.user.avatarUrl || null)
      } catch (err) {
        // Use existing user data if available
        if (user) {
          setDisplayName((user as any).displayName || '')
          setBio((user as any).bio || '')
          setAvatarUrl((user as any).avatarUrl || null)
        }
      }
    }
    loadProfile()
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    setUploadingAvatar(true)
    setError('')

    try {
      const result = await userAPI.uploadAvatar(file)
      setAvatarUrl(result.avatarUrl)
      setSuccess('Avatar updated')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    setError('')

    try {
      await userAPI.removeAvatar()
      setAvatarUrl(null)
      setSuccess('Avatar removed')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await userAPI.updateProfile({
        displayName: displayName || undefined,
        bio: bio || undefined,
      })
      setSuccess('Profile updated')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getFullAvatarUrl = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_URL}${url}`
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="w-24 h-24 bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 hover:bg-slate-300 transition-colors relative overflow-hidden group"
          >
            {avatarUrl ? (
              <img
                src={getFullAvatarUrl(avatarUrl) || ''}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials()
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>

          {/* Remove avatar button */}
          {avatarUrl && !uploadingAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">Profile Photo</h3>
          <p className="text-xs text-slate-500 mb-2">
            Click to upload. JPEG, PNG, GIF, or WebP. Max 5MB.
          </p>
          <p className="text-xs text-slate-400">
            Your photo helps recipients recognize messages from you.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be identified"
            maxLength={100}
            className="w-full border border-slate-300 px-4 py-3 font-mono text-sm focus:outline-none focus:border-slate-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            {displayName.length}/100 characters
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            About
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A brief note about yourself, or context for your recipients"
            maxLength={500}
            rows={3}
            className="w-full border border-slate-300 px-4 py-3 font-mono text-sm focus:outline-none focus:border-slate-500 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            {bio.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-slate-800 text-white text-sm font-bold uppercase tracking-wider hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
