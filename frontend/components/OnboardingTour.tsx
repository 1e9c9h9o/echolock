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
        <h2 className="text-2xl font-bold font-heading uppercase mb-3">Welcome to EchoLock!</h2>
        <p className="mb-3 font-mono">
          EchoLock is a censorship-resistant dead man's switch that automatically releases encrypted
          messages if you fail to check in regularly.
        </p>
        <p className="mb-2 font-mono">This quick tour will show you the key features.</p>
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
          Click here to create your first dead man's switch. You'll set a check-in interval and add
          an encrypted message.
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
          All your active switches appear here. Each shows the countdown timer and status.
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
          Click "Check In" to reset the timer and prevent your message from being released. You'll
          receive email reminders before expiration.
        </p>
      </div>
    ),
    placement: 'left',
    spotlightClicks: false,
  },
  {
    target: '[data-tour="filters"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Filter & Search</h3>
        <p className="font-mono text-sm">
          Use these controls to filter switches by status, sort, and search by title.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-menu"]',
    content: (
      <div className="p-2">
        <h3 className="text-lg font-bold font-heading uppercase mb-2">Settings & Profile</h3>
        <p className="font-mono text-sm">
          Access your account settings, preferences, and logout from here.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div className="p-2">
        <h2 className="text-2xl font-bold font-heading uppercase mb-3">You're All Set!</h2>
        <p className="mb-3 font-mono">
          You're ready to create your first dead man's switch. Remember to check in regularly!
        </p>
        <div className="bg-blue/10 border-2 border-blue p-3 rounded mt-4">
          <p className="font-mono text-sm font-bold mb-1">💡 Pro Tips:</p>
          <ul className="list-disc list-inside font-mono text-sm space-y-1">
            <li>Set realistic check-in intervals</li>
            <li>Use strong encryption for sensitive messages</li>
            <li>Test with a non-critical switch first</li>
            <li>Add multiple recipients for redundancy</li>
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
