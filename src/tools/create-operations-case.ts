import type { McpServer } from '@modelcontextprotocol/server';
import {
  createOperationsCaseInputSchema,
  createOperationsCaseOutputSchema,
} from '../schemas/index.js';
import type { OperationsCaseService } from '../services/cases.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers create_operations_case — thin adapter over OperationsCaseService.
 */
export function registerCreateOperationsCase(
  server: McpServer,
  cases: OperationsCaseService,
): void {
  server.registerTool(
    'create_operations_case',
    {
      title: 'Create Operations Case',
      description: [
        'Create an operational escalation case for a commerce order.',
        '',
        'Use ONLY after sufficient investigation has been completed using the read tools',
        '(get_order, get_payment_status, get_inventory_status, get_warehouse_status,',
        'get_shipment_status). The AI must supply summary, rootCause, severity, and',
        'recommendedAction based on evidence already gathered.',
        '',
        'This tool does NOT investigate or decide root cause — it only persists the case',
        'you provide. Duplicate OPEN cases for the same order are rejected.',
        '',
        'Returns caseId (e.g. OPS-0001), status, createdAt, and the stored case fields.',
      ].join('\n'),
      inputSchema: createOperationsCaseInputSchema,
      outputSchema: createOperationsCaseOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const opsCase = cases.createCase(args);
        return toolSuccess({
          caseId: opsCase.caseId,
          status: opsCase.status,
          createdAt: opsCase.createdAt,
          orderId: opsCase.orderId,
          summary: opsCase.summary,
          rootCause: opsCase.rootCause,
          severity: opsCase.severity,
          recommendedAction: opsCase.recommendedAction,
          updatedAt: opsCase.updatedAt,
          createdBy: opsCase.createdBy,
        });
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
