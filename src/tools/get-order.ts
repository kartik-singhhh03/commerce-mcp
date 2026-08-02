import type { McpServer } from '@modelcontextprotocol/server';
import {
  getOrderInputSchema,
  getOrderOutputSchema,
} from '../schemas/index.js';
import type { OrderService } from '../services/orders.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_order — thin adapter over OrderService.
 */
export function registerGetOrder(server: McpServer, orders: OrderService): void {
  server.registerTool(
    'get_order',
    {
      title: 'Get Order',
      description: [
        'Retrieve the canonical order record for a commerce order.',
        '',
        'Use this tool whenever you need order metadata before investigating payment,',
        'inventory, warehouse, or fulfillment issues.',
        '',
        'This tool should typically be the FIRST tool called during an investigation.',
        '',
        'Returns customer details, line items, assigned warehouse, timestamps, holds,',
        'tags, and overall order / fulfillment state.',
        '',
        'Do NOT use this tool for shipment tracking — call get_shipment_status instead.',
        'Do NOT use this tool for payment capture state — call get_payment_status instead.',
      ].join('\n'),
      inputSchema: getOrderInputSchema,
      outputSchema: getOrderOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orderId }) => {
      try {
        const order = orders.getOrder(orderId);
        return toolSuccess(order);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
