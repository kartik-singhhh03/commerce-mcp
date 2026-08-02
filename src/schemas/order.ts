import { z } from 'zod';
import {
  currencySchema,
  customerIdSchema,
  emailSchema,
  isoDateTimeSchema,
  moneyCentsSchema,
  nullableIsoDateTimeSchema,
  orderIdSchema,
  orderNumberSchema,
  skuSchema,
  warehouseIdSchema,
} from './common.js';

export const addressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  addressVerified: z.boolean(),
});

export const orderLineItemSchema = z.object({
  lineId: z.string().min(1),
  sku: skuSchema,
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: moneyCentsSchema,
});

export const orderStatusSchema = z.enum([
  'confirmed',
  'on_hold',
  'payment_failed',
  'cancelled',
  'completed',
  'returned',
]);

export const fulfillmentStatusSchema = z.enum([
  'not_started',
  'awaiting_pick',
  'awaiting_inventory',
  'on_hold',
  'label_purchased',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]);

export const orderChannelSchema = z.enum(['web', 'mobile']);

export const orderSchema = z.object({
  orderId: orderIdSchema,
  orderNumber: orderNumberSchema,
  createdAt: isoDateTimeSchema,
  confirmedAt: nullableIsoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  cancelledAt: nullableIsoDateTimeSchema.optional(),
  status: orderStatusSchema,
  fulfillmentStatus: fulfillmentStatusSchema,
  channel: orderChannelSchema,
  customerId: customerIdSchema,
  customerEmail: emailSchema,
  warehouseId: warehouseIdSchema,
  currency: currencySchema,
  subtotalCents: moneyCentsSchema,
  shippingCents: moneyCentsSchema,
  taxCents: moneyCentsSchema,
  totalCents: moneyCentsSchema,
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  lineItems: z.array(orderLineItemSchema).min(1),
  holdCodes: z.array(z.string()),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
});

export const ordersFileSchema = z.array(orderSchema);

/** Tool input: look up a single order. */
export const getOrderInputSchema = z.object({
  orderId: orderIdSchema.describe(
    'Commerce order identifier. Accepts values with or without a leading hash (e.g. "1234" or "#1234").',
  ),
});

export type Address = z.infer<typeof addressSchema>;
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type FulfillmentStatus = z.infer<typeof fulfillmentStatusSchema>;
export type Order = z.infer<typeof orderSchema>;
export type GetOrderInput = z.infer<typeof getOrderInputSchema>;
