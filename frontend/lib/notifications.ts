/**
 * Browser Push Notification Service
 * Handles permission requests and notification display
 */

export type NotificationPermission = 'granted' | 'denied' | 'default'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: any
}

class NotificationService {
  private permission: NotificationPermission = 'default'

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission as NotificationPermission
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      const result = await Notification.requestPermission()
      this.permission = result as NotificationPermission
      return this.permission
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Show a notification
   */
  async show(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      badge: options.badge || '/badge-72.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    })

    notification.onclick = (event) => {
      event.preventDefault()
      window.focus()
      if (options.data?.url) {
        window.location.href = options.data.url
      }
      notification.close()
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission
  }

  /**
   * Schedule a notification for upcoming check-in
   */
  scheduleCheckInReminder(switchTitle: string, minutesUntil: number, switchId: string) {
    if (minutesUntil <= 0) return

    const ms = minutesUntil * 60 * 1000

    setTimeout(() => {
      this.show({
        title: '⏰ Check-In Reminder',
        body: `"${switchTitle}" requires check-in soon!`,
        tag: `check-in-${switchId}`,
        requireInteraction: true,
        data: {
          url: `/dashboard/switches/${switchId}`,
        },
      })
    }, ms)
  }

  /**
   * Show urgent check-in notification (< 1 hour)
   */
  showUrgentCheckIn(switchTitle: string, minutesRemaining: number, switchId: string) {
    this.show({
      title: '🚨 URGENT: Check-In Required',
      body: `"${switchTitle}" expires in ${minutesRemaining} minutes!`,
      tag: `urgent-${switchId}`,
      requireInteraction: true,
      data: {
        url: `/dashboard/switches/${switchId}`,
      },
    })
  }

  /**
   * Show switch triggered notification
   */
  showSwitchTriggered(switchTitle: string, switchId: string) {
    this.show({
      title: '⚠️ Switch Triggered',
      body: `"${switchTitle}" has been triggered due to missed check-in`,
      tag: `triggered-${switchId}`,
      requireInteraction: true,
      data: {
        url: `/dashboard/switches/${switchId}`,
      },
    })
  }

  /**
   * Show switch created notification
   */
  showSwitchCreated(switchTitle: string, nextCheckInHours: number) {
    this.show({
      title: '✅ Switch Created',
      body: `"${switchTitle}" is now active. Next check-in in ${nextCheckInHours} hours.`,
      tag: 'switch-created',
      data: {
        url: '/dashboard',
      },
    })
  }

  /**
   * Show check-in success notification
   */
  showCheckInSuccess(switchTitle: string, nextCheckInHours: number) {
    this.show({
      title: '✓ Check-In Successful',
      body: `"${switchTitle}" timer reset. Next check-in in ${nextCheckInHours} hours.`,
      tag: 'check-in-success',
    })
  }
}

// Singleton instance
export const notificationService = new NotificationService()

/**
 * React hook for notification permission
 */
import { useState, useEffect } from 'react'

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (notificationService.isSupported()) {
      setPermission(notificationService.getPermission())
    }
  }, [])

  const requestPermission = async () => {
    const result = await notificationService.requestPermission()
    setPermission(result)
    return result
  }

  return {
    permission,
    requestPermission,
    isSupported: notificationService.isSupported(),
  }
}
