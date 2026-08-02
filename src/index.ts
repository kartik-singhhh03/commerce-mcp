/**
 * Application bootstrap only.
 *
 * Loads the validated store, starts Streamable HTTP transport, logs listen info,
 * and shuts down cleanly on SIGINT/SIGTERM.
 *
 * Does NOT register tools, define HTTP routes, or contain business logic.
 * Services are constructed per MCP request inside createCommerceOpsServer (stateless).
 */

import { getStore } from './store/index.js';
import { createHttpServer } from './transport.js';

const store = (() => {
  try {
    return getStore();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Commerce Ops MCP failed to start:\n${message}`);
    process.exit(1);
  }
})();

const port = Number(process.env.PORT ?? 3000);
const httpServer = createHttpServer({ store });

const bound = await httpServer.listen(port);
console.error(`commerce-ops-mcp listening on http://${bound.host}:${bound.port}`);
console.error(`health  GET  /health`);
console.error(`mcp     /mcp  (Streamable HTTP, stateless)`);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`received ${signal}; shutting down`);
  try {
    await httpServer.close();
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
