import type { McpServer } from '@modelcontextprotocol/server';
import {
  getPaymentStatusInputSchema,
  getPaymentStatusOutputSchema,
} from '../schemas/index.js';
import type { PaymentService } from '../services/payments.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_payment_status — thin adapter over PaymentService.
 */
export function registerGetPaymentStatus(server: McpServer, payments: PaymentService): void {
  server.registerTool(
    'get_payment_status',
    {
      title: 'Get Payment Status',
      description: [
        'Retrieve the payment / capture state for a commerce order.',
        '',
        'Use this tool when determining whether fulfillment is blocked by payment —',
        'for example failed charges, authorized-but-not-captured funds, refunds, or',
        'pending fraud review.',
        '',
        'Call get_order first so you know the order exists and have customer context.',
        '',
        'Returns provider, method, status, authorization/capture timestamps, amount,',
        'failure codes (if any), and fraud review status.',
        '',
        'Do NOT use this tool to inspect inventory or warehouse health.',
      ].join('\n'),
      inputSchema: getPaymentStatusInputSchema,
      outputSchema: getPaymentStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ orderId }) => {
      try {
        const payment = payments.getPaymentStatus(orderId);
        return toolSuccess(payment);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
