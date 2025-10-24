'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import {
  Step1EnterSecret,
  Step2SetInterval,
  Step3SetPassword,
  Step4Confirmation,
  Step5Success,
} from '@/components/WizardSteps'
import { switchesAPI } from '@/lib/api'
import { showToast } from '@/components/ui/ToastContainer'

interface Recipient {
  email: string
  name: string
}

export default function CreateWizardPage() {
  const router = useRouter()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6 // 5 wizard steps + 1 recipients step

  // Form data
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [checkInHours, setCheckInHours] = useState('72')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: '', name: '' }])

  // Loading state
  const [loading, setLoading] = useState(false)
  const [createdSwitch, setCreatedSwitch] = useState<any>(null)

  // Recipient management
  const addRecipient = () => {
    setRecipients([...recipients, { email: '', name: '' }])
  }

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index))
    }
  }

  const updateRecipient = (index: number, field: 'email' | 'name', value: string) => {
    const updated = [...recipients]
    updated[index][field] = value
    setRecipients(updated)
  }

  // Navigation
  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Submit handler
  const handleSubmit = async () => {
    setLoading(true)

    try {
      const validRecipients = recipients.filter((r) => r.email.trim() && r.name.trim())

      if (validRecipients.length === 0) {
        showToast('Please add at least one recipient', 'error')
        setLoading(false)
        return
      }

      const response = await switchesAPI.create({
        title: title.trim() || `Switch created ${new Date().toLocaleDateString()}`,
        message: message.trim(),
        checkInHours: parseInt(checkInHours),
        password: password.trim(),
        recipients: validRecipients,
      })

      setCreatedSwitch(response)
      setCurrentStep(totalSteps) // Move to success step
      showToast('Switch created successfully!', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create switch', 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setTitle('')
    setMessage('')
    setCheckInHours('72')
    setPassword('')
    setConfirmPassword('')
    setRecipients([{ email: '', name: '' }])
    setCreatedSwitch(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-blue hover:text-red text-base font-mono font-bold mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
          Back to Dashboard
        </Link>
        <h1 className="text-5xl font-bold mb-3">CREATE SWITCH</h1>
        <p className="text-lg font-mono">Follow the steps to configure your dead man's switch</p>
      </div>

      {/* Progress indicator */}
      {currentStep < totalSteps && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-sm font-bold">
              STEP {currentStep} OF {totalSteps - 1}
            </span>
            <span className="font-mono text-sm text-gray-600">
              {Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-3 bg-cream border-2 border-black">
            <div
              className="h-full bg-blue transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>

          {/* Step labels */}
          <div className="flex justify-between mt-4 font-mono text-xs">
            <span className={currentStep >= 1 ? 'text-blue font-bold' : 'text-gray-500'}>
              Secret
            </span>
            <span className={currentStep >= 2 ? 'text-blue font-bold' : 'text-gray-500'}>
              Interval
            </span>
            <span className={currentStep >= 3 ? 'text-blue font-bold' : 'text-gray-500'}>
              Password
            </span>
            <span className={currentStep >= 4 ? 'text-blue font-bold' : 'text-gray-500'}>
              Title
            </span>
            <span className={currentStep >= 5 ? 'text-blue font-bold' : 'text-gray-500'}>
              Recipients
            </span>
          </div>
        </div>
      )}

      {/* Step 1: Enter Secret */}
      {currentStep === 1 && (
        <Step1EnterSecret message={message} onMessageChange={setMessage} onNext={nextStep} />
      )}

      {/* Step 2: Set Interval */}
      {currentStep === 2 && (
        <Step2SetInterval
          checkInHours={checkInHours}
          onCheckInHoursChange={setCheckInHours}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {/* Step 3: Set Password */}
      {currentStep === 3 && (
        <Step3SetPassword
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}

      {/* Step 4: Title (Optional) */}
      {currentStep === 4 && (
        <Card>
          <h2 className="text-3xl font-bold mb-8">NAME YOUR SWITCH (OPTIONAL)</h2>
          <div className="space-y-6">
            <Input
              label="Switch Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., My Personal Switch, Family Emergency Info"
              helperText="Give this switch a memorable name (optional - auto-generated if blank)"
            />

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={prevStep}>
                <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
                Back
              </Button>
              <Button variant="primary" onClick={nextStep}>
                Next Step
                <Plus className="h-5 w-5 ml-2" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 5: Recipients */}
      {currentStep === 5 && !loading && (
        <Card>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">ADD RECIPIENTS</h2>
            <Button type="button" variant="secondary" onClick={addRecipient}>
              <Plus className="h-5 w-5 mr-2" strokeWidth={2} />
              Add Recipient
            </Button>
          </div>

          <div className="space-y-6">
            {recipients.map((recipient, index) => (
              <div key={index} className="border-2 border-black p-6 relative bg-white">
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="absolute top-4 right-4 text-black hover:text-red transition-colors"
                  >
                    <X className="h-6 w-6" strokeWidth={2} />
                  </button>
                )}

                <div className="space-y-6 pr-12">
                  <Input
                    label="Name"
                    value={recipient.name}
                    onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={recipient.email}
                    onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={prevStep}>
                <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={2} />
                Back
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Create Switch
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 5: Loading state */}
      {currentStep === 5 && loading && (
        <Step4Confirmation
          message={message}
          checkInHours={checkInHours}
          recipientCount={recipients.filter((r) => r.email.trim() && r.name.trim()).length}
          onConfirm={handleSubmit}
          onBack={prevStep}
          loading={loading}
        />
      )}

      {/* Step 6: Success */}
      {currentStep === totalSteps && createdSwitch && (
        <Step5Success
          switchId={createdSwitch.id}
          nextCheckInAt={createdSwitch.nextCheckInAt}
          onDashboard={() => router.push('/dashboard')}
          onCreateAnother={resetForm}
        />
      )}
    </div>
  )
}
