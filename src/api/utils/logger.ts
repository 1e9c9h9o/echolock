'use strict';

/**
 * Application Logger
 *
 * Uses Winston for structured logging with different transports
 * for different environments
 *
 * Log Levels:
 * - error: Errors that need immediate attention
 * - warn: Warning messages (degraded functionality)
 * - info: Important business events
 * - debug: Detailed information for debugging
 *
 * Best Practices:
 * - Structured logging with context objects
 * - Different log levels for different environments
 * - Rotate log files to prevent disk space issues
 * - Never log sensitive data (passwords, keys, etc.)
 */

import winston from 'winston';
import path from 'path';
import type { Request, Response } from 'express';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Log format for development (human-readable)
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Log format for production (JSON for log aggregation services)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: isDevelopment ? developmentFormat : productionFormat
  })
);

// File transports (production only)
if (isProduction) {
  const logsDir = path.join(process.cwd(), 'logs');

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: productionFormat,
  transports,
  // Don't exit on error
  exitOnError: false
});

/**
 * Redact sensitive data from logs
 * Call this before logging objects that might contain sensitive data
 */
export function redactSensitive<T>(obj: T): T {
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'privateKey',
    'authTag',
    'ciphertext',
    'encryptedMessage'
  ];

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const redacted = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive terms
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    }

    // Recursively redact nested objects
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted as T;
}

// Extended Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Log an API request
 */
export function logRequest(req: AuthenticatedRequest): void {
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });
}

/**
 * Log an API response
 */
export function logResponse(req: AuthenticatedRequest, res: Response, duration: number): void {
  logger.info('API Response', {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration,
    userId: req.user?.id
  });
}

/**
 * Log a security event
 */
export function logSecurityEvent(eventType: string, details: Record<string, unknown>): void {
  logger.warn('Security Event', {
    eventType,
    ...redactSensitive(details)
  });
}

// Export log methods directly
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const debug = logger.debug.bind(logger);

export default logger;
