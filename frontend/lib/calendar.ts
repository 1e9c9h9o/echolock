/**
 * Calendar Integration Utilities
 *
 * Generate .ics files for check-in reminders
 * Support for Google Calendar, Apple Calendar, Outlook
 */

import { createEvent, EventAttributes } from 'ics';

export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  startTime: Date;
  duration?: number; // in minutes
  reminders?: number[]; // minutes before event
}

/**
 * Generate .ics file content for a check-in reminder
 */
export function generateCheckInReminder(
  switchTitle: string,
  expiresAt: Date,
  reminderMinutesBefore: number = 60
): string | null {
  try {
    const reminderTime = new Date(expiresAt.getTime() - reminderMinutesBefore * 60 * 1000);

    const event: EventAttributes = {
      start: [
        reminderTime.getFullYear(),
        reminderTime.getMonth() + 1,
        reminderTime.getDate(),
        reminderTime.getHours(),
        reminderTime.getMinutes(),
      ],
      duration: { minutes: 15 },
      title: `EchoLock Check-in: ${switchTitle}`,
      description: `Time to check in for your dead man's switch "${switchTitle}". Check in before ${expiresAt.toLocaleString()} to prevent message release.`,
      location: 'https://echolock.xyz/dashboard',
      status: 'CONFIRMED',
      busyStatus: 'FREE',
      organizer: { name: 'EchoLock', email: 'noreply@echolock.xyz' },
      alarms: [
        {
          action: 'display',
          description: `Check in for "${switchTitle}"`,
          trigger: { minutes: 15, before: true },
        },
      ],
    };

    const { error, value } = createEvent(event);

    if (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }

    return value || null;
  } catch (error) {
    console.error('Error generating calendar reminder:', error);
    return null;
  }
}

/**
 * Generate multiple reminders (24h, 6h, 1h before expiry)
 */
export function generateMultipleReminders(
  switchTitle: string,
  expiresAt: Date
): { label: string; icsContent: string | null }[] {
  const reminders = [
    { label: '24 hours before', minutes: 24 * 60 },
    { label: '6 hours before', minutes: 6 * 60 },
    { label: '1 hour before', minutes: 60 },
  ];

  return reminders.map(({ label, minutes }) => ({
    label,
    icsContent: generateCheckInReminder(switchTitle, expiresAt, minutes),
  }));
}

/**
 * Download .ics file
 */
export function downloadICSFile(icsContent: string, filename: string = 'reminder.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarURL(
  switchTitle: string,
  expiresAt: Date,
  reminderMinutesBefore: number = 60
): string {
  const reminderTime = new Date(expiresAt.getTime() - reminderMinutesBefore * 60 * 1000);
  const endTime = new Date(reminderTime.getTime() + 15 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const title = encodeURIComponent(`EchoLock Check-in: ${switchTitle}`);
  const description = encodeURIComponent(
    `Time to check in for your dead man's switch "${switchTitle}". Check in before ${expiresAt.toLocaleString()} to prevent message release.`
  );
  const location = encodeURIComponent('https://echolock.xyz/dashboard');
  const dates = `${formatDate(reminderTime)}/${formatDate(endTime)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}`;
}

/**
 * Generate Outlook Web URL
 */
export function generateOutlookURL(
  switchTitle: string,
  expiresAt: Date,
  reminderMinutesBefore: number = 60
): string {
  const reminderTime = new Date(expiresAt.getTime() - reminderMinutesBefore * 60 * 1000);
  const endTime = new Date(reminderTime.getTime() + 15 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString();
  };

  const title = encodeURIComponent(`EchoLock Check-in: ${switchTitle}`);
  const description = encodeURIComponent(
    `Time to check in for your dead man's switch "${switchTitle}". Check in before ${expiresAt.toLocaleString()}.`
  );
  const location = encodeURIComponent('https://echolock.xyz/dashboard');
  const start = formatDate(reminderTime);
  const end = formatDate(endTime);

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&location=${location}&startdt=${start}&enddt=${end}&path=/calendar/action/compose&rru=addevent`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function generateYahooCalendarURL(
  switchTitle: string,
  expiresAt: Date,
  reminderMinutesBefore: number = 60
): string {
  const reminderTime = new Date(expiresAt.getTime() - reminderMinutesBefore * 60 * 1000);
  const endTime = new Date(reminderTime.getTime() + 15 * 60 * 1000);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const title = encodeURIComponent(`EchoLock Check-in: ${switchTitle}`);
  const description = encodeURIComponent(
    `Time to check in for "${switchTitle}". Check in before ${expiresAt.toLocaleString()}.`
  );
  const start = formatDate(reminderTime);
  const end = formatDate(endTime);

  return `https://calendar.yahoo.com/?v=60&title=${title}&desc=${description}&st=${start}&et=${end}`;
}

/**
 * Check if browser supports calendar downloads
 */
export function supportsCalendarDownload(): boolean {
  return typeof window !== 'undefined' && 'Blob' in window && 'URL' in window;
}
