/**
 * Common TypeScript types for the frontend
 */

import { AxiosError } from 'axios'

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  error: string
  message: string
  details?: Record<string, string>
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return error instanceof Error && 'isAxiosError' in error
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * User type
 */
export interface User {
  id: string
  email: string
  email_verified?: boolean
  created_at?: string
  last_login?: string
}

/**
 * Switch status enum
 */
export type SwitchStatus = 'ARMED' | 'PAUSED' | 'CANCELLED' | 'TRIGGERED' | 'RELEASED'

/**
 * Switch type
 */
export interface Switch {
  id: string
  title: string
  description?: string
  status: SwitchStatus
  checkInHours: number
  lastCheckIn?: string
  expiresAt: string
  createdAt: string
  recipientCount: number
  checkInCount?: number
  timeRemaining?: number
  isExpired?: boolean
}

/**
 * Recipient type
 */
export interface Recipient {
  email: string
  name?: string
}

/**
 * Session type
 */
export interface Session {
  id: string
  user_agent?: string
  ip_address?: string
  created_at: string
  last_activity?: string
  is_current?: boolean
}

/**
 * Audit log event type
 */
export interface AuditLogEvent {
  id: string
  event_type: string
  event_data?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'switch_update'
  | 'switch_triggered'
  | 'check_in'
  | 'switch_deleted'
  | 'connection_established'

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType
  data: T
}
