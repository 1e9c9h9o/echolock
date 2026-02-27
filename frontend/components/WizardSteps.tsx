'use client'

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Info, Plus, Shield, Users, Lock, Bitcoin, Copy, Mail } from 'lucide-react'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Explainer from '@/components/ui/Explainer'
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
              This message{' '}
              <Explainer
                detail="Your message is encrypted on your device and split into pieces that get stored across multiple independent servers. No single place has your complete message."
                why="Even if someone hacks one server, they get nothing useful. Your message only comes together when it's time."
              >
                stays locked
              </Explainer>
              {' '}until you stop checking in. Only then will your recipients be able to read it.
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
  const [customValue, setCustomValue] = useState('1')
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours')

  const presets = [
    { label: '5 Min', value: '0.0833', description: '⚡ Testing only' },
    { label: '15 Min', value: '0.25', description: '⚡ Testing only' },
    { label: '1 Hour', value: '1', description: 'Quick test' },
    { label: '24 Hours', value: '24', description: 'Daily check-in' },
    { label: '3 Days', value: '72', description: 'Every 3 days' },
    { label: '1 Week', value: '168', description: 'Weekly check-in' },
  ]

  const handlePreset = (value: string) => {
    onCheckInHoursChange(value)
    setCustomMode(false)
  }

  const handleCustomChange = (value: string, unit: 'minutes' | 'hours' | 'days') => {
    setCustomValue(value)
    setCustomUnit(unit)

    const numValue = parseFloat(value) || 0
    let hours: number

    switch (unit) {
      case 'minutes':
        hours = numValue / 60
        break
      case 'days':
        hours = numValue * 24
        break
      default:
        hours = numValue
    }

    onCheckInHoursChange(hours.toString())
  }

  // Format the display of current selection
  const formatInterval = (hours: string) => {
    const h = parseFloat(hours) || 0
    if (h < 1) {
      const mins = Math.round(h * 60)
      return `${mins} minute${mins !== 1 ? 's' : ''}`
    } else if (h >= 24 && h % 24 === 0) {
      const days = h / 24
      return `${days} day${days !== 1 ? 's' : ''}`
    } else {
      return `${h} hour${h !== 1 ? 's' : ''}`
    }
  }

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">SET CHECK-IN INTERVAL</h2>
      <div className="space-y-6">
        <p className="font-mono text-base">
          How often do you need to{' '}
          <Explainer
            detail="A check-in is just a quick tap to let the system know you're still around. You can do it from your phone, computer, or even your watch."
            why="If you stop checking in, we assume something happened to you and your message gets delivered. That's the whole point."
          >
            check in
          </Explainer>
          {' '}to keep your switch active?
        </p>

        {/* Preset buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="mt-6 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={customValue}
                  onChange={(e) => handleCustomChange(e.target.value, customUnit)}
                  min="1"
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-bold uppercase tracking-wider mb-2">
                  Unit
                </label>
                <select
                  value={customUnit}
                  onChange={(e) => handleCustomChange(customValue, e.target.value as 'minutes' | 'hours' | 'days')}
                  className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="bg-cream p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>Selected:</strong> Check in every {formatInterval(checkInHours)}
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
            disabled={!checkInHours || parseFloat(checkInHours) < 0.0833 || parseFloat(checkInHours) > 2160}
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
      <h2 className="text-3xl font-bold mb-2">ENCRYPT YOUR MESSAGE</h2>
      <p className="font-mono text-sm text-gray-600 mb-8">
        This password encrypts your message on your device. No one else will ever see it.
      </p>
      <div className="space-y-6">
        <div className="bg-blue text-cream p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>This is YOUR password</strong> to{' '}
            <Explainer
              detail="Your message is encrypted with AES-256-GCM right here on your device using this password. The encrypted data is then split and distributed. Without this password, no one can manage your switch or see your message."
              why="We don't store your password anywhere. If you forget it, we can't help you recover it - that's what makes it secure."
            >
              lock your message on this device
            </Explainer>
            . Keep it private - don&apos;t share it with anyone.
          </p>
        </div>

        <div className="bg-cream p-3 border-2 border-black">
          <p className="font-mono text-xs text-gray-600">
            This is different from the recipient access key you&apos;ll set next.
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
              className="text-black/70 hover:text-orange transition-colors"
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
              className="text-black/70 hover:text-orange transition-colors"
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

interface WizardStepRecoveryPasswordProps {
  recoveryPassword: string
  confirmRecoveryPassword: string
  onRecoveryPasswordChange: (value: string) => void
  onConfirmRecoveryPasswordChange: (value: string) => void
  onNext: () => void
  onBack: () => void
}

export function StepRecoveryPassword({
  recoveryPassword,
  confirmRecoveryPassword,
  onRecoveryPasswordChange,
  onConfirmRecoveryPasswordChange,
  onNext,
  onBack,
}: WizardStepRecoveryPasswordProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent('EchoLock - Your Access Key')
    const body = encodeURIComponent(
      `I've set up an EchoLock dead man's switch and you're a recipient.\n\n` +
      `When the time comes, you'll receive a link to access my message. You'll need this access key to read it:\n\n` +
      `Access Key: ${recoveryPassword}\n\n` +
      `Keep this key safe and private. Do not share it with anyone else.\n\n` +
      `- Sent from EchoLock`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const passwordsMatch = recoveryPassword === confirmRecoveryPassword && recoveryPassword.length > 0
  const isValid = recoveryPassword.length >= 6 && passwordsMatch

  return (
    <Card>
      <h2 className="text-3xl font-bold mb-2">RECIPIENT ACCESS KEY</h2>
      <p className="font-mono text-sm text-gray-600 mb-8">
        Share this separately with your recipients so they can read your message.
      </p>
      <div className="space-y-6">
        <div className="bg-orange text-black p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>Share this key with your recipients!</strong> They&apos;ll need it to{' '}
            <Explainer
              detail="When your switch triggers, your recipients get a link. They enter this password and their browser decrypts the message right there. The password never goes to any server."
              why="This way, even if someone intercepts the email, they can't read your message without the password you gave in person."
            >
              unlock your message
            </Explainer>
            {' '}when the time comes. Give it to them{' '}
            <Explainer
              detail="In person is best. A phone call works too. Even a separate text message is okay. Just don't put the password in the same email as the recovery link."
              why="If someone gets access to their email, they'd have both the link AND the password. Keeping them separate adds a layer of protection."
            >
              in person or by phone
            </Explainer>
            .
          </p>
        </div>

        <div className="bg-cream p-4 border-2 border-black">
          <p className="font-mono text-sm">
            <strong>Tip:</strong> Use something memorable but not guessable. A random phrase works
            well, like &ldquo;purple-elephant-dancing-42&rdquo; or &ldquo;coffee-mountain-sunset&rdquo;.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold uppercase tracking-wider font-sans">
              Recipient Access Key
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-black/70 hover:text-orange transition-colors"
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
            value={recoveryPassword}
            onChange={(e) => onRecoveryPasswordChange(e.target.value)}
            placeholder="Enter an access key for your recipients"
            className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
          />
          <p className="mt-2 font-mono text-xs text-gray-600">
            Minimum 6 characters
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold uppercase tracking-wider font-sans">
              Confirm Access Key
            </label>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-black/70 hover:text-orange transition-colors"
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
            value={confirmRecoveryPassword}
            onChange={(e) => onConfirmRecoveryPasswordChange(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
          />
          {confirmRecoveryPassword.length > 0 && (
            <div className="mt-2">
              {passwordsMatch ? (
                <p className="text-green-700 font-mono text-sm">Passwords match</p>
              ) : (
                <p className="text-red-700 font-mono text-sm">Passwords don&apos;t match</p>
              )}
            </div>
          )}
        </div>

        {/* Share buttons - visible when key is long enough */}
        {recoveryPassword.length >= 6 && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-black bg-cream hover:bg-white transition-colors font-mono text-sm font-bold"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" strokeWidth={2} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" strokeWidth={2} />
                  Copy to Clipboard
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShareEmail}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-black bg-cream hover:bg-white transition-colors font-mono text-sm font-bold"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              Share via Email
            </button>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
            Back
          </Button>
          <Button variant="primary" onClick={onNext} disabled={!isValid}>
            Next Step
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
              className={`w-24 h-24 border-2 border-black flex items-center justify-center transition-all ${
                animationStep >= 0 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">1</span>
            </div>
            <div className="w-12 h-1 bg-black"></div>
            <div
              className={`w-24 h-24 border-2 border-black flex items-center justify-center transition-all ${
                animationStep >= 1 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">2</span>
            </div>
            <div className="w-12 h-1 bg-black"></div>
            <div
              className={`w-24 h-24 border-2 border-black flex items-center justify-center transition-all ${
                animationStep >= 2 ? 'bg-blue text-cream' : 'bg-cream'
              }`}
            >
              <span className="text-2xl font-bold">3</span>
            </div>
          </div>

          <div className="font-mono text-sm space-y-2">
            <p className={animationStep >= 0 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Securing your message
            </p>
            <p className={animationStep >= 1 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Setting up your switch
            </p>
            <p className={animationStep >= 2 ? 'text-blue font-bold' : 'text-gray-500'}>
              ✓ Almost done...
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
            <p>✓ Your message will be{' '}
              <Explainer
                detail="Your message is encrypted with AES-256, then split into pieces using a technique called Shamir's Secret Sharing. Each piece goes to a different place."
                why="If any single server goes down or gets hacked, your message stays safe. It takes multiple pieces to reconstruct it."
              >
                securely locked
              </Explainer>
            </p>
            <p>✓ You&apos;ll need to check in every {checkInHours} hours</p>
            <p>✓ If you miss a check-in,{' '}
              <Explainer
                detail="Independent guardians watch for your check-ins. When you stop, they each release their piece. Your recipients collect the pieces and unlock your message."
                why="This works even if EchoLock disappears. No single company controls whether your message gets delivered."
              >
                your message will be sent to recipients
              </Explainer>
            </p>
            <p>✓{' '}
              <Explainer
                detail="We never see your message or your encryption keys. Everything is encrypted on your device before it leaves. We literally can't read it."
                why="This is called end-to-end encryption. It means you don't have to trust us - the math protects you."
              >
                No one can read it until then - not even us
              </Explainer>
            </p>
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
              I understand that if I don&apos;t check in within {checkInHours} hours, my message
              will be sent to my recipients. Once sent, it can&apos;t be unsent.
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

      <h2 className="text-4xl font-bold mb-4">YOU&apos;RE ALL SET</h2>
      <p className="text-lg font-mono mb-8 max-w-2xl mx-auto">
        Your message is locked. Just remember to check in before the deadline.
      </p>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-cream p-6 border-2 border-black text-left">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-sm font-bold text-gray-600">
              <Explainer
                detail="This is your switch's unique identifier. You might need it for support or if you want to recover your switch on a different device."
                why="Each switch has its own ID so you can have multiple switches for different purposes or different recipients."
              >
                SWITCH ID
              </Explainer>
            </p>
            <button
              onClick={copyToClipboard}
              className="font-mono text-xs text-black/70 hover:text-orange transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-base break-all">{switchId}</p>
        </div>

        <div className="bg-blue text-cream p-6 border-2 border-black text-left">
          <p className="font-mono text-sm font-bold mb-3">
            <Explainer
              detail="This is your deadline. Check in any time before this to reset the timer. If you don't check in by this time, your message starts its journey to your recipients."
              why="The timer only matters if you miss it. As long as you check in, nothing happens. Your message stays locked."
            >
              FIRST CHECK-IN DUE
            </Explainer>
          </p>
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
            <strong>Don&apos;t forget to check in.</strong> Set a reminder on your phone or
            calendar so you don&apos;t miss it.
          </p>
        </div>

        <div className="bg-orange/20 p-6 border-2 border-orange text-left">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="font-mono text-sm">
                <strong>Set up emergency contacts</strong> — people who can remind you to check in
                before your switch triggers. They&apos;ll receive escalating alerts.
              </p>
              <a
                href="/dashboard/settings#emergency-contacts"
                className="inline-block mt-2 font-mono text-sm font-bold text-orange hover:text-orange/80 underline underline-offset-4 transition-colors"
              >
                Add Emergency Contacts in Settings
              </a>
            </div>
          </div>
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

/**
 * Security Options Step
 *
 * Presents threshold, guardians, and Bitcoin options with clear explanations.
 * Shows what each choice does without marketing language.
 */
interface WizardStepSecurityProps {
  threshold: 'simple' | 'balanced' | 'high'
  onThresholdChange: (value: 'simple' | 'balanced' | 'high') => void
  bitcoinEnabled: boolean
  onBitcoinChange: (enabled: boolean) => void
  onNext: () => void
  onBack: () => void
}

const THRESHOLD_OPTIONS = {
  simple: {
    label: '2 of 3',
    name: 'Simpler',
    pieces: 3,
    needed: 2,
    description: 'Your message is split into 3 pieces. Any 2 can unlock it.',
  },
  balanced: {
    label: '3 of 5',
    name: 'Balanced',
    pieces: 5,
    needed: 3,
    description: 'Your message is split into 5 pieces. Any 3 can unlock it.',
  },
  high: {
    label: '4 of 7',
    name: 'Stronger',
    pieces: 7,
    needed: 4,
    description: 'Your message is split into 7 pieces. Any 4 can unlock it.',
  },
}

export function StepSecurityOptions({
  threshold,
  onThresholdChange,
  bitcoinEnabled,
  onBitcoinChange,
  onNext,
  onBack,
}: WizardStepSecurityProps) {
  return (
    <Card>
      <h2 className="text-3xl font-bold mb-8">SECURITY OPTIONS</h2>
      <div className="space-y-8">

        {/* Threshold Selection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5" strokeWidth={2} />
            <h3 className="font-bold text-lg">
              <Explainer
                detail="Your encryption key is split into pieces using a technique called Shamir's Secret Sharing. No single piece reveals anything. Only when enough pieces come together can the message be unlocked."
                why="This protects against any single point of failure. Even if some guardians become unavailable, your message can still be recovered as long as enough pieces remain."
              >
                How Many Pieces?
              </Explainer>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(THRESHOLD_OPTIONS) as [keyof typeof THRESHOLD_OPTIONS, typeof THRESHOLD_OPTIONS.simple][]).map(([key, option]) => (
              <button
                key={key}
                onClick={() => onThresholdChange(key)}
                className={`p-5 border-2 border-black text-left transition-all ${
                  threshold === key
                    ? 'bg-blue text-cream shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]'
                    : 'bg-white hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-1 hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold">{option.label}</span>
                  {key === 'balanced' && (
                    <span className={`text-xs px-2 py-0.5 border ${threshold === key ? 'border-cream' : 'border-black'}`}>
                      Recommended
                    </span>
                  )}
                </div>
                <p className={`font-mono text-sm ${threshold === key ? 'text-cream/80' : 'text-gray-600'}`}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          {/* Visual representation */}
          <div className="mt-4 flex items-center justify-center gap-2 py-4 bg-cream border-2 border-black">
            {Array.from({ length: THRESHOLD_OPTIONS[threshold].pieces }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 border-black ${
                  i < THRESHOLD_OPTIONS[threshold].needed
                    ? 'bg-blue text-cream'
                    : 'bg-white text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            ))}
            <span className="ml-4 font-mono text-sm">
              {THRESHOLD_OPTIONS[threshold].needed} needed
            </span>
          </div>
        </div>

        {/* Guardians Info */}
        <div className="bg-cream p-5 border-2 border-black">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5" strokeWidth={2} />
            <h3 className="font-bold">
              <Explainer
                detail="Guardians are independent watchers who each hold one piece of your encryption key. They monitor whether you're checking in. When you stop, they release their pieces."
                why="Using multiple independent guardians means no single person or company controls your message. Even if EchoLock disappears, your guardians still function."
              >
                Guardians
              </Explainer>
            </h3>
          </div>
          <p className="font-mono text-sm text-gray-700">
            Your message pieces will be held by {THRESHOLD_OPTIONS[threshold].pieces} independent guardians.
            Currently using EchoLock&apos;s default guardian network.
          </p>
          <p className="font-mono text-xs text-gray-500 mt-2">
            Custom guardian selection coming soon.
          </p>
        </div>

        {/* Bitcoin Toggle */}
        <div className={`p-5 border-2 border-black transition-colors ${bitcoinEnabled ? 'bg-orange/10' : 'bg-white'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Bitcoin className={`h-6 w-6 mt-0.5 ${bitcoinEnabled ? 'text-orange' : 'text-gray-400'}`} strokeWidth={2} />
              <div>
                <h3 className="font-bold">
                  <Explainer
                    detail="A small Bitcoin transaction is created with a timelock matching your check-in deadline. This provides cryptographic proof of when your switch was set, recorded permanently on the blockchain."
                    why="The Bitcoin blockchain can't be edited or deleted. Your switch settings become independently verifiable by anyone, forever. No company can deny or alter when your switch was created."
                  >
                    Bitcoin Proof
                  </Explainer>
                </h3>
                <p className="font-mono text-sm text-gray-600 mt-1">
                  {bitcoinEnabled
                    ? 'Your switch timing will be permanently recorded on the Bitcoin blockchain.'
                    : 'Add blockchain proof — a permanent, public record that your timer was set. Recommended for sensitive financial or legal documents.'}
                </p>
                {bitcoinEnabled && (
                  <p className="font-mono text-xs text-orange mt-2">
                    Requires a small Bitcoin deposit (~$1-2) to activate.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onBitcoinChange(!bitcoinEnabled)}
              className={`w-14 h-8 rounded-full border-2 border-black transition-colors relative ${
                bitcoinEnabled ? 'bg-orange' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white border-2 border-black rounded-full transition-transform ${
                  bitcoinEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
            Back
          </Button>
          <Button variant="primary" onClick={onNext}>
            Next Step
            <ArrowRight className="h-5 w-5 ml-2" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
