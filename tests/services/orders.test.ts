import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/errors.js';
import { createServices } from '../../src/services/index.js';
import { createStore } from '../../src/store/index.js';

function services() {
  const store = createStore();
  return { store, ...createServices(store) };
}

describe('OrderService', () => {
  it('finds order 1234 with or without hash', () => {
    const { orders } = services();
    expect(orders.getOrder('1234').orderId).toBe('1234');
    expect(orders.getOrder('#1234').status).toBe('confirmed');
  });

  it('throws NotFoundError for unknown orders', () => {
    const { orders } = services();
    expect(() => orders.getOrder('999999')).toThrow(NotFoundError);
  });

  it('throws ValidationError for empty order ids', () => {
    const { orders } = services();
    expect(() => orders.getOrder('#')).toThrow(ValidationError);
  });
});

describe('PaymentService', () => {
  it('returns captured payment for order 1234', () => {
    const { payments } = services();
    expect(payments.getPaymentStatus('#1234').status).toBe('captured');
  });
});

describe('InventoryService', () => {
  it('returns pick_blocked reservations for order 1234', () => {
    const { inventory } = services();
    const status = inventory.getInventoryStatus('1234');
    expect(status.warehouseId).toBe('WH-EAST');
    expect(status.reservations.length).toBeGreaterThan(0);
    expect(status.reservations.every((r) => r.pickStatus === 'pick_blocked')).toBe(true);
  });
});

describe('WarehouseService', () => {
  it('returns degraded WH-EAST for order 1234', () => {
    const { warehouses } = services();
    const status = warehouses.getWarehouseStatus({ orderId: '#1234' });
    expect(status.warehouse.status).toBe('degraded');
    expect(status.activeEvents.length).toBeGreaterThan(0);
  });
});

describe('ShipmentService', () => {
  it('returns not_created for order 1234', () => {
    const { shipments } = services();
    const status = shipments.getShipmentStatus('1234');
    expect(status.hasShipment).toBe(false);
    expect(status.status).toBe('not_created');
    expect(status.shipments).toEqual([]);
  });
});

