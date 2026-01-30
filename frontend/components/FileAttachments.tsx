'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Paperclip,
  Upload,
  File,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  X,
  Lock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { showToast } from '@/components/ui/ToastContainer'

interface EncryptedFile {
  id: string
  name: string
  size: number
  type: string
  encryptedData: string // Base64 encoded encrypted content
  iv: string
  authTag: string
  uploadedAt: string
}

interface FileAttachmentsProps {
  files: EncryptedFile[]
  onFilesChange: (files: EncryptedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
  disabled?: boolean
  encryptionKey?: CryptoKey
}

const MAX_FILE_SIZE_MB = 10 // 10MB per file
const MAX_TOTAL_SIZE_MB = 50 // 50MB total

const FILE_ICONS: Record<string, React.ReactNode> = {
  'image': <Image className="h-5 w-5" />,
  'video': <FileVideo className="h-5 w-5" />,
  'audio': <FileAudio className="h-5 w-5" />,
  'application/pdf': <FileText className="h-5 w-5" />,
  'text': <FileText className="h-5 w-5" />,
  'default': <File className="h-5 w-5" />
}

function getFileIcon(type: string) {
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (type.startsWith(key) || type === key) {
      return icon
    }
  }
  return FILE_ICONS.default
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileAttachments({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = MAX_FILE_SIZE_MB,
  disabled = false,
  encryptionKey
}: FileAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSize = files.reduce((acc, f) => acc + f.size, 0)
  const totalSizeMB = totalSize / (1024 * 1024)

  // Generate encryption key if not provided
  const getOrCreateKey = async (): Promise<CryptoKey> => {
    if (encryptionKey) return encryptionKey

    // Generate a new key for file encryption
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  const encryptFile = async (file: File): Promise<EncryptedFile> => {
    const key = await getOrCreateKey()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Read file as ArrayBuffer
    const fileData = await file.arrayBuffer()

    // Encrypt
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileData
    )

    // Extract auth tag (last 16 bytes of encrypted data in WebCrypto)
    const encryptedArray = new Uint8Array(encryptedData)
    const authTag = encryptedArray.slice(-16)
    const ciphertext = encryptedArray.slice(0, -16)

    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      encryptedData: btoa(String.fromCharCode(...ciphertext)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
      uploadedAt: new Date().toISOString()
    }
  }

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesToProcess = Array.from(fileList)

    // Validate file count
    if (files.length + filesToProcess.length > maxFiles) {
      showToast(`Maximum ${maxFiles} files allowed`, 'warning')
      return
    }

    // Validate individual file sizes
    const invalidFiles = filesToProcess.filter(f => f.size > maxSizeMB * 1024 * 1024)
    if (invalidFiles.length > 0) {
      showToast(`Files must be under ${maxSizeMB}MB each`, 'warning')
      return
    }

    // Validate total size
    const newTotalSize = totalSize + filesToProcess.reduce((acc, f) => acc + f.size, 0)
    if (newTotalSize > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      showToast(`Total attachment size must be under ${MAX_TOTAL_SIZE_MB}MB`, 'warning')
      return
    }

    setUploading(true)
    const newFiles: EncryptedFile[] = []

    try {
      for (const file of filesToProcess) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
          }))
        }, 100)

        const encryptedFile = await encryptFile(file)

        clearInterval(progressInterval)
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))

        newFiles.push(encryptedFile)
      }

      onFilesChange([...files, ...newFiles])
      showToast(`${newFiles.length} file(s) encrypted and attached`, 'success')
    } catch (error) {
      console.error('File encryption error:', error)
      showToast('Failed to encrypt files', 'error')
    } finally {
      setUploading(false)
      setUploadProgress({})
    }
  }, [files, maxFiles, maxSizeMB, totalSize, onFilesChange, encryptionKey])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id))
    showToast('File removed', 'success')
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed p-6 text-center cursor-pointer transition-all
          ${isDragging ? 'border-orange bg-orange/10' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-orange" />
            <p className="font-bold text-sm">Encrypting files...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-bold text-sm mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              Max {maxSizeMB}MB per file, {MAX_TOTAL_SIZE_MB}MB total
            </p>
          </>
        )}
      </div>

      {/* Encryption Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="h-3 w-3" />
        <span>Files are encrypted client-side before upload</span>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Attached Files ({files.length})
            </p>
            <p className="text-xs font-mono text-gray-500">
              {formatFileSize(totalSize)} / {MAX_TOTAL_SIZE_MB}MB
            </p>
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 border border-gray-200 bg-gray-50"
            >
              <div className="text-gray-400">
                {getFileIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Encrypted
                  </span>
                </div>
              </div>
              {!disabled && (
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate">{name}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {totalSizeMB > MAX_TOTAL_SIZE_MB * 0.8 && (
        <div className="flex items-start gap-2 p-3 bg-orange/10 border border-orange">
          <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
          <p className="text-xs">
            You're approaching the {MAX_TOTAL_SIZE_MB}MB attachment limit.
            Consider reducing file sizes or removing some attachments.
          </p>
        </div>
      )}
    </div>
  )
}

// Export component for decrypting and downloading files
export function DecryptedFileDownload({
  file,
  decryptionKey
}: {
  file: EncryptedFile
  decryptionKey: CryptoKey
}) {
  const [decrypting, setDecrypting] = useState(false)

  const handleDownload = async () => {
    setDecrypting(true)
    try {
      // Decode base64 data
      const ciphertext = Uint8Array.from(atob(file.encryptedData), c => c.charCodeAt(0))
      const iv = Uint8Array.from(atob(file.iv), c => c.charCodeAt(0))
      const authTag = Uint8Array.from(atob(file.authTag), c => c.charCodeAt(0))

      // Reconstruct encrypted data with auth tag
      const encryptedData = new Uint8Array([...ciphertext, ...authTag])

      // Decrypt
      const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        decryptionKey,
        encryptedData
      )

      // Create blob and download
      const blob = new Blob([decryptedData], { type: file.type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('File downloaded', 'success')
    } catch (error) {
      console.error('Decryption error:', error)
      showToast('Failed to decrypt file', 'error')
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={decrypting}
      className="flex items-center gap-2 px-3 py-2 border-2 border-black hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      {decrypting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="text-sm font-bold">{file.name}</span>
      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
    </button>
  )
}
