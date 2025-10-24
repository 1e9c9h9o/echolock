/**
 * WebSocket Service for Real-Time Updates
 * Handles persistent connection to backend for live switch updates
 */

type MessageHandler = (data: any) => void
type ConnectionHandler = () => void

interface WebSocketMessage {
  type: 'switch_update' | 'switch_triggered' | 'check_in' | 'switch_deleted'
  data: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private connectionHandlers: ConnectionHandler[] = []
  private disconnectionHandlers: ConnectionHandler[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect()
    }
  }

  /**
   * Establish WebSocket connection
   */
  connect() {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      console.warn('No access token found, skipping WebSocket connection')
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    const url = `${wsUrl}?token=${token}`

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
  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler)
  }

  /**
   * Unsubscribe from message type
   */
  off(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler)
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
  send(type: string, data: any) {
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
export function useWebSocket(type: string, handler: MessageHandler) {
  if (typeof window === 'undefined') return

  useEffect(() => {
    wsService.on(type, handler)
    return () => wsService.off(type, handler)
  }, [type, handler])
}

// For Next.js compatibility
import { useEffect } from 'react'
