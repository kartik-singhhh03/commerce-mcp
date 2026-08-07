import { describe, expect, it } from 'vitest';
import { createStore, resolveDefaultDataDir } from '../../src/store/index.js';

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
