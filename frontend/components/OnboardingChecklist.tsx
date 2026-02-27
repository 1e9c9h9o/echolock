'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Trophy, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const CHECKLIST_STORAGE_KEY = 'echolock_onboarding_checklist';
const CHECKLIST_DISMISSED_KEY = 'echolock_checklist_dismissed';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

const initialChecklist: ChecklistItem[] = [
  {
    id: 'verify_email',
    title: 'Verify your email',
    description: 'Check your inbox and verify your email address to enable all features',
    completed: false,
  },
  {
    id: 'create_switch',
    title: 'Create your first switch',
    description: 'Set up a dead man switch with a check-in interval and message',
    completed: false,
  },
  {
    id: 'add_recipients',
    title: 'Add recipients',
    description: 'Specify who will receive your message if the switch triggers',
    completed: false,
  },
  {
    id: 'perform_checkin',
    title: 'Perform your first check-in',
    description: 'Test the check-in process to reset your timer',
    completed: false,
  },
  {
    id: 'enable_notifications',
    title: 'Enable browser notifications',
    description: 'Get real-time alerts for check-in reminders and status changes',
    completed: false,
  },
  {
    id: 'calendar_reminder',
    title: 'Add calendar reminder',
    description: 'Set up calendar reminders to never miss a check-in',
    completed: false,
  },
];

interface OnboardingChecklistProps {
  className?: string;
}

export default function OnboardingChecklist({ className = '' }: OnboardingChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Load checklist state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    const dismissed = localStorage.getItem(CHECKLIST_DISMISSED_KEY);

    if (saved) {
      try {
        const savedChecklist = JSON.parse(saved);
        setChecklist(savedChecklist);
      } catch (error) {
        console.error('Error loading checklist:', error);
      }
    }

    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Save checklist state to localStorage
  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
  }, [checklist]);

  // Auto-update checklist based on user state
  useEffect(() => {
    if (user?.email_verified) {
      markItemComplete('verify_email');
    }
  }, [user]);

  const markItemComplete = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId && !item.completed ? { ...item, completed: true } : item))
    );
  };

  const resetChecklist = () => {
    setChecklist(initialChecklist);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  };

  const dismissChecklist = () => {
    setIsDismissed(true);
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
  };

  const showChecklist = () => {
    setIsDismissed(false);
    localStorage.removeItem(CHECKLIST_DISMISSED_KEY);
  };

  // Expose methods globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).markChecklistItemComplete = markItemComplete;
      (window as any).resetOnboardingChecklist = resetChecklist;
      (window as any).showOnboardingChecklist = showChecklist;
    }
  }, []);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] ${className}`}
      role="region"
      aria-label="Onboarding progress checklist"
    >
      {/* Header */}
      <div className="bg-blue text-cream p-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <Trophy className="w-6 h-6 text-yellow-300" aria-hidden="true" />
            ) : (
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 transform -rotate-90" aria-hidden="true">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-white/30"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercentage / 100)}`}
                    className="text-cream transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-bold font-heading uppercase text-lg">
                {isComplete ? 'Setup Complete' : 'Getting Started'}
              </h3>
              <p className="text-sm opacity-90 font-mono">
                {completedCount} of {totalCount} steps
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse checklist' : 'Expand checklist'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={dismissChecklist}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              aria-label="Dismiss checklist"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-blue h-1">
        <div
          className="bg-black/70 h-full"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Checklist Items */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {checklist.map((item) => (
            <ChecklistItemRow key={item.id} item={item} onMarkComplete={markItemComplete} />
          ))}

          {isComplete && (
            <div className="bg-blue border border-black/10 p-4 mt-4">
              <p className="text-sm text-black/70">
                Setup complete. Remember to check in before your timer expires.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  onMarkComplete: (id: string) => void;
}

function ChecklistItemRow({ item, onMarkComplete }: ChecklistItemRowProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 transition-colors ${
        item.completed
          ? 'bg-blue'
          : 'bg-white border border-black/10'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {item.completed ? (
          <CheckCircle2 className="w-5 h-5 text-black/50" aria-label="Completed" />
        ) : (
          <Circle className="w-5 h-5 text-black/30" aria-label="Not completed" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-sm ${
            item.completed ? 'text-black/50' : 'text-black/80'
          }`}
        >
          {item.title}
        </h4>
        {!item.completed && (
          <p className="text-xs text-black/70 mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage checklist progress
 */
export function useChecklistProgress() {
  const markComplete = (itemId: string) => {
    if (typeof window !== 'undefined' && (window as any).markChecklistItemComplete) {
      (window as any).markChecklistItemComplete(itemId);
    }
  };

  return { markComplete };
}
