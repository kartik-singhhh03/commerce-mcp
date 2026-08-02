import { z } from 'zod';
import { ValidationError } from '../errors.js';
import { orderIdSchema, warehouseIdSchema } from '../schemas/index.js';

/**
 * Parses an order id with normalization, or throws ValidationError.
 */
export function parseOrderId(orderId: string): string {
  const result = orderIdSchema.safeParse(orderId);
  if (!result.success) {
    throw new ValidationError(`Invalid orderId: ${z.prettifyError(result.error)}`, {
      orderId,
    });
  }
  return result.data;
}

/**
 * Parses a warehouse id, or throws ValidationError.
 */
export function parseWarehouseId(warehouseId: string): string {
  const result = warehouseIdSchema.safeParse(warehouseId);
  if (!result.success) {
    throw new ValidationError(`Invalid warehouseId: ${z.prettifyError(result.error)}`, {
      warehouseId,
    });
  }
  return result.data;
}

/**
 * Converts a Zod failure into ValidationError.
 */
export function validationFromZod(label: string, error: z.ZodError): ValidationError {
  return new ValidationError(`Invalid ${label}:\n${z.prettifyError(error)}`);
}
