/**
 * Local / Railway smoke client.
 *
 * Connects over Streamable HTTP, lists tools, and exercises the demo order path.
 *
 * Usage:
 *   pnpm smoke
 *   MCP_URL=https://your-app.up.railway.app/mcp pnpm smoke
 */

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const mcpUrl = process.env.MCP_URL ?? 'http://127.0.0.1:3000/mcp';

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'commerce-ops-smoke', version: '0.1.0' });

await client.connect(transport);

const listed = await client.listTools();
console.log(
  'tools:',
  listed.tools.map((tool) => tool.name).join(', '),
);

const order = await client.callTool({
  name: 'get_order',
  arguments: { orderId: '#1234' },
});
console.log('get_order:', JSON.stringify(order.structuredContent, null, 2));

const shipment = await client.callTool({
  name: 'get_shipment_status',
  arguments: { orderId: '1234' },
});
console.log('get_shipment_status:', JSON.stringify(shipment.structuredContent, null, 2));

const openCases = await client.callTool({
  name: 'list_open_operations_cases',
  arguments: {},
});
console.log('list_open_operations_cases:', JSON.stringify(openCases.structuredContent, null, 2));

await client.close();
console.log('smoke ok');
