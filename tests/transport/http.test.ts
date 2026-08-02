import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpServer, type HttpServer } from '../../src/transport.js';

describe('HTTP transport', () => {
  const servers: HttpServer[] = [];

  afterEach(async () => {
    while (servers.length > 0) {
      const current = servers.pop();
      if (current) {
        await current.close();
      }
    }
  });

  async function start(): Promise<{ baseUrl: string; http: HttpServer }> {
    const http = createHttpServer({
      host: '127.0.0.1',
      allowedHosts: ['127.0.0.1', 'localhost'],
    });
    servers.push(http);
    const { port } = await http.listen(0);
    return { baseUrl: `http://127.0.0.1:${port}`, http };
  }

  it('GET /health returns { ok: true }', async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('rejects non-GET /health with 405', async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/health`, { method: 'POST' });
    expect(response.status).toBe(405);
  });

  it('returns 404 for unknown routes', async () => {
    const { baseUrl } = await start();
    const response = await fetch(`${baseUrl}/nope`);
    expect(response.status).toBe(404);
  });

  it('serves stateless Streamable HTTP MCP at /mcp', async () => {
    const { baseUrl } = await start();
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    const client = new Client({ name: 'transport-test', version: '1.0.0' });
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain('get_order');

    const result = await client.callTool({
      name: 'get_order',
      arguments: { orderId: '#1234' },
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ orderId: '1234' });

    await client.close();
  });
});
