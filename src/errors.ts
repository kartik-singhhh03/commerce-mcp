/**
 * Typed application errors and MCP error mapping.
 *
 * Responsibility:
 * - Define NotFoundError, ValidationError, ConflictError
 * - Map domain errors to MCP tool error results (isError / structured content)
 *
 * Does NOT:
 * - Perform lookups or mutations
 */

// TODO: Export AppError base class and concrete subclasses
// TODO: Export toToolErrorResult(error): CallToolResult helper for thin tools

export {};
