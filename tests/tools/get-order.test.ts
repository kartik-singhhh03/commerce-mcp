import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it } from 'vitest';
import { createCommerceOpsServer } from '../../src/server.js';
import {
  createStore,
  getPrismaClient,
  resetOperationsCaseStoreForTests,
  resetPrismaClientForTests,
  type CommerceStore,
} from '../../src/store/index.js';

type McpHandler = ReturnType<typeof createMcpHandler>;
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const itWithPostgres = databaseUrl ? it : it.skip;

async function connectClient(store: CommerceStore): Promise<{
  client: Client;
  handler: McpHandler;
}> {
  const handler = createMcpHandler(() => createCommerceOpsServer({ store }));
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1/mcp'), {
    fetch: async (input, init) => handler.fetch(new Request(input, init)),
  });
  const client = new Client({ name: 'vitest-client', version: '1.0.0' });
  await client.connect(transport);
  return { client, handler };
}

describe('MCP tools', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) {
        await cleanup();
      }
    }
  });

  async function withClient() {
    const store = createStore();
    const { client, handler } = await connectClient(store);
    cleanups.push(async () => {
      await client.close();
      await handler.close();
    });
    return { client, store };
  }

  async function resetCaseStorage(): Promise<void> {
    if (!databaseUrl) return;
    process.env.DATABASE_URL = databaseUrl;
    resetOperationsCaseStoreForTests();
    const prisma = getPrismaClient({ databaseUrl });
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OperationCase" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "summary" TEXT NOT NULL,
        "rootCause" TEXT NOT NULL,
        "severity" TEXT NOT NULL,
        "recommendedAction" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "warehouseId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "OperationCase_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.operationCase.deleteMany();
  }

  it('lists all eight commerce tools with descriptions', async () => {
    const { client } = await withClient();
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);

    expect(names).toEqual([
      'get_order',
      'get_payment_status',
      'get_inventory_status',
      'get_warehouse_status',
      'get_shipment_status',
      'create_operations_case',
      'get_operations_case',
      'list_open_operations_cases',
    ]);

    for (const tool of listed.tools) {
      expect(tool.description?.length ?? 0).toBeGreaterThan(40);
      expect(tool.title).toBeTruthy();
    }
  });

  it('get_order returns structured content for #1234', async () => {
    const { client } = await withClient();
    const result = await client.callTool({
      name: 'get_order',
      arguments: { orderId: '#1234' },
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      orderId: '1234',
      status: 'confirmed',
      warehouseId: 'WH-EAST',
    });
  });

  it('investigation tools surface the demo blockers for order 1234', async () => {
    const { client } = await withClient();

    const payment = await client.callTool({
      name: 'get_payment_status',
      arguments: { orderId: '1234' },
    });
    const inventory = await client.callTool({
      name: 'get_inventory_status',
      arguments: { orderId: '1234' },
    });
    const warehouse = await client.callTool({
      name: 'get_warehouse_status',
      arguments: { orderId: '1234' },
    });
    const shipment = await client.callTool({
      name: 'get_shipment_status',
      arguments: { orderId: '1234' },
    });

    expect(payment.structuredContent).toMatchObject({ status: 'captured' });
    expect(inventory.structuredContent).toMatchObject({
      orderId: '1234',
      warehouseId: 'WH-EAST',
    });
    const inventoryData = inventory.structuredContent as {
      reservations: Array<{ pickStatus: string }>;
    };
    expect(inventoryData.reservations.every((r) => r.pickStatus === 'pick_blocked')).toBe(true);

    expect(warehouse.structuredContent).toMatchObject({
      warehouse: { status: 'degraded' },
    });
    expect(shipment.structuredContent).toMatchObject({
      hasShipment: false,
      status: 'not_created',
    });
  });

  itWithPostgres('create_operations_case guardrail and get_operations_case round-trip', async () => {
    await resetCaseStorage();
    const { client } = await withClient();

    // 1. Unauthenticated creation attempt without apiKey must fail
    const unauthResult = await client.callTool({
      name: 'create_operations_case',
      arguments: {
        orderId: '#1234',
        summary: 'Order has not shipped',
        rootCause: 'Pick blocked while WH-EAST is degraded',
        severity: 'high',
        recommendedAction: 'Clear pick zone B or reallocate inventory',
      },
    });

    expect(unauthResult.isError).toBe(true);
    expect(unauthResult.structuredContent).toMatchObject({
      code: 'VALIDATION',
      error: 'ValidationError',
    });

    // 2. Authorized creation with apiKey succeeds
    const created = await client.callTool({
      name: 'create_operations_case',
      arguments: {
        apiKey: 'ops-secret-key',
        orderId: '#1234',
        summary: 'Order has not shipped',
        rootCause: 'Pick blocked while WH-EAST is degraded',
        severity: 'high',
        recommendedAction: 'Clear pick zone B or reallocate inventory',
      },
    });

    expect(created.isError).toBeUndefined();
    expect(created.structuredContent).toMatchObject({
      caseId: 'OPS-0001',
      status: 'open',
      orderId: '1234',
    });

    // 3. Read-only tool get_operations_case works without apiKey
    const fetched = await client.callTool({
      name: 'get_operations_case',
      arguments: { orderId: '1234' },
    });

    expect(fetched.structuredContent).toMatchObject({
      caseId: 'OPS-0001',
      status: 'open',
    });

    // 4. Read-only tool list_open_operations_cases works without apiKey
    const listed = await client.callTool({
      name: 'list_open_operations_cases',
      arguments: { warehouseId: 'WH-EAST' },
    });
    expect(listed.structuredContent).toMatchObject({
      count: 1,
      cases: [{ caseId: 'OPS-0001' }],
    });

    await resetPrismaClientForTests();
    resetOperationsCaseStoreForTests();
  });

  it('returns MCP-friendly errors without stack traces for missing orders', async () => {
    const { client } = await withClient();
    const result = await client.callTool({
      name: 'get_order',
      arguments: { orderId: '999999' },
    });

    expect(result.isError).toBe(true);
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/at Object\./);
    expect(text).not.toMatch(/stack/i);
    expect(result.structuredContent).toMatchObject({
      code: 'NOT_FOUND',
      error: 'NotFoundError',
    });
  });
});
