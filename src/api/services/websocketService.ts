'use strict';

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import { verifyToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * Extended WebSocket with user info
 */
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  email?: string;
  isAlive?: boolean;
}

/**
 * WebSocket message types
 */
interface WsMessage {
  type: string;
  payload?: Record<string, unknown>;
}

/**
 * Switch data for notifications
 */
interface SwitchNotificationData {
  id: string;
  title: string;
  last_check_in?: Date;
  expires_at?: Date;
  check_in_count?: number;
  status?: string;
  triggered_at?: Date;
}

/**
 * Bitcoin commitment notification data
 */
interface BitcoinCommitmentData {
  switchId: string;
  title: string;
  txid: string;
  amount: number;
  confirmed: boolean;
  blockHeight?: number;
  explorerUrl?: string;
  network: string;
}

/**
 * Verify client callback type
 */
interface VerifyClientInfo {
  origin?: string;
  req: IncomingMessage & { headers: { origin?: string } };
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      // Verify origin to prevent cross-site WebSocket hijacking
      verifyClient: (info: VerifyClientInfo, callback: (result: boolean, code?: number, message?: string) => void) => {
        const origin = info.origin || info.req.headers.origin;

        // Allow connections with no origin (e.g., from server-side or mobile apps)
        if (!origin) {
          return callback(true);
        }

        // Get allowed origins from environment
        const allowedOrigins = process.env.CORS_ORIGINS
          ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
          : ['http://localhost:3001', 'http://localhost:3000'];

        // In production, require origin to be in allowed list
        if (process.env.NODE_ENV === 'production') {
          if (!allowedOrigins.includes(origin)) {
            logger.warn('WebSocket connection rejected: Invalid origin', {
              origin,
              allowedOrigins
            });
            return callback(false, 403, 'Origin not allowed');
          }
        }

        callback(true);
      }
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => this.handleConnection(ws, req));

    // Set up heartbeat to detect broken connections
    this.pingInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (authWs.isAlive === false) {
          logger.debug('Terminating inactive WebSocket connection', {
            userId: authWs.userId
          });
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000); // 30 seconds

    logger.info('WebSocket server initialized', { path: '/ws' });
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<void> {
    try {
      // Extract token from query parameter or Authorization header
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const authHeader = req.headers.authorization;
      const token = url.searchParams.get('token') ||
                    (authHeader ? authHeader.replace('Bearer ', '') : undefined);

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided', {
          ip: req.socket?.remoteAddress
        });
        ws.close(4001, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        logger.warn('WebSocket connection rejected: Invalid token', {
          ip: req.socket?.remoteAddress
        });
        ws.close(4001, 'Invalid authentication token');
        return;
      }

      // Attach user info to WebSocket
      ws.userId = decoded.userId;
      ws.email = decoded.email;
      ws.isAlive = true;

      // Store connection in clients map
      if (!this.clients.has(ws.userId)) {
        this.clients.set(ws.userId, new Set());
      }
      this.clients.get(ws.userId)!.add(ws);

      logger.info('WebSocket connection established', {
        userId: ws.userId,
        email: ws.email,
        ip: req.socket?.remoteAddress
      });

      // Set up event handlers
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => this.handleMessage(ws, data));

      ws.on('close', () => {
        logger.info('WebSocket connection closed', {
          userId: ws.userId,
          email: ws.email
        });

        // Remove from clients map
        if (ws.userId) {
          const userConnections = this.clients.get(ws.userId);
          if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
              this.clients.delete(ws.userId);
            }
          }
        }
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket error', {
          userId: ws.userId,
          error: error.message
        });
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection',
        payload: {
          status: 'connected',
          userId: ws.userId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      const err = error as Error;
      logger.error('Error handling WebSocket connection', {
        error: err.message,
        stack: err.stack
      });
      ws.close(4000, 'Connection error');
    }
  }

  /**
   * Handle incoming messages from client
   */
  handleMessage(ws: AuthenticatedWebSocket, data: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      const message = JSON.parse(data.toString()) as WsMessage;

      logger.debug('WebSocket message received', {
        userId: ws.userId,
        type: message.type
      });

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', payload: { timestamp: new Date().toISOString() } });
          break;

        case 'subscribe':
          // Client can subscribe to specific events
          // For now, all events are sent automatically
          this.sendToClient(ws, {
            type: 'subscribed',
            payload: { channels: (message.payload?.channels as string[]) || ['all'] }
          });
          break;

        default:
          logger.warn('Unknown WebSocket message type', {
            userId: ws.userId,
            type: message.type
          });
      }
    } catch (error) {
      const err = error as Error;
      logger.error('Error handling WebSocket message', {
        userId: ws.userId,
        error: err.message
      });
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws: AuthenticatedWebSocket, message: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to specific user (all their connections)
   */
  broadcastToUser(userId: string, message: WsMessage): void {
    const userConnections = this.clients.get(userId);
    if (!userConnections || userConnections.size === 0) {
      logger.debug('No active WebSocket connections for user', { userId });
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    userConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    });

    logger.debug('Broadcast message to user', {
      userId,
      type: message.type,
      connectionsSent: sentCount
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message: WsMessage): void {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    });

    logger.debug('Broadcast message to all clients', {
      type: message.type,
      clientsSent: sentCount
    });
  }

  /**
   * Send check-in confirmation to user
   */
  notifyCheckIn(userId: string, switchData: SwitchNotificationData): void {
    this.broadcastToUser(userId, {
      type: 'check_in',
      payload: {
        switchId: switchData.id,
        title: switchData.title,
        lastCheckIn: switchData.last_check_in,
        expiresAt: switchData.expires_at,
        checkInCount: switchData.check_in_count,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send switch status update to user
   */
  notifySwitchUpdate(userId: string, switchData: SwitchNotificationData): void {
    this.broadcastToUser(userId, {
      type: 'switch_update',
      payload: {
        switchId: switchData.id,
        title: switchData.title,
        status: switchData.status,
        expiresAt: switchData.expires_at,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send expiry warning to user
   */
  notifyExpiryWarning(userId: string, switchData: SwitchNotificationData, hoursRemaining: number): void {
    this.broadcastToUser(userId, {
      type: 'expiry_warning',
      payload: {
        switchId: switchData.id,
        title: switchData.title,
        expiresAt: switchData.expires_at,
        hoursRemaining,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send switch triggered notification to user
   */
  notifySwitchTriggered(userId: string, switchData: SwitchNotificationData): void {
    this.broadcastToUser(userId, {
      type: 'switch_triggered',
      payload: {
        switchId: switchData.id,
        title: switchData.title,
        triggeredAt: switchData.triggered_at,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send Bitcoin commitment funded notification to user
   */
  notifyBitcoinFunded(userId: string, commitmentData: BitcoinCommitmentData): void {
    this.broadcastToUser(userId, {
      type: 'bitcoin_funded',
      payload: {
        switchId: commitmentData.switchId,
        title: commitmentData.title,
        txid: commitmentData.txid,
        amount: commitmentData.amount,
        confirmed: commitmentData.confirmed,
        blockHeight: commitmentData.blockHeight,
        explorerUrl: commitmentData.explorerUrl,
        network: commitmentData.network,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get connected client count
   */
  getConnectedClientsCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.clients.size;
  }

  /**
   * Send batch update notification to user (for batch check-ins, batch deletes, etc.)
   */
  notifyBatchUpdate(userId: string, operation: string, results: Array<{ id: string; success: boolean; error?: string }>): void {
    this.broadcastToUser(userId, {
      type: 'batch_update',
      payload: {
        operation,
        results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Gracefully shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    if (this.wss) {
      logger.info('Shutting down WebSocket server...');

      // Close all connections gracefully
      this.wss.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });

      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }

    this.clients.clear();
  }
}

// Export singleton instance
export default new WebSocketService();
