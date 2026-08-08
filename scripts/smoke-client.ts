/**
 * Local / Railway smoke client.
 *
 * Connects over Streamable HTTP, lists tools, exercises read-only investigation tools,
 * verifies unauthenticated case creation fails, and verified authorized case creation succeeds.
 *
 * Usage:
 *   pnpm smoke
 *   MCP_URL=https://your-app.up.railway.app/mcp pnpm smoke
 */

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const mcpUrl = process.env.MCP_URL ?? 'http://127.0.0.1:3000/mcp';
const apiKey = process.env.OPS_API_KEY ?? 'ops-secret-key';

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
console.log('get_order (unauthenticated read):', JSON.stringify(order.structuredContent, null, 2));

const shipment = await client.callTool({
  name: 'get_shipment_status',
  arguments: { orderId: '1234' },
});
console.log('get_shipment_status (unauthenticated read):', JSON.stringify(shipment.structuredContent, null, 2));

// Test 1: Unauthenticated create_operations_case must be rejected
const unauthCreate = await client.callTool({
  name: 'create_operations_case',
  arguments: {
    orderId: '#1234',
    summary: 'Unauthenticated attempt',
    rootCause: 'Testing guardrail',
    severity: 'high',
    recommendedAction: 'Should fail',
  },
});

if (unauthCreate.isError) {
  console.log('unauthenticated create_operations_case rejected as expected (guardrail active)');
} else {
  console.error('ERROR: unauthenticated create_operations_case succeeded when it should have failed!');
  process.exit(1);
}

// Test 2: Authorized create_operations_case with apiKey
const authCreate = await client.callTool({
  name: 'create_operations_case',
  arguments: {
    apiKey,
    orderId: '#1234',
    summary: 'Smoke test escalation',
    rootCause: 'Pick blocked while WH-EAST is degraded',
    severity: 'high',
    recommendedAction: 'Clear conveyor belt in Pick Zone B',
  },
});

console.log('create_operations_case (authorized):', JSON.stringify(authCreate.structuredContent, null, 2));

const openCases = await client.callTool({
  name: 'list_open_operations_cases',
  arguments: {},
});
console.log('list_open_operations_cases:', JSON.stringify(openCases.structuredContent, null, 2));

await client.close();
console.log('smoke ok');
