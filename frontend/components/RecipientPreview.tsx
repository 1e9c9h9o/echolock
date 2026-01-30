'use client'

import { useState } from 'react'
import {
  Eye,
  Mail,
  Key,
  Lock,
  Users,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  X,
  Smartphone,
  Monitor
} from 'lucide-react'
import Button from '@/components/ui/Button'

interface Recipient {
  email: string
  name?: string
}

interface RecipientPreviewProps {
  switchTitle: string
  recipients: Recipient[]
  checkInHours: number
  onClose?: () => void
}

type PreviewStep = 'email' | 'landing' | 'recovery' | 'success'
type DeviceView = 'desktop' | 'mobile'

export default function RecipientPreview({
  switchTitle,
  recipients,
  checkInHours,
  onClose
}: RecipientPreviewProps) {
  const [currentStep, setCurrentStep] = useState<PreviewStep>('email')
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop')
  const [selectedRecipient, setSelectedRecipient] = useState(recipients[0])

  const steps: { id: PreviewStep; label: string; icon: React.ReactNode }[] = [
    { id: 'email', label: 'Email Notification', icon: <Mail className="h-4 w-4" /> },
    { id: 'landing', label: 'Recovery Page', icon: <ExternalLink className="h-4 w-4" /> },
    { id: 'recovery', label: 'Key Entry', icon: <Key className="h-4 w-4" /> },
    { id: 'success', label: 'Message Revealed', icon: <CheckCircle className="h-4 w-4" /> },
  ]

  const recipientName = selectedRecipient?.name || selectedRecipient?.email?.split('@')[0] || 'Recipient'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-black w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-black text-white py-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <span className="text-[10px] uppercase tracking-widest font-bold">
              Recipient Preview Mode
            </span>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue/10 border-b-2 border-black px-5 py-3">
          <p className="text-sm">
            <strong>Preview what "{selectedRecipient?.name || selectedRecipient?.email}" will see</strong> when your switch triggers.
            This is exactly what they'll experience during the recovery process.
          </p>
        </div>

        {/* Step Navigation */}
        <div className="flex border-b-2 border-black">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                currentStep === step.id
                  ? 'bg-orange text-black'
                  : 'hover:bg-gray-100'
              }`}
            >
              {step.icon}
              <span className="hidden sm:inline">{step.label}</span>
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-2 hidden sm:block opacity-30" />
              )}
            </button>
          ))}
        </div>

        {/* Device Toggle */}
        <div className="flex justify-end gap-2 px-5 py-2 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setDeviceView('desktop')}
            className={`p-2 border-2 transition-colors ${
              deviceView === 'desktop' ? 'border-black bg-black text-white' : 'border-gray-300'
            }`}
            title="Desktop view"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeviceView('mobile')}
            className={`p-2 border-2 transition-colors ${
              deviceView === 'mobile' ? 'border-black bg-black text-white' : 'border-gray-300'
            }`}
            title="Mobile view"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className={`mx-auto ${deviceView === 'mobile' ? 'max-w-sm' : 'max-w-2xl'}`}>
            {/* Email Preview */}
            {currentStep === 'email' && (
              <div className="bg-white border-2 border-black shadow-lg">
                <div className="bg-gray-100 border-b-2 border-black p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">EchoLock</p>
                      <p className="text-xs text-gray-500">notifications@echolock.app</p>
                    </div>
                  </div>
                  <p className="font-bold">A message has been released for you</p>
                  <p className="text-xs text-gray-500 mt-1">To: {selectedRecipient?.email}</p>
                </div>
                <div className="p-6">
                  <p className="mb-4">Dear {recipientName},</p>
                  <p className="mb-4">
                    A secure message from <strong>"{switchTitle}"</strong> has been released and is now available for you to access.
                  </p>
                  <div className="bg-orange/10 border-2 border-orange p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-1">Important</p>
                        <p className="text-sm">
                          This message was set up as a dead man's switch. The sender has not checked in
                          within {checkInHours} hours, triggering this automatic release.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mb-4">To access your message:</p>
                  <ol className="list-decimal list-inside mb-6 space-y-2 text-sm">
                    <li>Click the secure link below</li>
                    <li>Enter the recovery passphrase (shared with you separately)</li>
                    <li>View and download your message</li>
                  </ol>
                  <div className="text-center mb-6">
                    <button
                      onClick={() => setCurrentStep('landing')}
                      className="inline-flex items-center gap-2 bg-orange text-black px-6 py-3 font-bold border-2 border-black hover:bg-orange/80 transition-colors"
                    >
                      ACCESS YOUR MESSAGE
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    This link will remain active for 30 days. If you have any issues,
                    visit echolock.app/recover for assistance.
                  </p>
                </div>
              </div>
            )}

            {/* Landing Page Preview */}
            {currentStep === 'landing' && (
              <div className="bg-white border-2 border-black shadow-lg">
                <div className="bg-black text-white py-4 px-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-orange rounded-full flex items-center justify-center">
                    <Lock className="h-6 w-6 text-black" />
                  </div>
                  <h2 className="font-bold text-lg">Secure Message Recovery</h2>
                  <p className="text-xs opacity-70 mt-1">echolock.app/recover/abc123</p>
                </div>
                <div className="p-6">
                  <div className="bg-green-50 border-2 border-green-600 p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-green-800 mb-1">Message Available</p>
                        <p className="text-sm text-green-700">
                          A message has been released for you from "{switchTitle}".
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="font-bold mb-2">Recovery Status</h3>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Guardian shares collected</span>
                          <span className="font-mono font-bold">3 of 5</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
                        </div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-center mb-4">
                    To decrypt and view the message, enter the passphrase that was shared with you.
                  </p>
                  <button
                    onClick={() => setCurrentStep('recovery')}
                    className="w-full bg-orange text-black py-3 font-bold border-2 border-black hover:bg-orange/80 transition-colors"
                  >
                    ENTER PASSPHRASE
                  </button>
                </div>
              </div>
            )}

            {/* Recovery/Key Entry Preview */}
            {currentStep === 'recovery' && (
              <div className="bg-white border-2 border-black shadow-lg">
                <div className="bg-black text-white py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    <h2 className="font-bold">Enter Recovery Passphrase</h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm mb-4">
                    Enter the passphrase that was shared with you to decrypt the message.
                  </p>
                  <div className="mb-4">
                    <label className="block text-xs font-bold uppercase tracking-wide mb-2">
                      Passphrase
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your passphrase"
                      className="w-full px-4 py-3 border-2 border-black font-mono"
                      value="••••••••••••"
                      readOnly
                    />
                  </div>
                  <div className="bg-blue/10 border-2 border-blue p-4 mb-6">
                    <p className="text-sm">
                      <strong>Hint:</strong> The passphrase was shared with you separately by the sender.
                      It may have been given to you in person, by letter, or through a secure channel.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentStep('success')}
                    className="w-full bg-orange text-black py-3 font-bold border-2 border-black hover:bg-orange/80 transition-colors"
                  >
                    DECRYPT MESSAGE
                  </button>
                </div>
              </div>
            )}

            {/* Success/Message Revealed Preview */}
            {currentStep === 'success' && (
              <div className="bg-white border-2 border-black shadow-lg">
                <div className="bg-green-600 text-white py-4 px-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <h2 className="font-bold">Message Decrypted Successfully</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{switchTitle}</h3>
                      <span className="text-xs font-mono text-gray-500">Released just now</span>
                    </div>
                    <div className="bg-gray-50 border-2 border-gray-200 p-4 font-mono text-sm">
                      <p className="text-gray-400 italic">
                        [Your actual message content would appear here]
                      </p>
                      <p className="mt-4 text-gray-400 italic">
                        This is a preview. The recipient will see the full decrypted message
                        you wrote when creating the switch.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black hover:bg-gray-100 transition-colors font-bold">
                      <Copy className="h-4 w-4" />
                      COPY
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black hover:bg-gray-100 transition-colors font-bold">
                      <Download className="h-4 w-4" />
                      DOWNLOAD
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-4 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-bold">Viewing as:</span>
            <select
              value={selectedRecipient?.email}
              onChange={(e) => {
                const r = recipients.find(r => r.email === e.target.value)
                if (r) setSelectedRecipient(r)
              }}
              className="border-2 border-black px-2 py-1 text-sm font-mono"
            >
              {recipients.map((r) => (
                <option key={r.email} value={r.email}>
                  {r.name || r.email}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  )
}
