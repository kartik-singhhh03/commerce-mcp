import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const mcpUrl = process.env.MCP_URL ?? 'http://127.0.0.1:3457/mcp';
const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
const client = new Client({ name: 'inspector-followup', version: '1.0.0' });
await client.connect(transport);

const shipment = await client.callTool({
  name: 'get_shipment_status',
  arguments: { orderId: '1234' },
});
const missing = await client.callTool({
  name: 'get_order',
  arguments: { orderId: '999999' },
});
const warehouse = await client.callTool({
  name: 'get_warehouse_status',
  arguments: { orderId: '1234' },
});

console.log(
  JSON.stringify(
    {
      shipment: {
        isError: shipment.isError ?? false,
        structuredContent: shipment.structuredContent,
      },
      missingOrder: {
        isError: missing.isError ?? false,
        structuredContent: missing.structuredContent,
      },
      warehouse: {
        isError: warehouse.isError ?? false,
        status: (warehouse.structuredContent as { warehouse?: { status?: string } } | undefined)
          ?.warehouse?.status,
      },
    },
    null,
    2,
  ),
);

await client.close();
