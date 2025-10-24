'use client';

import React, { useState, useEffect } from 'react';
import { X, Rocket, Shield, Clock, Zap, CheckCircle2 } from 'lucide-react';
import Button from './ui/Button';

const WELCOME_MODAL_KEY = 'echolock_welcome_modal_seen';

interface WelcomeModalProps {
  onStartTour?: () => void;
  onClose?: () => void;
}

export default function WelcomeModal({ onStartTour, onClose }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenModal = localStorage.getItem(WELCOME_MODAL_KEY);
    if (!hasSeenModal) {
      // Show modal after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    setIsOpen(false);
    onClose?.();
  };

  const handleStartTour = () => {
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    setIsOpen(false);
    onStartTour?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="bg-cream border-4 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
        {/* Header */}
        <div className="bg-blue text-cream p-6 border-b-4 border-black relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded transition-colors"
            aria-label="Close welcome modal"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center border-2 border-black">
              <Rocket className="w-8 h-8 text-blue" aria-hidden="true" />
            </div>
            <div>
              <h2 id="welcome-modal-title" className="text-3xl font-bold font-heading uppercase">
                Welcome to EchoLock!
              </h2>
              <p className="text-sm opacity-90 font-mono">Your censorship-resistant dead man's switch</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="font-mono text-lg">
            EchoLock helps you protect sensitive information by automatically releasing encrypted
            messages if you fail to check in regularly.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Censorship-Resistant"
              description="Uses Nostr protocol to store encrypted fragments across decentralized relays"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Automatic Release"
              description="Messages are released to recipients if you miss your check-in deadline"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Easy Check-ins"
              description="Simple one-click check-ins to reset your timer and keep messages secure"
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="Email Reminders"
              description="Receive notifications before your switches expire to prevent accidental releases"
            />
          </div>

          <div className="bg-red/10 border-2 border-red p-4 rounded">
            <p className="font-bold font-heading uppercase text-red mb-2">⚠️ Important</p>
            <ul className="font-mono text-sm space-y-1 list-disc list-inside">
              <li>Check in regularly to prevent accidental message releases</li>
              <li>Test with non-sensitive data first to understand how it works</li>
              <li>Store your recovery keys safely - they cannot be recovered</li>
              <li>Recipients will receive messages automatically if you don't check in</li>
            </ul>
          </div>

          <div className="bg-blue/10 border-2 border-blue p-4 rounded">
            <p className="font-bold font-heading uppercase text-blue mb-2">💡 Getting Started</p>
            <ol className="font-mono text-sm space-y-2 list-decimal list-inside">
              <li>Take the interactive tour to learn the interface</li>
              <li>Create your first dead man's switch</li>
              <li>Add recipients who will receive your message</li>
              <li>Set a check-in interval that works for you</li>
              <li>Verify your email to enable all features</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-black bg-cream-dark flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose}>
            Skip Tour
          </Button>
          <Button variant="primary" onClick={handleStartTour}>
            <Rocket className="w-4 h-4 mr-2" aria-hidden="true" />
            Start Interactive Tour
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white border-2 border-black p-4 hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue text-cream rounded flex items-center justify-center flex-shrink-0 border-2 border-black">
          {icon}
        </div>
        <div>
          <h3 className="font-bold font-heading uppercase text-sm mb-1">{title}</h3>
          <p className="font-mono text-xs text-gray-700">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to control welcome modal
 */
export function useWelcomeModal() {
  const [hasSeenModal, setHasSeenModal] = useState<boolean | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_MODAL_KEY) === 'true';
    setHasSeenModal(seen);
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    setHasSeenModal(true);
  };

  const resetModal = () => {
    localStorage.removeItem(WELCOME_MODAL_KEY);
    setHasSeenModal(false);
  };

  return {
    hasSeenModal,
    markAsSeen,
    resetModal,
  };
}
