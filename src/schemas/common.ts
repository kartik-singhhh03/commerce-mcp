import { z } from 'zod';

/**
 * Shared primitives used across entity and tool-input schemas.
 * Order IDs are normalized so "#1234" and "1234" are equivalent.
 */

/** Strip whitespace and a leading `#` from an order identifier. */
export function normalizeOrderId(raw: string): string {
  return raw.trim().replace(/^#/, '');
}

/** Canonical order id after normalization (e.g. `"1234"`). */
export const orderIdSchema = z
  .string()
  .min(1, 'orderId is required')
  .overwrite(normalizeOrderId)
  .check((ctx) => {
    if (ctx.value.length === 0) {
      ctx.issues.push({
        code: 'custom',
        message: 'orderId must not be empty after normalization',
        input: ctx.value,
      });
    }
  });

export const orderNumberSchema = z.string().min(1);

export const skuSchema = z.string().min(1);

export const warehouseIdSchema = z.string().min(1);

export const paymentIdSchema = z.string().min(1);

export const shipmentIdSchema = z.string().min(1);

export const caseIdSchema = z.string().min(1);

export const reservationIdSchema = z.string().min(1);

export const eventIdSchema = z.string().min(1);

export const customerIdSchema = z.string().min(1);

/** ISO-8601 datetime strings as stored in mock JSON. */
export const isoDateTimeSchema = z.iso.datetime();

export const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

export const moneyCentsSchema = z.number().int().nonnegative();

export const currencySchema = z.literal('USD');

export const emailSchema = z.email();
