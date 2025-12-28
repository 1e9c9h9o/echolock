/**
 * WebSocket Service for Real-Time Updates
 * Handles persistent connection to backend for live switch updates
 */

import { WebSocketMessage, WebSocketMessageType } from './types'

type MessageHandler<T = unknown> = (data: T) => void
type ConnectionHandler = () => void

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private messageHandlers: Map<string, MessageHandler<unknown>[]> = new Map()
  private connectionHandlers: ConnectionHandler[] = []
  private disconnectionHandlers: ConnectionHandler[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect()
    }
  }

  /**
   * Get WebSocket authentication ticket from server
   * Since httpOnly cookies can't be accessed from JS, we get a short-lived ticket
   */
  private async getWsTicket(): Promise<string | null> {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${API_URL}/api/auth/ws-ticket`, {
        credentials: 'include', // Include cookies
      })
      if (response.ok) {
        const data = await response.json()
        return data.ticket
      }
    } catch (error) {
      console.error('Failed to get WebSocket ticket:', error)
    }
    return null
  }

  /**
   * Establish WebSocket connection
   */
  async connect() {
    const ticket = await this.getWsTicket()
    if (!ticket) {
      console.warn('No WebSocket ticket available, skipping connection')
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    const url = `${wsUrl}?ticket=${ticket}`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected')
        this.reconnectAttempts = 0
        this.connectionHandlers.forEach((handler) => handler())
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.disconnectionHandlers.forEach((handler) => handler())
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.attemptReconnect()
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Attempting to reconnect in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage) {
    const handlers = this.messageHandlers.get(message.type) || []
    handlers.forEach((handler) => handler(message.data))

    // Call wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*') || []
    wildcardHandlers.forEach((handler) => handler(message))
  }

  /**
   * Subscribe to specific message type
   */
  on<T = unknown>(type: string | WebSocketMessageType, handler: MessageHandler<T>) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler as MessageHandler<unknown>)
  }

  /**
   * Unsubscribe from message type
   */
  off<T = unknown>(type: string | WebSocketMessageType, handler: MessageHandler<T>) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler as MessageHandler<unknown>)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to connection event
   */
  onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler)
  }

  /**
   * Subscribe to disconnection event
   */
  onDisconnect(handler: ConnectionHandler) {
    this.disconnectionHandlers.push(handler)
  }

  /**
   * Send message to server
   */
  send<T = unknown>(type: string, data: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  /**
   * Close connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// Singleton instance
export const wsService = new WebSocketService()

/**
 * React hook for WebSocket
 */
export function useWebSocket<T = unknown>(type: string | WebSocketMessageType, handler: MessageHandler<T>) {
  if (typeof window === 'undefined') return

  useEffect(() => {
    wsService.on(type, handler)
    return () => wsService.off(type, handler)
  }, [type, handler])
}

// For Next.js compatibility
import { useEffect } from 'react'
