import { describe, expect, it } from 'vitest';
import {
  createStore,
  insertOperationsCase,
  resolveDefaultDataDir,
} from '../../src/store/index.js';

describe('loadStore', () => {
  it('validates all JSON datasets and indexes order 1234', () => {
    const store = createStore({ dataDir: resolveDefaultDataDir() });

    expect(store.getOrder('1234')?.orderId).toBe('1234');
    expect(store.getOrder('#1234')?.orderId).toBe('1234');
    expect(store.getPaymentByOrderId('#1234')?.status).toBe('captured');
    expect(store.getReservationsByOrderId('1234').every((r) => r.pickStatus === 'pick_blocked')).toBe(
      true,
    );
    expect(store.getWarehouse('WH-EAST')?.status).toBe('degraded');
    expect(store.getShipmentsByOrderId('1234')).toEqual([]);
    expect(store.getOperationsCasesByOrderId('1234')).toEqual([]);
  });
});

describe('insertOperationsCase', () => {
  it('stores cases in memory only', () => {
    const store = createStore();
    const created = insertOperationsCase(store, {
      caseId: 'CASE-TEST-1',
      orderId: '#1234',
      status: 'open',
      summary: 'Order not shipping',
      rootCause: 'Pick blocked in degraded warehouse',
      severity: 'high',
      recommendedAction: 'Clear pick zone B or reallocate',
      createdAt: '2026-07-31T12:00:00Z',
      updatedAt: '2026-07-31T12:00:00Z',
      createdBy: 'test',
    });

    expect(created.orderId).toBe('1234');
    expect(store.getOperationsCase('CASE-TEST-1')?.summary).toBe('Order not shipping');
    expect(store.getOperationsCasesByOrderId('1234')).toHaveLength(1);
  });
});
