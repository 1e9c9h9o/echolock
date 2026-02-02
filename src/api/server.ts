'use strict';

/**
 * EchoLock API Server
 *
 * Production-ready Express API with:
 * - JWT authentication
 * - Rate limiting
 * - Request validation
 * - Error handling
 * - Security headers
 * - CORS configuration
 * - Health checks
 * - Graceful shutdown
 * - Sentry error monitoring
 *
 * Best Practices:
 * - Environment-based configuration
 * - Comprehensive logging
 * - Input validation
 * - Security middleware
 * - Error boundaries
 */

// Load environment variables from .env file (only in development)
// In production (Railway, etc.), env vars are injected directly
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Initialize Sentry BEFORE other imports for best stack traces
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Don't send PII
    sendDefaultPii: false,
  });
  console.log('Sentry initialized for error monitoring');
}

import express, { Request, Response, NextFunction, ErrorRequestHandler, CookieOptions } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScheduledTask } from 'node-cron';

import { logger, logRequest, logResponse } from './utils/logger.js';
import { testConnection } from './db/connection.js';

// Import routes
import authRoutes from './routes/auth.js';
import switchRoutes from './routes/switches.js';
import userRoutes from './routes/users.js';
import securityRoutes from './routes/security.js';
import adminRoutes from './routes/admin.js';
import quickCheckinRoutes from './routes/quickCheckin.js';
import recipientGroupsRoutes from './routes/recipientGroups.js';
import cascadeRoutes from './routes/cascade.js';
import healthCheckRoutes from './routes/healthCheck.js';
import emergencyContactsRoutes, { acknowledgeAlertRouter } from './routes/emergencyContacts.js';
import backupRoutes from './routes/backup.js';
import legalRoutes from './routes/legal.js';
import messagesRoutes from './routes/messages.js';
import guardianHealthRoutes from './routes/guardianHealth.js';

// Import auth middleware for cleanup
import { stopRateLimitCleanup } from './middleware/auth.js';

// Import reminder monitor (background job for check-in reminders)
// NOTE: timerMonitor has been removed - the Guardian Network now handles
// switch expiration detection and release. See CLAUDE.md for architecture.
import { startReminderMonitor } from './jobs/reminderMonitor.js';

// Import Bitcoin funding monitor (background job for detecting commitment funding)
import { startBitcoinFundingMonitor } from './jobs/bitcoinFundingMonitor.js';

// Import Guardian health monitor (background job for tracking guardian availability)
import { startGuardianHealthMonitor } from './jobs/guardianHealthMonitor.js';

// Import WebSocket service
import websocketService from './services/websocketService.js';

/**
 * Extended Express Application with locals
 */
interface AppLocals {
  reminderJob?: ScheduledTask;
  bitcoinJob?: ScheduledTask | null;
  httpServer?: http.Server;
}

