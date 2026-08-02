/**
 * MCP server factory.
 *
 * Builds a fresh McpServer per call (required for stateless createMcpHandler).
 * Tools are thin adapters; all business logic lives in services.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { createServices } from './services/index.js';
import { getStore, type CommerceStore } from './store/index.js';
import { registerAllTools } from './tools/index.js';

export type CreateCommerceOpsServerOptions = {
  /** Store instance. Defaults to the process-wide validated store. */
  store?: CommerceStore;
};

/**
 * Creates a Commerce Operations Copilot MCP server with all tools registered.
 * Call once per HTTP request when using createMcpHandler.
 */
export function createCommerceOpsServer(
  options: CreateCommerceOpsServerOptions = {},
): McpServer {
  const store = options.store ?? getStore();
  const services = createServices(store);

  const server = new McpServer({
    name: 'commerce-ops-mcp',
    version: '0.1.0',
  });

  registerAllTools(server, services);
  return server;
}
