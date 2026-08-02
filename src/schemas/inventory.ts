import { z } from 'zod';
import {
  moneyCentsSchema,
  nullableIsoDateTimeSchema,
  orderIdSchema,
  reservationIdSchema,
  skuSchema,
  warehouseIdSchema,
  isoDateTimeSchema,
} from './common.js';

export const skuCategorySchema = z.enum([
  'apparel',
  'footwear',
  'accessories',
  'hardgoods',
  'electronics',
]);

/** Catalog SKU row from inventory.json → skus. */
export const catalogSkuSchema = z.object({
  sku: skuSchema,
  name: z.string().min(1),
  category: skuCategorySchema,
  unitCostCents: moneyCentsSchema,
  unitPriceCents: moneyCentsSchema,
});

export const inventoryStockSchema = z.object({
  sku: skuSchema,
  name: z.string().min(1),
  category: skuCategorySchema,
  warehouseId: warehouseIdSchema,
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  reorderPoint: z.number().int().nonnegative(),
  unitCostCents: moneyCentsSchema,
  unitPriceCents: moneyCentsSchema,
});

export const reservationStatusSchema = z.enum(['none', 'reserved', 'partial', 'released']);

export const pickStatusSchema = z.enum([
  'not_started',
  'held',
  'blocked',
  'pick_blocked',
  'picked',
  'cancelled',
]);

export const inventoryReservationSchema = z.object({
  reservationId: reservationIdSchema,
  orderId: orderIdSchema,
  sku: skuSchema,
  warehouseId: warehouseIdSchema,
  quantityRequested: z.number().int().nonnegative(),
  quantityReserved: z.number().int().nonnegative(),
  quantityPicked: z.number().int().nonnegative(),
  status: reservationStatusSchema,
  pickStatus: pickStatusSchema,
  pickBlockedReason: z.string().nullable(),
  pickBlockedZone: z.string().nullable(),
  pickBlockedAt: nullableIsoDateTimeSchema,
  availableOnHand: z.number().int().nonnegative(),
  updatedAt: isoDateTimeSchema,
});

/** Full inventory.json document. */
export const inventoryDatasetSchema = z.object({
  skus: z.array(catalogSkuSchema),
  stock: z.array(inventoryStockSchema),
  reservations: z.array(inventoryReservationSchema),
});

/** Tool input: inventory / reservation status for an order. */
export const getInventoryStatusInputSchema = z.object({
  orderId: orderIdSchema.describe(
    'Order identifier whose inventory reservations and stock rows should be returned.',
  ),
});

export type CatalogSku = z.infer<typeof catalogSkuSchema>;
export type InventoryStock = z.infer<typeof inventoryStockSchema>;
export type InventoryReservation = z.infer<typeof inventoryReservationSchema>;
export type InventoryDataset = z.infer<typeof inventoryDatasetSchema>;
export type GetInventoryStatusInput = z.infer<typeof getInventoryStatusInputSchema>;
