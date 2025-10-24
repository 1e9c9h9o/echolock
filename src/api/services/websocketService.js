import { WebSocketServer } from 'ws';
import { verifyToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.pingInterval = null;
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      // Verify origin in production
      verifyClient: (info, callback) => {
        // Add origin verification here if needed
        callback(true);
      }
    });

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    // Set up heartbeat to detect broken connections
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          logger.debug('Terminating inactive WebSocket connection', {
            userId: ws.userId
          });
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    logger.info('WebSocket server initialized', { path: '/ws' });
  }

  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} req - HTTP request
   */
  async handleConnection(ws, req) {
    try {
      // Extract token from query parameter or Authorization header
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') ||
                    req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided', {
          ip: req.socket.remoteAddress
        });
        ws.close(4001, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        logger.warn('WebSocket connection rejected: Invalid token', {
          ip: req.socket.remoteAddress
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
      this.clients.get(ws.userId).add(ws);

      logger.info('WebSocket connection established', {
        userId: ws.userId,
        email: ws.email,
        ip: req.socket.remoteAddress
      });

      // Set up event handlers
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => this.handleMessage(ws, data));

      ws.on('close', () => {
        logger.info('WebSocket connection closed', {
          userId: ws.userId,
          email: ws.email
        });

        // Remove from clients map
        const userConnections = this.clients.get(ws.userId);
        if (userConnections) {
          userConnections.delete(ws);
          if (userConnections.size === 0) {
            this.clients.delete(ws.userId);
          }
        }
      });

      ws.on('error', (error) => {
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
      logger.error('Error handling WebSocket connection', {
        error: error.message,
        stack: error.stack
      });
      ws.close(4000, 'Connection error');
    }
  }

  /**
   * Handle incoming messages from client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Buffer|String} data - Message data
   */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

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
            payload: { channels: message.payload?.channels || ['all'] }
          });
          break;

        default:
          logger.warn('Unknown WebSocket message type', {
            userId: ws.userId,
            type: message.type
          });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', {
        userId: ws.userId,
        error: error.message
      });
    }
  }

  /**
   * Send message to specific client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} message - Message object
   */
  sendToClient(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to specific user (all their connections)
   * @param {string} userId - User ID
   * @param {Object} message - Message object
   */
  broadcastToUser(userId, message) {
    const userConnections = this.clients.get(userId);
    if (!userConnections || userConnections.size === 0) {
      logger.debug('No active WebSocket connections for user', { userId });
      return;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    userConnections.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
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
   * @param {Object} message - Message object
   */
  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
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
   * @param {string} userId - User ID
   * @param {Object} switchData - Switch data
   */
  notifyCheckIn(userId, switchData) {
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
   * @param {string} userId - User ID
   * @param {Object} switchData - Switch data
   */
  notifySwitchUpdate(userId, switchData) {
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
   * @param {string} userId - User ID
   * @param {Object} switchData - Switch data
   * @param {number} hoursRemaining - Hours until expiry
   */
  notifyExpiryWarning(userId, switchData, hoursRemaining) {
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
   * @param {string} userId - User ID
   * @param {Object} switchData - Switch data
   */
  notifySwitchTriggered(userId, switchData) {
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
   * Get connected client count
   * @returns {number} Number of connected clients
   */
  getConnectedClientsCount() {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Get connected users count
   * @returns {number} Number of unique connected users
   */
  getConnectedUsersCount() {
    return this.clients.size;
  }

  /**
   * Gracefully shutdown WebSocket server
   */
  shutdown() {
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
