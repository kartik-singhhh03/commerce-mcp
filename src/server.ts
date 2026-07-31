/**
 * MCP server factory.
 *
 * Responsibility:
 * - Construct a fresh McpServer per request (stateless factory for createMcpHandler)
 * - Register all commerce operations tools
 *
 * Does NOT:
 * - Speak HTTP / Streamable HTTP transport details
 * - Implement domain lookups (tools → services)
 *
 * Official SDK (v2):
 *   import { McpServer } from '@modelcontextprotocol/server';
 */

// TODO: Export createCommerceOpsServer(): McpServer
// TODO: Inside the factory, call register* helpers from ./tools/*
// TODO: Never reuse a singleton McpServer across requests (createMcpHandler requires fresh instances).

export {};
