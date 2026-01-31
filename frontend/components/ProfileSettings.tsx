'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { userAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ProfileSettings() {
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [about, setAbout] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userAPI.getProfile()
        setName(data.user.displayName || '')
        setAbout(data.user.bio || '')
        setAvatarUrl(data.user.avatarUrl || null)
      } catch (err) {
        if (user) {
          setName((user as any).displayName || '')
          setAbout((user as any).bio || '')
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

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Use JPEG, PNG, GIF, or WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)')
      return
    }

    setUploadingAvatar(true)
    setError('')

    try {
      const result = await userAPI.uploadAvatar(file)
      setAvatarUrl(result.avatarUrl)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed')
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      await userAPI.updateProfile({
        displayName: name || undefined,
        bio: about || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return ''
  }

  const getFullAvatarUrl = (url: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_URL}${url}`
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center">
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
          className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-xl font-medium text-slate-500 hover:bg-slate-300 transition-colors relative overflow-hidden group"
        >
          {avatarUrl ? (
            <img
              src={getFullAvatarUrl(avatarUrl) || ''}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials()
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
        </button>

        {avatarUrl && !uploadingAvatar && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="Your name"
          className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
        />
      </div>

      {/* About */}
      <div>
        <label className="block text-xs text-slate-500 mb-1.5">
          About
        </label>
        <input
          type="text"
          value={about}
          onChange={(e) => setAbout(e.target.value.slice(0, 140))}
          placeholder="A few words about yourself"
          className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          Visible to your message recipients
        </p>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}
