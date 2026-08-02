import type { McpServer } from '@modelcontextprotocol/server';
import {
  getOperationsCaseInputSchema,
  getOperationsCaseOutputSchema,
} from '../schemas/index.js';
import type { OperationsCaseService } from '../services/cases.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers get_operations_case — thin adapter over OperationsCaseService.
 */
export function registerGetOperationsCase(
  server: McpServer,
  cases: OperationsCaseService,
): void {
  server.registerTool(
    'get_operations_case',
    {
      title: 'Get Operations Case',
      description: [
        'Retrieve an existing operations escalation case.',
        '',
        'Use this after a case has already been created (for example to confirm caseId',
        'OPS-0001 or to re-read the case linked to an order in a later turn).',
        '',
        'Provide caseId when known. Otherwise provide orderId to look up the preferred',
        'case for that order (open cases are preferred over closed ones).',
        '',
        'Do NOT use this tool to create a new case — call create_operations_case instead.',
        'Do NOT use this tool as a substitute for investigating payment/inventory/shipment.',
      ].join('\n'),
      inputSchema: getOperationsCaseInputSchema,
      outputSchema: getOperationsCaseOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const opsCase = cases.getCase({
          ...(args.caseId !== undefined ? { caseId: args.caseId } : {}),
          ...(args.orderId !== undefined ? { orderId: args.orderId } : {}),
        });
        return toolSuccess(opsCase);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
