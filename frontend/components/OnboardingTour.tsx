'use client';

import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useAuthStore } from '@/lib/store';

const ONBOARDING_STORAGE_KEY = 'echolock_onboarding_completed';

const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div className="p-2">
        <h2 className="text-2xl font-bold font-heading uppercase mb-3">Welcome to EchoLock</h2>
        <p className="mb-3 font-mono text-sm">
          EchoLock lets you write a message that delivers itself.
        </p>
        <p className="mb-2 font-mono text-sm">
          You check in regularly. If you stop, your message releases automatically.
          No one — including EchoLock — can read it until then.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">How It Works</h3>
        <p className="font-mono text-sm mb-2">
          Your message is encrypted on your device. The encryption key is split into
          pieces held by independent guardians.
        </p>
        <p className="font-mono text-sm">
          When your check-ins stop, guardians release the pieces. Your recipients
          collect them and unlock your message.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="create-switch-button"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Create a Switch</h3>
        <p className="font-mono text-sm">
          Start here. You&apos;ll write your message, choose how often to check in,
          and add your recipients.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="switches-list"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Your Switches</h3>
        <p className="font-mono text-sm">
          Your switches appear here. Each shows how much time before your next check-in.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="check-in-button"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Check In</h3>
        <p className="font-mono text-sm">
          This is the most important button. Click it regularly to keep your message locked.
          Miss a check-in, and the countdown begins.
        </p>
      </div>
    ),
    placement: 'left',
    spotlightClicks: false,
  },
  {
    target: '[data-tour="profile-menu"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Settings</h3>
        <p className="font-mono text-sm">
          Manage your profile, emergency contacts, and security options here.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div className="p-2">
        <h2 className="text-2xl font-bold font-heading uppercase mb-3">You&apos;re Ready</h2>
        <div className="bg-blue-light border border-black/20 p-3 mt-2">
          <p className="font-mono text-sm font-bold mb-2">Recommendations:</p>
          <ul className="list-disc list-inside font-mono text-sm space-y-1 text-black/70">
            <li>Start with a test message to get comfortable</li>
            <li>Set realistic check-in intervals</li>
            <li>Add multiple recipients for redundancy</li>
            <li>Don&apos;t use for sensitive data until you&apos;re comfortable</li>
          </ul>
        </div>
      </div>
    ),
    placement: 'center',
  },
];

interface OnboardingTourProps {
  autoStart?: boolean;
  onComplete?: () => void;
}

export default function OnboardingTour({ autoStart = false, onComplete }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);

    if (autoStart && !hasCompletedOnboarding && user) {
      // Wait a bit for page to render
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, user]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, action, index } = data;

    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status as any)) {
      setRun(false);
      setStepIndex(0);
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      onComplete?.();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
    }
  };

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    startTour();
  };

  // Expose methods globally for manual triggering
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).startOnboardingTour = startTour;
      (window as any).resetOnboarding = resetOnboarding;
    }
  }, []);

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#0045D3',
          textColor: '#212121',
          backgroundColor: '#FDF9F0',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: '#FDF9F0',
          zIndex: 1000,
        },
        tooltip: {
          borderRadius: 0,
          border: '2px solid #212121',
          boxShadow: '4px 4px 0px 0px rgba(33,33,33,1)',
          fontFamily: "'Space Mono', monospace",
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontFamily: "'Syne', sans-serif",
          fontSize: '1.25rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
        },
        tooltipContent: {
          padding: '12px 0',
        },
        buttonNext: {
          backgroundColor: '#0045D3',
          color: '#FDF9F0',
          border: '2px solid #212121',
          borderRadius: 0,
          padding: '8px 16px',
          fontFamily: "'Space Mono', monospace",
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '0.875rem',
        },
        buttonBack: {
          color: '#212121',
          marginRight: '8px',
          fontFamily: "'Space Mono', monospace",
          fontWeight: 'bold',
        },
        buttonSkip: {
          color: '#666',
          fontFamily: "'Space Mono', monospace",
        },
        buttonClose: {
          display: 'none',
        },
        beacon: {
          display: 'none',
        },
      }}
      locale={{
        back: '← Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next →',
        skip: 'Skip Tour',
      }}
    />
  );
}

/**
 * Hook to check if user has completed onboarding
 */
export function useOnboardingStatus() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    setHasCompletedOnboarding(completed);
  }, []);

  const markAsComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(false);
  };

  return {
    hasCompletedOnboarding,
    markAsComplete,
    resetOnboarding,
  };
}
