'use client'

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Info, Plus } from 'lucide-react'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import LoadingMessage from '@/components/LoadingMessage'

interface WizardStep1Props {
  message: string
  onMessageChange: (value: string) => void
  onNext: () => void
}

export function Step1EnterSecret({ message, onMessageChange, onNext }: WizardStep1Props) {
  const charCount = message.length
  const minChars = 10
  const maxChars = 5000

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">ENTER SECRET MESSAGE</h2>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold uppercase tracking-wider font-sans">
              Your Secret Message
            </label>
            <span className="font-mono text-sm text-gray-600">
              {charCount} / {maxChars}
            </span>
          </div>
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Enter the message that will be released if you don't check in..."
            rows={10}
            className="w-full px-4 py-4 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
            maxLength={maxChars}
          />
          <div className="mt-3 flex items-start bg-blue text-cream p-4 border-2 border-black">
            <Info className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-sm font-mono">
              This message will be encrypted and split into fragments distributed across secure
              relays. It will only be released if you fail to check in.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="primary"
            onClick={onNext}
            disabled={charCount < minChars || charCount > maxChars}
          >
            Next Step
            <ArrowRight className="h-5 w-5 ml-2" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface WizardStep2Props {
  checkInHours: string
  onCheckInHoursChange: (value: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step2SetInterval({ checkInHours, onCheckInHoursChange, onNext, onBack }: WizardStep2Props) {
  const [customMode, setCustomMode] = useState(false)

  const presets = [
    { label: '24 Hours', value: '24', description: 'Daily check-in' },
    { label: '72 Hours', value: '72', description: '3 days' },
    { label: '168 Hours', value: '168', description: '1 week' },
  ]

  const handlePreset = (value: string) => {
    onCheckInHoursChange(value)
    setCustomMode(false)
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">SET CHECK-IN INTERVAL</h2>
      <div className="space-y-6">
        <p className="font-mono text-base">
          How often do you need to check in to keep your switch armed?
        </p>

        {/* Preset buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePreset(preset.value)}
              className={`p-6 border-2 border-black text-left transition-all ${
                checkInHours === preset.value && !customMode
                  ? 'bg-blue text-cream shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]'
                  : 'bg-white hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-1 hover:-translate-y-1'
              }`}
            >
              <div className="text-2xl font-bold mb-2">{preset.label}</div>
              <div className="font-mono text-sm">{preset.description}</div>
            </button>
          ))}
        </div>

        {/* Custom option */}
        <div className="pt-4">
          <button
            onClick={() => setCustomMode(true)}
            className={`w-full p-6 border-2 border-black text-left transition-all ${
              customMode
                ? 'bg-blue text-cream shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]'
                : 'bg-white hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-1 hover:-translate-y-1'
            }`}
          >
            <div className="text-xl font-bold mb-2">Custom Interval</div>
            <div className="font-mono text-sm">Choose your own check-in frequency</div>
          </button>

          {customMode && (
            <div className="mt-6">
              <Input
                label="Custom Interval (Hours)"
                type="number"
                value={checkInHours}
                onChange={(e) => onCheckInHoursChange(e.target.value)}
                min="6"
                max="2160"
                helperText="Minimum: 6 hours, Maximum: 90 days (2160 hours)"
                required
              />
            </div>
          )}
        </div>

        <div className="bg-cream p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>Selected:</strong> You must check in at least once every {checkInHours} hours
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!checkInHours || parseInt(checkInHours) < 6 || parseInt(checkInHours) > 2160}
          >
            Next Step
            <ArrowRight className="h-5 w-5 ml-2" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface WizardStep3Props {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step3SetPassword({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onNext,
  onBack,
}: WizardStep3Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (pwd.length === 0) return { score: 0, label: '', color: '' }

    let score = 0
    if (pwd.length >= 12) score++
    if (pwd.length >= 16) score++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[^a-zA-Z0-9]/.test(pwd)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
    if (score <= 3) return { score, label: 'Medium', color: 'bg-yellow-500' }
    return { score, label: 'Strong', color: 'bg-green-500' }
  }

  const strength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  const requirements = [
    { met: password.length >= 12, text: 'Minimum 12 characters' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), text: 'Mix of uppercase and lowercase' },
    { met: /\d/.test(password), text: 'At least one number' },
    { met: /[^a-zA-Z0-9]/.test(password), text: 'Special characters (recommended)' },
  ]

  const isValid = requirements.slice(0, 3).every((r) => r.met) && passwordsMatch

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">SET ENCRYPTION PASSWORD</h2>
      <div className="space-y-6">
        <div className="bg-blue text-cream p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>Important:</strong> This password will be required to decrypt your secret if
            it's released. Store it securely!
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold uppercase tracking-wider font-sans">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-blue hover:text-red transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
          />

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm">Strength:</span>
                <span className={`font-mono text-sm font-bold`}>{strength.label}</span>
              </div>
              <div className="w-full h-2 bg-cream border-2 border-black">
                <div
                  className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold uppercase tracking-wider font-sans">
              Confirm Password
            </label>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-blue hover:text-red transition-colors"
            >
              {showConfirm ? (
                <EyeOff className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
          </div>
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
          />
          {confirmPassword.length > 0 && (
            <div className="mt-2">
              {passwordsMatch ? (
                <p className="text-green-700 font-mono text-sm">✓ Passwords match</p>
              ) : (
                <p className="text-red-700 font-mono text-sm">✗ Passwords don't match</p>
              )}
            </div>
          )}
        </div>

        {/* Requirements checklist */}
        <div className="bg-cream p-4 border-2 border-black">
          <p className="font-mono text-sm font-bold mb-3">Password Requirements:</p>
          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center font-mono text-sm">
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                  {req.met ? '✓' : '○'}
                </span>
                <span className="ml-2">{req.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
            Back
          </Button>
          <Button variant="primary" onClick={onNext} disabled={!isValid}>
            Review & Confirm
            <ArrowRight className="h-5 w-5 ml-2" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface WizardStep4Props {
  message: string
  checkInHours: string
  recipientCount: number
  onConfirm: () => void
  onBack: () => void
  loading: boolean
}

export function Step4Confirmation({
  message,
  checkInHours,
  recipientCount,
  onConfirm,
  onBack,
  loading,
}: WizardStep4Props) {
  const [agreed, setAgreed] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)

  // Simulate encryption animation
  useState(() => {
    if (loading) {
      const steps = [0, 1, 2, 3]
      let currentStep = 0
      const interval = setInterval(() => {
        currentStep = (currentStep + 1) % steps.length
        setAnimationStep(currentStep)
      }, 800)
      return () => clearInterval(interval)
    }
  })

  if (loading) {
    return (
      <Card className="text-center py-16">
        <LoadingMessage className="mb-8" />

        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex justify-center items-center gap-4">
            <div
              className={`w-24 h-24 border-4 border-black flex items-center justify-center transition-all ${
                animationStep >= 0 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">1</span>
            </div>
            <div className="w-12 h-1 bg-black"></div>
            <div
              className={`w-24 h-24 border-4 border-black flex items-center justify-center transition-all ${
                animationStep >= 1 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">2</span>
            </div>
            <div className="w-12 h-1 bg-black"></div>
            <div
              className={`w-24 h-24 border-4 border-black flex items-center justify-center transition-all ${
                animationStep >= 2 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">3</span>
            </div>
          </div>

          <div className="font-mono text-sm space-y-2">
            <p className={animationStep >= 0 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Encrypting your message with AES-256
            </p>
            <p className={animationStep >= 1 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Splitting encrypted data into fragments
            </p>
            <p className={animationStep >= 2 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Distributing fragments to secure relays
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">REVIEW & CONFIRM</h2>
      <div className="space-y-6">
        <div className="bg-cream p-6 border-2 border-black space-y-4">
          <div>
            <p className="font-mono text-sm font-bold text-gray-600">SECRET MESSAGE</p>
            <p className="font-mono text-base mt-1">
              {message.substring(0, 100)}
              {message.length > 100 ? '...' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-sm font-bold text-gray-600">CHECK-IN INTERVAL</p>
              <p className="font-mono text-base mt-1">{checkInHours} hours</p>
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-gray-600">RECIPIENTS</p>
              <p className="font-mono text-base mt-1">{recipientCount} recipient(s)</p>
            </div>
          </div>
        </div>

        <div className="bg-blue text-cream p-6 border-2 border-black">
          <p className="font-mono text-sm font-bold mb-4">WHAT HAPPENS NEXT:</p>
          <div className="space-y-2 font-mono text-sm">
            <p>✓ Your message will be encrypted with military-grade encryption</p>
            <p>✓ Encrypted data split into 3 fragments (2-of-3 threshold scheme)</p>
            <p>✓ Fragments distributed across independent Nostr relays</p>
            <p>✓ You'll need to check in every {checkInHours} hours</p>
            <p>✓ If you miss a check-in, the secret will be released to recipients</p>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-black">
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 border-2 border-black mt-0.5 mr-3 flex-shrink-0"
            />
            <span className="font-mono text-sm">
              I understand that this switch will automatically trigger and release my secret if I
              don't check in within {checkInHours} hours. This action cannot be undone once
              triggered.
            </span>
          </label>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
            Back
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={!agreed}>
            <Check className="h-5 w-5 mr-2" strokeWidth={2} />
            Create Switch
          </Button>
        </div>
      </div>
    </Card>
  )
}

interface WizardStep5Props {
  switchId: string
  nextCheckInAt: string
  onDashboard: () => void
  onCreateAnother: () => void
}

export function Step5Success({ switchId, nextCheckInAt, onDashboard, onCreateAnother }: WizardStep5Props) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(switchId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="text-center py-12">
      {/* Success animation */}
      <div className="w-32 h-32 bg-green-600 mx-auto mb-8 flex items-center justify-center border-2 border-black animate-pulse-glow">
        <Check className="h-20 w-20 text-white" strokeWidth={3} />
      </div>

      <h2 className="text-4xl font-bold mb-4">SWITCH CREATED!</h2>
      <p className="text-lg font-mono mb-8 max-w-2xl mx-auto">
        Your dead man's switch is now active and monitoring for check-ins.
      </p>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-cream p-6 border-2 border-black text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-sm font-bold text-gray-600">SWITCH ID</p>
            <button
              onClick={copyToClipboard}
              className="font-mono text-xs text-blue hover:text-red transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-base break-all">{switchId}</p>
        </div>

        <div className="bg-blue text-cream p-6 border-2 border-black text-left">
          <p className="font-mono text-sm font-bold mb-3">FIRST CHECK-IN DUE</p>
          <p className="font-mono text-lg">
            {new Date(nextCheckInAt).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="bg-yellow-100 p-6 border-2 border-black text-left">
          <p className="font-mono text-sm">
            <strong>⚠️ Important:</strong> Don't forget to check in before the deadline! You can
            set up reminders in your calendar or phone.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-12">
        <Button variant="primary" onClick={onDashboard}>
          Go to Dashboard
        </Button>
        <Button variant="secondary" onClick={onCreateAnother}>
          <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
          Create Another
        </Button>
      </div>
    </Card>
  )
}
