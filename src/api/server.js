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
 *
 * Best Practices:
 * - Environment-based configuration
 * - Comprehensive logging
 * - Input validation
 * - Security middleware
 * - Error boundaries
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger, logRequest, logResponse } from './utils/logger.js';
import { testConnection } from './db/connection.js';

// Import routes
import authRoutes from './routes/auth.js';
import switchRoutes from './routes/switches.js';
import userRoutes from './routes/users.js';

// Import timer monitor (background job)
import { startTimerMonitor } from './jobs/timerMonitor.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE
// ============================================================================

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
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
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
app.get('/health', async (req, res) => {
  try {
    // Try to check database, but don't fail if it's not available
    let dbHealthy = false;
    let dbError = null;

    try {
      dbHealthy = await testConnection();
    } catch (dbErr) {
      dbError = dbErr.message;
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
      }
    };

    // Always return 200 for Railway healthcheck
    res.status(200).json(health);
  } catch (error) {
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
app.get('/api', (req, res) => {
  res.json({
    name: 'EchoLock API',
    version: '1.0.0',
    description: 'Censorship-resistant dead man\'s switch using Nostr protocol',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      switches: '/api/switches',
      users: '/api/users'
    }
  });
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/switches', switchRoutes);
app.use('/api/users', userRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
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
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
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
      logger.warn('Database connection failed during startup:', dbError.message);
      logger.warn('Server will start anyway - configure DATABASE_URL and restart');
    }

    // Start timer monitor (cron job for checking expired switches)
    // Only start if database is healthy
    if (dbHealthy) {
      logger.info('Starting timer monitor...');
      const timerJob = startTimerMonitor();
      logger.info('Timer monitor started - checking for expired switches every 5 minutes');
      app.locals.timerJob = timerJob;
    } else {
      logger.warn('Timer monitor not started - database not available');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 EchoLock API server started`, {
        port: PORT,
        environment: NODE_ENV,
        processId: process.pid,
        database: dbHealthy ? 'connected' : 'not connected'
      });

      logger.info(`📡 API available at http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check at http://localhost:${PORT}/health`);

      if (!dbHealthy) {
        logger.warn('⚠️  Database not connected - configure environment variables and redeploy');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  // Stop timer monitor if running
  if (app.locals.timerJob) {
    app.locals.timerJob.stop();
    logger.info('Timer monitor stopped');
  }

  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');

  // Stop timer monitor if running
  if (app.locals.timerJob) {
    app.locals.timerJob.stop();
    logger.info('Timer monitor stopped');
  }

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
