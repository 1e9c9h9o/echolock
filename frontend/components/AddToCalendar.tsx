'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Download, X } from 'lucide-react';
import {
  generateCheckInReminder,
  generateGoogleCalendarURL,
  generateOutlookURL,
  generateYahooCalendarURL,
  downloadICSFile,
} from '@/lib/calendar';
import Button from './ui/Button';

interface AddToCalendarProps {
  switchTitle: string;
  expiresAt: Date;
  reminderMinutesBefore?: number;
  variant?: 'button' | 'icon';
  className?: string;
}

export default function AddToCalendar({
  switchTitle,
  expiresAt,
  reminderMinutesBefore = 60,
  variant = 'button',
  className = '',
}: AddToCalendarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDownloadICS = () => {
    const icsContent = generateCheckInReminder(switchTitle, expiresAt, reminderMinutesBefore);
    if (icsContent) {
      downloadICSFile(icsContent, `echolock-${switchTitle.replace(/\s+/g, '-')}.ics`);
      setShowDropdown(false);
    }
  };

  const handleOpenCalendar = (type: 'google' | 'outlook' | 'yahoo') => {
    let url = '';
    switch (type) {
      case 'google':
        url = generateGoogleCalendarURL(switchTitle, expiresAt, reminderMinutesBefore);
        break;
      case 'outlook':
        url = generateOutlookURL(switchTitle, expiresAt, reminderMinutesBefore);
        break;
      case 'yahoo':
        url = generateYahooCalendarURL(switchTitle, expiresAt, reminderMinutesBefore);
        break;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setShowDropdown(false);
    }
  };

  const reminderLabel =
    reminderMinutesBefore >= 1440
      ? `${Math.floor(reminderMinutesBefore / 1440)}d`
      : reminderMinutesBefore >= 60
      ? `${Math.floor(reminderMinutesBefore / 60)}h`
      : `${reminderMinutesBefore}m`;

  return (
    <div className={`relative ${className}`}>
      {variant === 'button' ? (
        <Button
          variant="secondary"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2"
          aria-label="Add check-in reminder to calendar"
          aria-expanded={showDropdown}
          aria-haspopup="true"
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          Add to Calendar
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      ) : (
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 hover:bg-cream-dark rounded transition-colors border-2 border-black"
          aria-label="Add check-in reminder to calendar"
          aria-expanded={showDropdown}
          aria-haspopup="true"
        >
          <Calendar className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
            aria-hidden="true"
          />

          {/* Dropdown Menu */}
          <div
            className="absolute right-0 mt-2 w-64 bg-cream border-2 border-black shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] z-50 animate-fade-in-up"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="calendar-menu"
          >
            <div className="p-3 border-b-2 border-black bg-blue text-cream">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm uppercase">Add Reminder</p>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs mt-1 opacity-90">
                Reminder: {reminderLabel} before check-in
              </p>
            </div>

            <div className="p-2">
              <button
                onClick={() => handleOpenCalendar('google')}
                className="w-full text-left px-3 py-2 hover:bg-cream-dark transition-colors rounded flex items-center gap-2 group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-white rounded flex items-center justify-center border border-gray-300 group-hover:border-black transition-colors">
                  <span className="text-xs font-bold">G</span>
                </div>
                <span className="font-mono text-sm">Google Calendar</span>
              </button>

              <button
                onClick={() => handleOpenCalendar('outlook')}
                className="w-full text-left px-3 py-2 hover:bg-cream-dark transition-colors rounded flex items-center gap-2 group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-[#0078D4] rounded flex items-center justify-center group-hover:bg-[#106EBE] transition-colors">
                  <span className="text-white text-xs font-bold">O</span>
                </div>
                <span className="font-mono text-sm">Outlook Calendar</span>
              </button>

              <button
                onClick={() => handleOpenCalendar('yahoo')}
                className="w-full text-left px-3 py-2 hover:bg-cream-dark transition-colors rounded flex items-center gap-2 group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-[#6001D2] rounded flex items-center justify-center group-hover:bg-[#5000B5] transition-colors">
                  <span className="text-white text-xs font-bold">Y!</span>
                </div>
                <span className="font-mono text-sm">Yahoo Calendar</span>
              </button>

              <div className="border-t-2 border-gray-300 my-2" role="separator" />

              <button
                onClick={handleDownloadICS}
                className="w-full text-left px-3 py-2 hover:bg-cream-dark transition-colors rounded flex items-center gap-2 group"
                role="menuitem"
              >
                <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center group-hover:bg-green-700 transition-colors">
                  <Download className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-mono text-sm block">Download .ics</span>
                  <span className="text-xs text-gray-600">For Apple, other apps</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Multiple reminder selection component
 */
interface MultipleRemindersProps {
  switchTitle: string;
  expiresAt: Date;
  className?: string;
}

export function MultipleReminders({ switchTitle, expiresAt, className = '' }: MultipleRemindersProps) {
  const reminders = [
    { label: '24 hours before', minutes: 24 * 60 },
    { label: '6 hours before', minutes: 6 * 60 },
    { label: '1 hour before', minutes: 60 },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="font-bold text-sm uppercase mb-3">Choose Reminder Time</p>
      <div className="grid grid-cols-1 gap-2">
        {reminders.map(({ label, minutes }) => (
          <AddToCalendar
            key={minutes}
            switchTitle={switchTitle}
            expiresAt={expiresAt}
            reminderMinutesBefore={minutes}
            variant="button"
            className="w-full"
          />
        ))}
      </div>
    </div>
  );
}
