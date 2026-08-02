import type { McpServer } from '@modelcontextprotocol/server';
import {
  getShipmentStatusInputSchema,
  getShipmentStatusOutputSchema,
} from '../schemas/index.js';
import type { ShipmentService } from '../services/shipments.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_shipment_status — thin adapter over ShipmentService.
 */
export function registerGetShipmentStatus(
  server: McpServer,
  shipments: ShipmentService,
): void {
  server.registerTool(
    'get_shipment_status',
    {
      title: 'Get Shipment Status',
      description: [
        'Retrieve the shipment lifecycle for a commerce order.',
        '',
        'Use this tool to determine whether a shipment exists and its current state',
        '(not created, label purchased, shipped, in transit, delivered, exception,',
        'returned, or voided).',
        '',
        'If hasShipment is false and status is "not_created", no shipment row exists yet',
        '— investigate payment, inventory, and warehouse tools for upstream blockers.',
        '',
        'Returns all shipment rows for the order plus a primaryShipment selection when',
        'multiple packages or labels are present.',
        '',
        'Do NOT use this tool as a substitute for get_order metadata.',
      ].join('\n'),
      inputSchema: getShipmentStatusInputSchema,
      outputSchema: getShipmentStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orderId }) => {
      try {
        const status = shipments.getShipmentStatus(orderId);
        return toolSuccess({
          orderId: status.orderId,
          hasShipment: status.hasShipment,
          status: status.status,
          shipments: [...status.shipments],
          primaryShipment: status.primaryShipment ?? null,
        });
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
