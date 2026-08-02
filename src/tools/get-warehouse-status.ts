import type { McpServer } from '@modelcontextprotocol/server';
import {
  getWarehouseStatusInputSchema,
  getWarehouseStatusOutputSchema,
} from '../schemas/index.js';
import type { WarehouseService } from '../services/warehouses.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_warehouse_status — thin adapter over WarehouseService.
 */
export function registerGetWarehouseStatus(
  server: McpServer,
  warehouses: WarehouseService,
): void {
  server.registerTool(
    'get_warehouse_status',
    {
      title: 'Get Warehouse Status',
      description: [
        'Retrieve warehouse operational health and recent facility events.',
        '',
        'Use this tool to identify warehouse outages, degradation, SLA risk, staffing',
        'issues, equipment faults, or other fulfillment bottlenecks at a facility.',
        '',
        'During an order investigation, pass orderId so the tool resolves the order\'s',
        'assigned warehouse automatically. Pass warehouseId when you already know the',
        'facility (warehouseId takes precedence if both are provided).',
        '',
        'Returns warehouse status, capacity utilization, SLA risk, and active/resolved',
        'events (with zone, severity, and impact codes).',
        '',
        'Do NOT use this tool to check whether a shipment label exists — call',
        'get_shipment_status for that.',
      ].join('\n'),
      inputSchema: getWarehouseStatusInputSchema,
      outputSchema: getWarehouseStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const status = warehouses.getWarehouseStatus({
          ...(args.orderId !== undefined ? { orderId: args.orderId } : {}),
          ...(args.warehouseId !== undefined ? { warehouseId: args.warehouseId } : {}),
        });
        return toolSuccess({
          warehouseId: status.warehouseId,
          warehouse: status.warehouse,
          events: [...status.events],
          activeEvents: [...status.activeEvents],
          resolvedFromOrderId: status.resolvedFromOrderId ?? null,
        });
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
