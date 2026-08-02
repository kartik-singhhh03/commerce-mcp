import { z } from 'zod';
import {
  caseIdSchema,
  isoDateTimeSchema,
  orderIdSchema,
  warehouseIdSchema,
} from './common.js';

export const operationsCaseStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
]);

export const operationsCaseSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/** Persisted operations case entity (in-memory only). */
export const operationsCaseSchema = z.object({
  caseId: caseIdSchema,
  orderId: orderIdSchema,
  status: operationsCaseStatusSchema,
  summary: z.string().min(1),
  rootCause: z.string().min(1),
  severity: operationsCaseSeveritySchema,
  recommendedAction: z.string().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  createdBy: z.string().min(1).default('ai-copilot'),
});

/** Seed file schema — starts empty; runtime cases live in memory. */
export const casesFileSchema = z.array(operationsCaseSchema);

/** Tool input: create an operations case (AI supplies investigation fields). */
export const createOperationsCaseInputSchema = z.object({
  orderId: orderIdSchema.describe('Order this escalation is about (e.g. "1234" or "#1234").'),
  summary: z
    .string()
    .min(1)
    .describe('Short factual summary of the operational problem observed.'),
  rootCause: z
    .string()
    .min(1)
    .describe(
      'Most likely root cause based on tool evidence already gathered (payment, inventory, warehouse, shipment).',
    ),
  severity: operationsCaseSeveritySchema.describe(
    'Impact severity: low | medium | high | critical.',
  ),
  recommendedAction: z
    .string()
    .min(1)
    .describe('Concrete next action operations should take to unblock fulfillment.'),
});

/** Tool input: fetch a case by id and/or order id. */
export const getOperationsCaseInputSchema = z
  .object({
    caseId: caseIdSchema
      .optional()
      .describe('Operations case id (e.g. "OPS-0001"). Prefer this when known.'),
    orderId: orderIdSchema
      .optional()
      .describe('Order id to find an existing case for when caseId is unknown.'),
  })
  .refine((value) => value.caseId !== undefined || value.orderId !== undefined, {
    message: 'Either caseId or orderId is required',
  });

/** Tool input: list open operations cases (optional warehouse filter). */
export const listOpenOperationsCasesInputSchema = z.object({
  warehouseId: warehouseIdSchema
    .optional()
    .describe(
      'Optional warehouse id (e.g. "WH-EAST"). When set, only open cases whose order is assigned to that warehouse are returned.',
    ),
});

export type OperationsCase = z.infer<typeof operationsCaseSchema>;
export type OperationsCaseStatus = z.infer<typeof operationsCaseStatusSchema>;
export type OperationsCaseSeverity = z.infer<typeof operationsCaseSeveritySchema>;
export type CreateOperationsCaseInput = z.infer<typeof createOperationsCaseInputSchema>;
export type GetOperationsCaseInput = z.infer<typeof getOperationsCaseInputSchema>;
export type ListOpenOperationsCasesInput = z.infer<typeof listOpenOperationsCasesInputSchema>;
