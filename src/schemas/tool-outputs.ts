import { z } from 'zod';
import { operationsCaseSchema } from './case.js';
import { orderIdSchema } from './common.js';
import {
  inventoryReservationSchema,
  inventoryStockSchema,
} from './inventory.js';
import { orderSchema } from './order.js';
import { paymentSchema } from './payment.js';
import { shipmentSchema, shipmentStatusSchema } from './shipment.js';
import { warehouseEventSchema, warehouseSchema } from './warehouse.js';

/** Structured output for get_order. */
export const getOrderOutputSchema = orderSchema;

/** Structured output for get_payment_status. */
export const getPaymentStatusOutputSchema = paymentSchema;

/** Structured output for get_inventory_status. */
export const getInventoryStatusOutputSchema = z.object({
  orderId: orderIdSchema,
  warehouseId: z.string().min(1),
  reservations: z.array(inventoryReservationSchema),
  stock: z.array(inventoryStockSchema),
  order: orderSchema,
});

/** Structured output for get_warehouse_status. */
export const getWarehouseStatusOutputSchema = z.object({
  warehouseId: z.string().min(1),
  warehouse: warehouseSchema,
  events: z.array(warehouseEventSchema),
  activeEvents: z.array(warehouseEventSchema),
  resolvedFromOrderId: orderIdSchema.nullable(),
});

/** Structured output for get_shipment_status. */
export const getShipmentStatusOutputSchema = z.object({
  orderId: orderIdSchema,
  hasShipment: z.boolean(),
  status: z.union([shipmentStatusSchema, z.literal('not_created')]),
  shipments: z.array(shipmentSchema),
  primaryShipment: shipmentSchema.nullable(),
});

/**
 * Structured output for create_operations_case.
 * Emphasizes caseId / status / createdAt for the AI while including full case context.
 */
export const createOperationsCaseOutputSchema = z.object({
  caseId: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.string().min(1),
  orderId: orderIdSchema,
  summary: z.string().min(1),
  rootCause: z.string().min(1),
  severity: z.string().min(1),
  recommendedAction: z.string().min(1),
  updatedAt: z.string().min(1),
  createdBy: z.string().min(1),
});

/** Structured output for get_operations_case. */
export const getOperationsCaseOutputSchema = operationsCaseSchema;

/** Structured output for list_open_operations_cases. */
export const listOpenOperationsCasesOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  cases: z.array(operationsCaseSchema),
});

export type GetOrderOutput = z.infer<typeof getOrderOutputSchema>;
export type GetPaymentStatusOutput = z.infer<typeof getPaymentStatusOutputSchema>;
export type GetInventoryStatusOutput = z.infer<typeof getInventoryStatusOutputSchema>;
export type GetWarehouseStatusOutput = z.infer<typeof getWarehouseStatusOutputSchema>;
export type GetShipmentStatusOutput = z.infer<typeof getShipmentStatusOutputSchema>;
export type CreateOperationsCaseOutput = z.infer<typeof createOperationsCaseOutputSchema>;
export type GetOperationsCaseOutput = z.infer<typeof getOperationsCaseOutputSchema>;
export type ListOpenOperationsCasesOutput = z.infer<typeof listOpenOperationsCasesOutputSchema>;
