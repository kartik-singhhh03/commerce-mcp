/**
 * Process entrypoint.
 *
 * Responsibility:
 * - Read env (PORT)
 * - Start the Node HTTP server that mounts /health and /mcp
 * - Handle graceful shutdown
 *
 * Does NOT:
 * - Register MCP tools
 * - Contain commerce business logic
 */

// TODO: Import createHttpServer from ./transport.js and listen on process.env.PORT ?? 3000.
// TODO: Wire SIGINT/SIGTERM to close the MCP handler and HTTP server cleanly.

export {};
