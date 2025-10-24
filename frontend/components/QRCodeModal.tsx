'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Download, Copy, QrCode } from 'lucide-react'
import QRCodeLib from 'qrcode'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { showToast } from '@/components/ui/ToastContainer'

interface QRCodeModalProps {
  switchId: string
  switchTitle: string
  onClose: () => void
}

export default function QRCodeModal({ switchId, switchTitle, onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const switchUrl = `${window.location.origin}/dashboard/switches/${switchId}`

  useEffect(() => {
    generateQRCode()
  }, [switchId])

  const generateQRCode = async () => {
    if (!canvasRef.current) return

    try {
      await QRCodeLib.toCanvas(canvasRef.current, switchUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#212121', // EchoLock black
          light: '#FDF9F0', // EchoLock cream
        },
      })

      // Also generate data URL for download
      const dataUrl = await QRCodeLib.toDataURL(switchUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: '#212121',
          light: '#FDF9F0',
        },
      })
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      showToast('Failed to generate QR code', 'error')
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `echolock-${switchId.substring(0, 8)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showToast('QR code downloaded', 'success')
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(switchUrl)
    showToast('Switch URL copied to clipboard', 'success')
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Card className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <QrCode className="h-8 w-8" strokeWidth={2} />
            <h2 className="text-2xl font-bold">QR CODE</h2>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:text-red transition-colors"
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Switch info */}
          <div className="bg-cream p-4 border-2 border-black">
            <p className="font-mono text-sm font-bold text-gray-600 mb-1">SWITCH</p>
            <p className="font-mono text-base">{switchTitle}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center bg-cream p-8 border-2 border-black">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>

          {/* URL */}
          <div>
            <p className="font-mono text-sm font-bold mb-2">SWITCH URL</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={switchUrl}
                readOnly
                className="flex-1 px-4 py-2 border-2 border-black bg-white focus:outline-none text-sm font-mono"
              />
              <button
                onClick={handleCopyUrl}
                className="px-4 py-2 bg-blue text-cream border-2 border-black font-mono font-bold hover:shadow-[2px_2px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                title="Copy URL"
              >
                <Copy className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue text-cream p-4 border-2 border-black">
            <p className="font-mono text-sm">
              📱 Scan this QR code with any smartphone to quickly access this switch's details.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="primary" onClick={handleDownload}>
              <Download className="h-5 w-5 mr-2" strokeWidth={2} />
              Download QR Code
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
      </div>
    </div>
  )
}

/**
 * QR Code button component
 */
export function QRCodeButton({ switchId, switchTitle }: { switchId: string; switchTitle: string }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 hover:bg-blue hover:bg-opacity-10 rounded transition-colors"
        title="Generate QR Code"
      >
        <QrCode className="h-5 w-5" strokeWidth={2} />
      </button>

      {showModal && (
        <QRCodeModal
          switchId={switchId}
          switchTitle={switchTitle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
