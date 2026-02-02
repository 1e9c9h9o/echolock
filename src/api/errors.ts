'use strict';

/**
 * Standardized API Error Handling
 *
 * Provides consistent error responses across all API endpoints.
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Error details type
 */
export type ErrorDetails = Record<string, unknown> | null;

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
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * HTTP status codes for each error type
 */
const ErrorStatusCodes: Record<ErrorCode, number> = {
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
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: ErrorDetails;
  public readonly requestId: string;

  constructor(code: ErrorCode, message: string, details: ErrorDetails = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = ErrorStatusCodes[code] || 500;
    this.details = details;
    this.requestId = crypto.randomUUID();
  }

  toJSON(): { error: { code: ErrorCode; message: string; details: ErrorDetails; requestId: string } } {
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
 * Error response body
 */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
    requestId: string;
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details: ErrorDetails = null
): { statusCode: number; body: ErrorResponseBody } {
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
 * Extended request type with requestId
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Error with additional properties
 */
interface ExtendedError extends Error {
  type?: string;
  errors?: unknown;
  details?: unknown;
}

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: Error,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default handler
  if (res.headersSent) {
    next(err);
    return;
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

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  const extendedErr = err as ExtendedError;

  // Handle validation errors from express-validator or similar
  if (err.name === 'ValidationError' || extendedErr.type === 'validation') {
    res.status(400).json({
      error: {
        code: ErrorCodes.VALIDATION_FAILED,
        message: err.message || 'Validation failed',
        details: extendedErr.errors || extendedErr.details,
        requestId,
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: ErrorCodes.AUTH_INVALID_TOKEN,
        message: 'Invalid authentication token',
        requestId,
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: ErrorCodes.AUTH_TOKEN_EXPIRED,
        message: 'Authentication token has expired',
        requestId,
      },
    });
    return;
  }

  // Log unexpected errors
  console.error(`[Unexpected Error] ${err.message}`, {
    requestId,
    stack: err.stack,
    path: req.path,
  });

  // Generic server error for unexpected errors
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
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
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: RequestWithId, res: Response): void {
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
  authRequired: (): ApiError =>
    new ApiError(ErrorCodes.AUTH_REQUIRED, 'Authentication required'),

  invalidToken: (): ApiError =>
    new ApiError(ErrorCodes.AUTH_INVALID_TOKEN, 'Invalid authentication token'),

  tokenExpired: (): ApiError =>
    new ApiError(ErrorCodes.AUTH_TOKEN_EXPIRED, 'Authentication token has expired'),

  forbidden: (message: string = 'Insufficient permissions'): ApiError =>
    new ApiError(ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, message),

  validationFailed: (details: ErrorDetails): ApiError =>
    new ApiError(ErrorCodes.VALIDATION_FAILED, 'Validation failed', details),

  missingField: (field: string): ApiError =>
    new ApiError(
      ErrorCodes.VALIDATION_MISSING_FIELD,
      `Missing required field: ${field}`,
      { field }
    ),

  invalidFormat: (field: string, expected: string): ApiError =>
    new ApiError(
      ErrorCodes.VALIDATION_INVALID_FORMAT,
      `Invalid format for field: ${field}`,
      { field, expected }
    ),

  notFound: (resource: string = 'Resource'): ApiError =>
    new ApiError(ErrorCodes.NOT_FOUND, `${resource} not found`),

  switchNotFound: (switchId: string): ApiError =>
    new ApiError(
      ErrorCodes.SWITCH_NOT_FOUND,
      'Switch not found',
      { switchId }
    ),

  userNotFound: (userId: string): ApiError =>
    new ApiError(
      ErrorCodes.USER_NOT_FOUND,
      'User not found',
      { userId }
    ),

  guardianNotFound: (guardianId: string): ApiError =>
    new ApiError(
      ErrorCodes.GUARDIAN_NOT_FOUND,
      'Guardian not found',
      { guardianId }
    ),

  switchAlreadyTriggered: (switchId: string): ApiError =>
    new ApiError(
      ErrorCodes.SWITCH_ALREADY_TRIGGERED,
      'Switch has already been triggered',
      { switchId }
    ),

  duplicate: (field: string): ApiError =>
    new ApiError(
      ErrorCodes.DUPLICATE_ENTRY,
      `Duplicate entry for: ${field}`,
      { field }
    ),

  rateLimited: (retryAfter: number): ApiError =>
    new ApiError(
      ErrorCodes.RATE_LIMITED,
      'Too many requests, please try again later',
      { retryAfter }
    ),

  internal: (message: string = 'Internal server error'): ApiError =>
    new ApiError(ErrorCodes.INTERNAL_ERROR, message),

  database: (message: string = 'Database error'): ApiError =>
    new ApiError(ErrorCodes.DATABASE_ERROR, message),

  crypto: (message: string = 'Cryptographic operation failed'): ApiError =>
    new ApiError(ErrorCodes.CRYPTO_ERROR, message),

  nostr: (message: string = 'Nostr relay error'): ApiError =>
    new ApiError(ErrorCodes.NOSTR_ERROR, message),

  bitcoin: (message: string = 'Bitcoin network error'): ApiError =>
    new ApiError(ErrorCodes.BITCOIN_ERROR, message),

  serviceUnavailable: (service: string = 'Service'): ApiError =>
    new ApiError(
      ErrorCodes.SERVICE_UNAVAILABLE,
      `${service} is temporarily unavailable`
    ),

  relayUnavailable: (): ApiError =>
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
