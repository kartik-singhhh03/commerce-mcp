import { isAppError } from '../errors.js';

/**
 * Successful MCP tool result with dual text + structured content.
 */
export function toolSuccess<T extends Record<string, unknown>>(data: T): {
  content: [{ type: 'text'; text: string }];
  structuredContent: T;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export type ToolErrorBody = {
  error: string;
  code: 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';
  message: string;
  details: Readonly<Record<string, string | number | boolean | null>> | null;
};

/**
 * Maps domain/unknown errors to an MCP tool error result.
 * Never includes stack traces.
 */
export function toolFailure(error: unknown): {
  content: [{ type: 'text'; text: string }];
  structuredContent: ToolErrorBody;
  isError: true;
} {
  const body: ToolErrorBody = isAppError(error)
    ? {
        error: error.name,
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      }
    : {
        error: 'InternalError',
        code: 'INTERNAL',
        message: 'An unexpected error occurred while executing the tool.',
        details: null,
      };

  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    structuredContent: body,
    isError: true,
  };
}
