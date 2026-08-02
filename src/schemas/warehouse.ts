import { z } from 'zod';
import {
  eventIdSchema,
  isoDateTimeSchema,
  nullableIsoDateTimeSchema,
  orderIdSchema,
  warehouseIdSchema,
} from './common.js';

export const warehouseStatusSchema = z.enum(['operational', 'degraded']);

export const slaRiskSchema = z.enum(['low', 'medium', 'high']);

export const warehouseSchema = z.object({
  warehouseId: warehouseIdSchema,
  name: z.string().min(1),
  region: z.string().min(1),
  timezone: z.string().min(1),
  status: warehouseStatusSchema,
  capacityUtilizationPct: z.number().int().min(0).max(100),
  openForPicking: z.boolean(),
  openForShipping: z.boolean(),
  slaRisk: slaRiskSchema,
  notes: z.string().nullable(),
});

export const warehouseEventTypeSchema = z.enum([
  'equipment_degraded',
  'staffing_shortfall',
  'maintenance_window',
  'carrier_pickup_delay',
  'inventory_recount',
  'weather_advisory',
  'system_outage',
  'quality_hold',
  'capacity_warning',
  'dock_congestion',
]);

export const warehouseEventSeveritySchema = z.enum(['low', 'medium', 'high']);

export const warehouseEventStatusSchema = z.enum(['active', 'resolved']);

export const warehouseEventImpactSchema = z.enum([
  'none',
  'pick_throughput_reduced',
  'pack_delay',
  'ship_delay',
  'ship_hold',
  'pick_paused',
]);

export const warehouseEventSchema = z.object({
  eventId: eventIdSchema,
  warehouseId: warehouseIdSchema,
  type: warehouseEventTypeSchema,
  severity: warehouseEventSeveritySchema,
  status: warehouseEventStatusSchema,
  startedAt: isoDateTimeSchema,
  endedAt: nullableIsoDateTimeSchema,
  zone: z.string().nullable(),
  summary: z.string().min(1),
  impact: warehouseEventImpactSchema,
});

/** Full warehouses.json document. */
export const warehousesDatasetSchema = z.object({
  warehouses: z.array(warehouseSchema).min(1),
  events: z.array(warehouseEventSchema),
});

/** Tool input: warehouse status for an order or warehouse. */
export const getWarehouseStatusInputSchema = z
  .object({
    orderId: orderIdSchema
      .optional()
      .describe(
        'Order identifier. When provided, resolves the order\'s assigned warehouse. Prefer this during order investigations.',
      ),
    warehouseId: warehouseIdSchema
      .optional()
      .describe(
        'Warehouse identifier (e.g. "WH-EAST"). Use when you already know the facility id. Takes precedence over orderId when both are set.',
      ),
  })
  .refine((value) => value.orderId !== undefined || value.warehouseId !== undefined, {
    message: 'Either orderId or warehouseId is required',
  });

export type Warehouse = z.infer<typeof warehouseSchema>;
export type WarehouseEvent = z.infer<typeof warehouseEventSchema>;
export type WarehousesDataset = z.infer<typeof warehousesDatasetSchema>;
export type GetWarehouseStatusInput = z.infer<typeof getWarehouseStatusInputSchema>;
