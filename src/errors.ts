/**
 * Typed application errors for the service layer.
 *
 * MCP tools may map these later; services throw them directly.
 */

export type AppErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT';

export type AppErrorDetails = Readonly<Record<string, string | number | boolean | null>>;

/**
 * Base error for all domain failures.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details: AppErrorDetails | undefined;

  constructor(code: AppErrorCode, message: string, details?: AppErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when input fails schema or domain validation.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super('VALIDATION', message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when a requested entity does not exist.
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when an operation violates a uniqueness or state constraint.
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: AppErrorDetails) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Type guard for AppError (and subclasses).
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
