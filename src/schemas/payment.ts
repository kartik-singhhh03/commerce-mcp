import { z } from 'zod';
import {
  currencySchema,
  moneyCentsSchema,
  nullableIsoDateTimeSchema,
  orderIdSchema,
  paymentIdSchema,
} from './common.js';

export const paymentProviderSchema = z.enum(['stripe', 'adyen']);

export const paymentMethodSchema = z.enum(['card']);

export const paymentStatusSchema = z.enum(['authorized', 'captured', 'failed', 'refunded']);

export const fraudReviewStatusSchema = z.enum(['clear', 'pending_review']);

export const paymentSchema = z.object({
  paymentId: paymentIdSchema,
  orderId: orderIdSchema,
  provider: paymentProviderSchema,
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  authorizedAt: nullableIsoDateTimeSchema,
  capturedAt: nullableIsoDateTimeSchema,
  amountCents: moneyCentsSchema,
  currency: currencySchema,
  last4: z.string().min(1),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  fraudReviewStatus: fraudReviewStatusSchema,
});

export const paymentsFileSchema = z.array(paymentSchema);

/** Tool input: payment status for an order. */
export const getPaymentStatusInputSchema = z.object({
  orderId: orderIdSchema.describe(
    'Order identifier to look up payment state for (e.g. "1234" or "#1234").',
  ),
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type GetPaymentStatusInput = z.infer<typeof getPaymentStatusInputSchema>;
