/**
 * HTTP + Streamable HTTP transport wiring.
 *
 * Responsibility:
 * - Create a node:http server
 * - Expose GET /health (only non-MCP HTTP route)
 * - Mount MCP at /mcp via createMcpHandler + toNodeHandler
 * - Apply Host/Origin validation appropriate for local vs Railway
 *
 * Official SDK (v2, stateless):
 *   import { createMcpHandler } from '@modelcontextprotocol/server';
 *   import { toNodeHandler } from '@modelcontextprotocol/node';
 *
 * Does NOT:
 * - Expose a REST commerce API
 * - Use Express controllers
 * - Contain business logic
 */

// TODO: Export createHttpServer() that returns { server, close }
// TODO: createMcpHandler(() => createCommerceOpsServer()) — factory per request
// TODO: Route: /health → JSON { ok: true }; /mcp → nodeHandler; else 404
// TODO: Document Railway: bind 0.0.0.0 and listen on process.env.PORT

export {};
