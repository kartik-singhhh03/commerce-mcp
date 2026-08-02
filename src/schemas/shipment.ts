import { z } from 'zod';
import {
  isoDateTimeSchema,
  nullableIsoDateTimeSchema,
  orderIdSchema,
  shipmentIdSchema,
  warehouseIdSchema,
} from './common.js';

export const shipmentStatusSchema = z.enum([
  'label_purchased',
  'shipped',
  'in_transit',
  'delivered',
  'exception',
  'returned',
  'return_in_transit',
  'voided',
]);

export const carrierSchema = z.enum(['ups', 'fedex', 'usps']);

export const shipmentSchema = z.object({
  shipmentId: shipmentIdSchema,
  orderId: orderIdSchema,
  warehouseId: warehouseIdSchema,
  status: shipmentStatusSchema,
  carrier: carrierSchema,
  trackingNumber: z.string().nullable(),
  labelPurchasedAt: nullableIsoDateTimeSchema,
  shippedAt: nullableIsoDateTimeSchema,
  estimatedDeliveryAt: nullableIsoDateTimeSchema,
  deliveredAt: nullableIsoDateTimeSchema,
  returnedAt: nullableIsoDateTimeSchema.optional(),
  exceptionCode: z.string().nullable(),
  exceptionMessage: z.string().nullable(),
  packageCount: z.number().int().nonnegative(),
  weightOz: z.number().nonnegative(),
  updatedAt: isoDateTimeSchema,
  direction: z.enum(['inbound_return']).optional(),
});

export const shipmentsFileSchema = z.array(shipmentSchema);

/** Tool input: shipment status for an order. */
export const getShipmentStatusInputSchema = z.object({
  orderId: orderIdSchema.describe(
    'Order identifier to inspect for shipment lifecycle state (e.g. "1234" or "#1234").',
  ),
});

export type Shipment = z.infer<typeof shipmentSchema>;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type GetShipmentStatusInput = z.infer<typeof getShipmentStatusInputSchema>;
