import type { McpServer } from '@modelcontextprotocol/server';
import {
  listOpenOperationsCasesInputSchema,
  listOpenOperationsCasesOutputSchema,
} from '../schemas/index.js';
import type { OperationsCaseService } from '../services/cases.js';
import { toolFailure, toolSuccess } from './helpers.js';

/**
 * Registers list_open_operations_cases — thin adapter over OperationsCaseService.
 */
export function registerListOpenOperationsCases(
  server: McpServer,
  cases: OperationsCaseService,
): void {
  server.registerTool(
    'list_open_operations_cases',
    {
      title: 'List Open Operations Cases',
      description: [
        'List all currently open (unresolved) operations escalation cases.',
        '',
        'Use this tool when you need operational continuity — for example to answer',
        '"what open cases exist?", "show unresolved warehouse issues", or to resume',
        'work across turns without recreating cases.',
        '',
        'Optionally filter by warehouseId (e.g. "WH-EAST") to scope open cases to',
        'orders assigned to that facility.',
        '',
        'Returns count plus cases sorted by caseId (OPS-0001, OPS-0002, …).',
        'An empty list means there are no open cases — that is a valid result.',
        '',
        'Do NOT use this tool to create a case — call create_operations_case.',
        'Do NOT use this tool to fetch one known case — call get_operations_case.',
      ].join('\n'),
      inputSchema: listOpenOperationsCasesInputSchema,
      outputSchema: listOpenOperationsCasesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = cases.listOpenCases({
          ...(args.warehouseId !== undefined ? { warehouseId: args.warehouseId } : {}),
        });
        return toolSuccess({
          count: result.count,
          cases: result.cases,
        });
      } catch (error) {
        return toolFailure(error);
      }
    },
  );
}
