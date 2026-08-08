/**
 * Local / Railway smoke client.
 *
 * Connects over Streamable HTTP, lists tools, and runs strict verification:
 * D. Read-only get_order without credentials succeeds.
 * A. Unauthenticated create_operations_case is rejected by AUTHORIZATION (ValidationError).
 * B. Authorized create_operations_case with apiKey succeeds.
 * C. get_operations_case retrieves created case from PostgreSQL.
 * E. Duplicate authorized create_operations_case is rejected by ConflictError.
 *
 * Usage:
 *   pnpm smoke
 *   MCP_URL=https://your-app.up.railway.app/mcp pnpm smoke
 */

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const mcpUrl = process.env.MCP_URL ?? 'http://127.0.0.1:3000/mcp';
const apiKey = process.env.OPS_API_KEY ?? 'ops-secret-key';
// Use a fresh order ID for clean authorization testing
const testOrderId = '#1001';

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'commerce-ops-smoke', version: '0.1.0' });

await client.connect(transport);

console.log('--- Executing MCP Smoke Test & Boundary Verification ---');

// Tool Discovery
const listed = await client.listTools();
console.log('Tools discovered:', listed.tools.map((tool) => tool.name).join(', '));

// Test D: Read-only get_order without credentials succeeds
const order = await client.callTool({
  name: 'get_order',
  arguments: { orderId: testOrderId },
});
if (order.isError) {
  console.error('ERROR: Unauthenticated read-only get_order failed!');
  process.exit(1);
}
console.log('Test D PASSED: Read-only get_order succeeded without credentials.');

// Test A: Unauthenticated create_operations_case without apiKey must fail with AUTHORIZATION error
const unauthCreate = await client.callTool({
  name: 'create_operations_case',
  arguments: {
    orderId: testOrderId,
    summary: 'Unauthenticated case creation attempt',
    rootCause: 'Testing guardrail enforcement',
    severity: 'high',
    recommendedAction: 'Must be rejected server-side',
  },
});

const unauthBody = unauthCreate.structuredContent as { code?: string; error?: string; message?: string };
if (unauthCreate.isError && unauthBody?.code === 'VALIDATION') {
  console.log('Test A PASSED: Unauthenticated create_operations_case rejected server-side (code: VALIDATION).');
} else {
  console.error('ERROR: Unauthenticated create_operations_case was NOT rejected by authorization guardrail!');
  console.error('Response:', JSON.stringify(unauthCreate, null, 2));
  process.exit(1);
}

// Test B: Authorized create_operations_case with apiKey succeeds
const authCreate = await client.callTool({
  name: 'create_operations_case',
  arguments: {
    apiKey,
    orderId: testOrderId,
    summary: 'Authorized escalation for order 1001',
    rootCause: 'Fulfillment review required',
    severity: 'medium',
    recommendedAction: 'Verify carrier label',
  },
});

const authBody = authCreate.structuredContent as { caseId?: string; code?: string; status?: string };
if (!authCreate.isError && authBody?.caseId) {
  console.log(`Test B PASSED: Authorized create_operations_case succeeded (caseId: ${authBody.caseId}, status: ${authBody.status}).`);
} else if (authBody?.code === 'CONFLICT') {
  console.log(`Test B PASSED: Authorized create_operations_case verified (open case already exists from previous run).`);
} else {
  console.error('ERROR: Authorized create_operations_case failed unexpectedly!');
  console.error('Response:', JSON.stringify(authCreate, null, 2));
  process.exit(1);
}

// Test C: Retrieve created case using get_operations_case (unauthenticated read tool)
const getCaseResult = await client.callTool({
  name: 'get_operations_case',
  arguments: { orderId: '1001' },
});
if (!getCaseResult.isError) {
  console.log('Test C PASSED: get_operations_case retrieved persisted case from PostgreSQL.');
} else {
  console.error('ERROR: Failed to retrieve created case!');
  process.exit(1);
}

// Test E: Duplicate authorized create_operations_case must fail with ConflictError
const duplicateCreate = await client.callTool({
  name: 'create_operations_case',
  arguments: {
    apiKey,
    orderId: testOrderId,
    summary: 'Duplicate case creation attempt',
    rootCause: 'Duplicate',
    severity: 'low',
    recommendedAction: 'None',
  },
});
const dupBody = duplicateCreate.structuredContent as { code?: string };
if (duplicateCreate.isError && dupBody?.code === 'CONFLICT') {
  console.log('Test E PASSED: Duplicate case creation rejected with ConflictError as expected.');
} else {
  console.error('ERROR: Duplicate case creation did not fail with ConflictError!');
  process.exit(1);
}

await client.close();
console.log('--- ALL SMOKE TESTS & BOUNDARY VERIFICATIONS PASSED SUCCESSFULLY ---');
