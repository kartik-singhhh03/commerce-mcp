/**
 * HTTP transport for the Commerce Operations MCP server.
 *
 * Design decisions:
 * 1. `createMcpHandler` — official SDK v2 Streamable HTTP entry; fresh McpServer per request (stateless).
 * 2. `toNodeHandler` — adapts handler.fetch to node:http (no Express/Hono).
 * 3. MCP only at `/mcp` (POST/GET/DELETE per Streamable HTTP).
 * 4. `GET /health` — sole non-MCP route for Railway; skips Host/Origin guards.
 * 5. SDK host/origin guards on `/mcp` (DNS rebinding / browser Origin).
 * 6. Allowed hosts = localhost + `ALLOWED_HOSTS` + `RAILWAY_PUBLIC_DOMAIN`.
 * 7. Bind `0.0.0.0` on Railway/production so the platform proxy can reach the process.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import { createMcpHandler, localhostAllowedHostnames } from '@modelcontextprotocol/server';
import { createCommerceOpsServer } from './server.js';
import { getStore, type CommerceStore } from './store/index.js';

export type CreateHttpServerOptions = {
  host?: string;
  allowedHosts?: readonly string[];
  /** Shared store for all per-request MCP server instances (defaults to getStore()). */
  store?: CommerceStore;
};

export type HttpServer = {
  readonly server: Server;
  readonly mcpHandler: ReturnType<typeof createMcpHandler>;
  listen: (port?: number) => Promise<{ host: string; port: number }>;
  close: () => Promise<void>;
};

/** Host allow-list for `/mcp` (port-agnostic). */
export function resolveAllowedHosts(extra: readonly string[] = []): string[] {
  const fromEnv =
    process.env.ALLOWED_HOSTS?.split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0) ?? [];
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  return [
    ...new Set([
      ...localhostAllowedHostnames(),
      ...fromEnv,
      ...(railway ? [railway] : []),
      ...extra,
    ]),
  ];
}

/** All-interfaces on Railway/production; loopback for local dev. */
export function resolveListenHost(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.HOST) return process.env.HOST;
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') return '0.0.0.0';
  return '127.0.0.1';
}

/** Creates HTTP server mounting `/health` and stateless Streamable HTTP `/mcp`. */
export function createHttpServer(options: CreateHttpServerOptions = {}): HttpServer {
  const store = options.store ?? getStore();
  const mcpHandler = createMcpHandler(() => createCommerceOpsServer({ store }));
  const nodeHandler = toNodeHandler(mcpHandler);
  const allowedHosts = resolveAllowedHosts(options.allowedHosts ?? []);
  const validateHost = hostHeaderValidation(allowedHosts);
  const validateOrigin = originValidation(allowedHosts);
  const listenHost = resolveListenHost(options.host);

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;

    if (pathname === '/health') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET', 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/mcp') {
      // Guards write 403 themselves when they reject.
      if (!validateHost(req, res) || !validateOrigin(req, res)) return;
      // exactOptionalPropertyTypes: Node IncomingMessage is a structural superset of the adapter type.
      void nodeHandler(
        req as Parameters<typeof nodeHandler>[0],
        res as Parameters<typeof nodeHandler>[1],
      );
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return {
    server,
    mcpHandler,
    listen(port = Number(process.env.PORT ?? 3000)): Promise<{ host: string; port: number }> {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, listenHost, () => {
          server.off('error', reject);
          const address = server.address();
          const boundPort =
            typeof address === 'object' && address !== null ? address.port : port;
          resolve({ host: listenHost, port: boundPort });
        });
      });
    },
    async close(): Promise<void> {
      await mcpHandler.close();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
