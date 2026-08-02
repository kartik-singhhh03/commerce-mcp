import type { McpServer } from '@modelcontextprotocol/server';
import {
  getInventoryStatusInputSchema,
  getInventoryStatusOutputSchema,
} from '../schemas/index.js';
import type { InventoryService } from '../services/inventory.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_inventory_status — thin adapter over InventoryService.
 */
export function registerGetInventoryStatus(
  server: McpServer,
  inventory: InventoryService,
): void {
  server.registerTool(
    'get_inventory_status',
    {
      title: 'Get Inventory Status',
      description: [
        'Retrieve inventory reservation and stock information for an order.',
        '',
        'Use this tool to determine whether inventory shortages, partial reservations,',
        'or pick-blocking problems exist for the order\'s SKUs.',
        '',
        'Typical investigation sequence: get_order → get_inventory_status (often in',
        'parallel with payment / warehouse / shipment checks).',
        '',
        'Returns per-SKU reservations (requested/reserved/picked quantities, pickStatus,',
        'block reasons) plus related on-hand stock rows at the assigned warehouse.',
        '',
        'Do NOT use this tool for carrier tracking — call get_shipment_status instead.',
      ].join('\n'),
      inputSchema: getInventoryStatusInputSchema,
      outputSchema: getInventoryStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orderId }) => {
      try {
        const status = inventory.getInventoryStatus(orderId);
        return toolSuccess({
          orderId: status.orderId,
          warehouseId: status.warehouseId,
          reservations: [...status.reservations],
          stock: [...status.stock],
          order: status.order,
        });
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
