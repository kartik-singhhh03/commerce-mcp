import { describe, expect, it } from 'vitest';
import {
  createOperationsCaseInputSchema,
  getOrderInputSchema,
  normalizeOrderId,
  orderIdSchema,
  orderSchema,
} from '../../src/schemas/index.js';

describe('normalizeOrderId', () => {
  it('strips a leading hash and whitespace', () => {
    expect(normalizeOrderId('#1234')).toBe('1234');
    expect(normalizeOrderId('  #1234  ')).toBe('1234');
    expect(normalizeOrderId('1234')).toBe('1234');
  });
});

describe('orderIdSchema', () => {
  it('accepts #1234 and 1234 as the same value', () => {
    expect(orderIdSchema.parse('#1234')).toBe('1234');
    expect(orderIdSchema.parse('1234')).toBe('1234');
  });

  it('rejects empty ids after normalization', () => {
    expect(orderIdSchema.safeParse('#').success).toBe(false);
    expect(orderIdSchema.safeParse('   ').success).toBe(false);
  });
});

describe('getOrderInputSchema', () => {
  it('normalizes orderId for tool inputs', () => {
    expect(getOrderInputSchema.parse({ orderId: '#1234' })).toEqual({ orderId: '1234' });
  });
});

describe('createOperationsCaseInputSchema', () => {
  it('requires investigation fields', () => {
    const result = createOperationsCaseInputSchema.safeParse({
      orderId: '#1234',
      summary: 'Pick blocked',
      rootCause: 'Warehouse degraded',
      severity: 'high',
      recommendedAction: 'Reroute pick zone',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe('1234');
    }
  });

  it('rejects incomplete cases', () => {
    expect(createOperationsCaseInputSchema.safeParse({ orderId: '1234' }).success).toBe(false);
  });
});

describe('orderSchema', () => {
  it('accepts a minimal valid order shape', () => {
    const order = orderSchema.parse({
      orderId: '#9999',
      orderNumber: '#9999',
      createdAt: '2026-07-28T14:22:00Z',
      confirmedAt: null,
      updatedAt: '2026-07-28T14:22:00Z',
      status: 'confirmed',
      fulfillmentStatus: 'awaiting_pick',
      channel: 'web',
      customerId: 'CUST-1',
      customerEmail: 'a@example.com',
      warehouseId: 'WH-EAST',
      currency: 'USD',
      subtotalCents: 100,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 100,
      shippingAddress: {
        name: 'A',
        line1: '1 Main',
        line2: null,
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressVerified: true,
      },
      billingAddress: {
        name: 'A',
        line1: '1 Main',
        line2: null,
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressVerified: true,
      },
      lineItems: [
        {
          lineId: '9999-L1',
          sku: 'SKU-TEE-001',
          name: 'Tee',
          quantity: 1,
          unitPriceCents: 100,
        },
      ],
      holdCodes: [],
      tags: [],
      notes: null,
    });

    expect(order.orderId).toBe('9999');
  });
});