const app = express();
const appLocals = app.locals as AppLocals;
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Trust proxy - required for Railway, Heroku, etc.
// This allows Express to trust X-Forwarded-* headers from the reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
// Support multiple origins from comma-separated string
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3001'];

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`, { allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Cookie parsing (required for httpOnly token cookies)
// SECURITY: Require COOKIE_SECRET in production
if (!process.env.COOKIE_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: COOKIE_SECRET environment variable is required in production');
  throw new Error('COOKIE_SECRET environment variable is required in production');
}
const cookieSecret = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.COOKIE_SECRET) {
  logger.warn('COOKIE_SECRET not set - using randomly generated secret (cookies will not persist across restarts)');
}
app.use(cookieParser(cookieSecret));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CSRF Protection middleware for state-changing requests
// Uses double-submit cookie pattern
const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for safe methods and non-browser requests
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API requests with Authorization header (non-browser clients)
  if (req.headers.authorization) {
    return next();
  }

  // For cookie-based auth, validate CSRF token
  const csrfToken = req.headers['x-csrf-token'] as string | undefined || (req.body as { _csrf?: string })?._csrf;
  const csrfCookie = req.cookies['csrf-token'] as string | undefined;

  if (!csrfToken || !csrfCookie) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'Please refresh the page and try again'
    });
    return;
  }

  // Timing-safe comparison
  try {
    const tokenBuffer = Buffer.from(csrfToken);
    const cookieBuffer = Buffer.from(csrfCookie);
    if (tokenBuffer.length !== cookieBuffer.length ||
        !crypto.timingSafeEqual(tokenBuffer, cookieBuffer)) {
      throw new Error('Invalid CSRF token');
    }
  } catch {
    res.status(403).json({
      error: 'CSRF token invalid',
      message: 'Please refresh the page and try again'
    });
    return;
  }

  next();
};

// Generate CSRF token endpoint
app.get('/api/csrf-token', (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieDomain = process.env.COOKIE_DOMAIN;

  const cookieConfig: CookieOptions = {
    httpOnly: false, // Must be readable by JavaScript
    secure: true, // Required for sameSite: 'none'
    sameSite: 'none', // Required for cross-origin (Vercel proxy to Railway)
    maxAge: 3600000, // 1 hour
    path: '/'
  };

  // Add domain for subdomain cookie sharing if configured
  if (cookieDomain) {
    cookieConfig.domain = cookieDomain;
  }

  res.cookie('csrf-token', token, cookieConfig);

  res.json({ csrfToken: token });
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  logRequest(req);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logResponse(req, res, duration);
  });

  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Try to check database, but don't fail if it's not available
    let dbHealthy = false;
    let dbError: string | null = null;

    try {
      dbHealthy = await testConnection();
    } catch (dbErr) {
      dbError = (dbErr as Error).message;
      logger.warn('Database health check failed:', dbErr);
    }

    const health = {
      status: 'healthy', // Always return healthy if server is running
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      database: {
        connected: dbHealthy,
        error: dbError
      },
      websocket: {
        connectedClients: websocketService.getConnectedClientsCount(),
        connectedUsers: websocketService.getConnectedUsersCount()
      }
    };

    // Always return 200 for Railway healthcheck
    res.status(200).json(health);
  } catch (err) {
    const error = err as Error;
    logger.error('Health check failed:', error);
    // Even on error, return 200 so Railway doesn't kill the container
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'EchoLock API',
    version: '2.0.0',
    description: 'Censorship-resistant dead man\'s switch using Nostr protocol',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      switches: '/api/switches',
      users: '/api/users',
      recipientGroups: '/api/recipient-groups',
      emergencyContacts: '/api/emergency-contacts',
      backup: '/api/account',
      legal: '/api/legal'
    }
  });
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/switches', switchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/quick-checkin', quickCheckinRoutes);

// New v2 feature routes
app.use('/api/recipient-groups', recipientGroupsRoutes);
app.use('/api/switches', cascadeRoutes);  // Mounts as /api/switches/:switchId/cascade
app.use('/api/switches', healthCheckRoutes);  // Mounts as /api/switches/:switchId/health-check
app.use('/api/emergency-contacts', emergencyContactsRoutes);
app.use('/api/acknowledge-alert', acknowledgeAlertRouter);  // Public route for alert acknowledgment
app.use('/api/messages', messagesRoutes);  // Public route for recipient message viewing
app.use('/api/account', backupRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/switches', guardianHealthRoutes);  // Mounts as /api/switches/:switchId/guardians/*
app.use('/api', guardianHealthRoutes);  // Mounts as /api/guardian-alert-settings

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Sentry error handler - must be before other error handlers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
const errorHandler: ErrorRequestHandler = (err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't expose internal errors in production
  const message = NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(err.status || 500).json({
    error: 'Server error',
    message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
};

app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Test database connection (but don't fail if it's not available yet)
    logger.info('Testing database connection...');
    let dbHealthy = false;

    try {
      dbHealthy = await testConnection();
      if (dbHealthy) {
        logger.info('Database connection successful');
      } else {
        logger.warn('Database connection test returned false - will retry later');
      }
    } catch (dbError) {
      logger.warn('Database connection failed during startup:', (dbError as Error).message);
      logger.warn('Server will start anyway - configure DATABASE_URL and restart');
    }

    // Start reminder monitor (cron job for check-in reminders)
    // NOTE: Timer monitor has been removed - the Guardian Network now handles
    // switch expiration detection and message release autonomously via Nostr.
    // Only start if database is healthy
    if (dbHealthy) {
      logger.info('Starting reminder monitor...');
      const reminderJob = startReminderMonitor();
      logger.info('Reminder monitor started - checking for upcoming expirations every hour');
      appLocals.reminderJob = reminderJob;

      // Start Bitcoin funding monitor (only if Bitcoin feature is enabled)
      const bitcoinJob = startBitcoinFundingMonitor();
      if (bitcoinJob) {
        logger.info('Bitcoin funding monitor started - checking for commitment funding every 2 minutes');
        appLocals.bitcoinJob = bitcoinJob;
      }

      // Start Guardian health monitor
      logger.info('Starting guardian health monitor...');
      startGuardianHealthMonitor();
      logger.info('Guardian health monitor started - checking guardian availability every 15 minutes');
    } else {
      logger.warn('Reminder monitor not started - database not available');
    }

    // Create HTTP server (needed for WebSocket integration)
    const server = http.createServer(app);

    // Initialize WebSocket server
    websocketService.initialize(server);
    logger.info('WebSocket server initialized');

    // Store server instance for graceful shutdown
    appLocals.httpServer = server;

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 EchoLock API server started`, {
        port: PORT,
        environment: NODE_ENV,
        processId: process.pid,
        database: dbHealthy ? 'connected' : 'not connected'
      });

      logger.info(`📡 API available at http://localhost:${PORT}/api`);
      logger.info(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
      logger.info(`❤️  Health check at http://localhost:${PORT}/health`);

      if (!dbHealthy) {
        logger.warn('⚠️  Database not connected - configure environment variables and redeploy');
      }
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown helper
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop reminder monitor if running
  if (appLocals.reminderJob) {
    appLocals.reminderJob.stop();
    logger.info('Reminder monitor stopped');
  }

  // Stop rate limit cleanup interval
  stopRateLimitCleanup();
  logger.info('Rate limit cleanup stopped');

  // Shutdown WebSocket server
  websocketService.shutdown();

  // Close HTTP server
  if (appLocals.httpServer) {
    appLocals.httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
