'use strict';

/**
 * Standardized API Error Handling
 *
 * Provides consistent error responses across all API endpoints.
 * Enables clients to programmatically distinguish between error types.
 *
 * Error Format:
 * {
 *   error: {
 *     code: 'ERROR_CODE',      // Machine-readable error code
 *     message: 'Human message', // Human-readable description
 *     details: { ... },         // Optional additional details
 *     requestId: 'uuid',        // For tracking/debugging
 *   }
 * }
 */

import crypto from 'crypto';

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Authentication errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // Resource errors (404)
  NOT_FOUND: 'NOT_FOUND',
  SWITCH_NOT_FOUND: 'SWITCH_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  GUARDIAN_NOT_FOUND: 'GUARDIAN_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  SWITCH_ALREADY_TRIGGERED: 'SWITCH_ALREADY_TRIGGERED',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CRYPTO_ERROR: 'CRYPTO_ERROR',
  NOSTR_ERROR: 'NOSTR_ERROR',
  BITCOIN_ERROR: 'BITCOIN_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RELAY_UNAVAILABLE: 'RELAY_UNAVAILABLE',
};

/**
 * HTTP status codes for each error type
 */
const ErrorStatusCodes = {
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.AUTH_INVALID_TOKEN]: 401,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS]: 403,

  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 400,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCodes.VALIDATION_OUT_OF_RANGE]: 400,

  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.SWITCH_NOT_FOUND]: 404,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.GUARDIAN_NOT_FOUND]: 404,

  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.SWITCH_ALREADY_TRIGGERED]: 409,
  [ErrorCodes.DUPLICATE_ENTRY]: 409,

  [ErrorCodes.RATE_LIMITED]: 429,

  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CRYPTO_ERROR]: 500,
  [ErrorCodes.NOSTR_ERROR]: 500,
  [ErrorCodes.BITCOIN_ERROR]: 500,

  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.RELAY_UNAVAILABLE]: 503,
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = ErrorStatusCodes[code] || 500;
    this.details = details;
    this.requestId = crypto.randomUUID();
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        requestId: this.requestId,
      },
    };
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(code, message, details = null) {
  const requestId = crypto.randomUUID();
  const statusCode = ErrorStatusCodes[code] || 500;

  return {
    statusCode,
    body: {
      error: {
        code,
        message,
        details,
        requestId,
      },
    },
  };
}

/**
 * Express error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default handler
  if (res.headersSent) {
    return next(err);
  }

  // Generate request ID for tracking
  const requestId = req.requestId || crypto.randomUUID();

  // Handle ApiError instances
  if (err instanceof ApiError) {
    console.error(`[API Error] ${err.code}: ${err.message}`, {
      requestId,
      details: err.details,
      path: req.path,
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
  }

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' || err.type === 'validation') {
    return res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: err.message || 'Validation failed',
        details: err.errors || err.details,
        requestId,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: 'Invalid authentication token',
        requestId,
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: ErrorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Authentication token has expired',
        requestId,
      },
    });
  }

  // Log unexpected errors
  console.error(`[Unexpected Error] ${err.message}`, {
    requestId,
    stack: err.stack,
    path: req.path,
  });

  // Generic server error for unexpected errors
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : err.message,
      requestId,
    },
  });
}

/**
 * Request ID middleware - adds unique ID to each request
 */
export function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req, res) {
  const requestId = req.requestId || crypto.randomUUID();
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.path}`,
      requestId,
    },
  });
}

/**
 * Helper functions for common error scenarios
 */
export const Errors = {
  authRequired: () =>
    new ApiError(ErrorCodes.AUTH_REQUIRED, 'Authentication required'),

  invalidToken: () =>
    new ApiError(ErrorCodes.AUTH_INVALID_TOKEN, 'Invalid authentication token'),

  tokenExpired: () =>
    new ApiError(ErrorCodes.AUTH_TOKEN_EXPIRED, 'Authentication token has expired'),

  forbidden: (message = 'Insufficient permissions') =>
    new ApiError(ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, message),

  validationFailed: (details) =>
    new ApiError(ErrorCodes.VALIDATION_FAILED, 'Validation failed', details),

  missingField: (field) =>
    new ApiError(
      ErrorCodes.VALIDATION_MISSING_FIELD,
      `Missing required field: ${field}`,
      { field }
    ),

  invalidFormat: (field, expected) =>
    new ApiError(
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      `Invalid format for field: ${field}`,
      { field, expected }
    ),

  notFound: (resource = 'Resource') =>
    new ApiError(ErrorCodes.NOT_FOUND, `${resource} not found`),

  switchNotFound: (switchId) =>
    new ApiError(
      ErrorCodes.SWITCH_NOT_FOUND,
      'Switch not found',
      { switchId }
    ),

  userNotFound: (userId) =>
    new ApiError(
      ErrorCodes.USER_NOT_FOUND,
      'User not found',
      { userId }
    ),

  guardianNotFound: (guardianId) =>
    new ApiError(
      ErrorCodes.GUARDIAN_NOT_FOUND,
      'Guardian not found',
      { guardianId }
    ),

  switchAlreadyTriggered: (switchId) =>
    new ApiError(
      ErrorCodes.SWITCH_ALREADY_TRIGGERED,
      'Switch has already been triggered',
      { switchId }
    ),

  duplicate: (field) =>
    new ApiError(
      ErrorCodes.DUPLICATE_ENTRY,
      `Duplicate entry for: ${field}`,
      { field }
    ),

  rateLimited: (retryAfter) =>
    new ApiError(
      ErrorCodes.RATE_LIMITED,
      'Too many requests, please try again later',
      { retryAfter }
    ),

  internal: (message = 'Internal server error') =>
    new ApiError(ErrorCodes.INTERNAL_ERROR, message),

  database: (message = 'Database error') =>
    new ApiError(ErrorCodes.DATABASE_ERROR, message),

  crypto: (message = 'Cryptographic operation failed') =>
    new ApiError(ErrorCodes.CRYPTO_ERROR, message),

  nostr: (message = 'Nostr relay error') =>
    new ApiError(ErrorCodes.NOSTR_ERROR, message),

  bitcoin: (message = 'Bitcoin network error') =>
    new ApiError(ErrorCodes.BITCOIN_ERROR, message),

  serviceUnavailable: (service = 'Service') =>
    new ApiError(
      ErrorCodes.SERVICE_UNAVAILABLE,
      `${service} is temporarily unavailable`
    ),

  relayUnavailable: () =>
    new ApiError(
      ErrorCodes.RELAY_UNAVAILABLE,
      'Nostr relays are temporarily unavailable'
    ),
};

export default {
  ErrorCodes,
  ApiError,
  createErrorResponse,
  errorHandler,
  requestIdMiddleware,
  notFoundHandler,
  Errors,
};
