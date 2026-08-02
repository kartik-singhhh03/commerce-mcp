import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors.js';
import { createServices } from '../../src/services/index.js';
import { createStore, insertOperationsCase } from '../../src/store/index.js';

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

describe('OperationsCaseService', () => {
  it('creates OPS-0001 and prevents duplicate open cases', () => {
    const { cases } = services();

    const created = cases.createCase({
      orderId: '#1234',
      summary: 'Order has not shipped',
      rootCause: 'Pick blocked while warehouse degraded',
      severity: 'high',
      recommendedAction: 'Unblock pick zone B or reallocate inventory',
    });

    expect(created.caseId).toBe('OPS-0001');
    expect(created.status).toBe('open');
    expect(cases.getCase({ caseId: 'OPS-0001' }).orderId).toBe('1234');
    expect(cases.getCase({ orderId: '1234' }).caseId).toBe('OPS-0001');

    expect(() =>
      cases.createCase({
        orderId: '1234',
        summary: 'Duplicate',
        rootCause: 'Duplicate',
        severity: 'low',
        recommendedAction: 'None',
      }),
    ).toThrow(ConflictError);
  });

  it('allows a new open case after the previous case is closed', () => {
    const { store, cases } = services();

    const first = cases.createCase({
      orderId: '1234',
      summary: 'First',
      rootCause: 'First',
      severity: 'medium',
      recommendedAction: 'Close me',
    });

    insertOperationsCase(store, {
      ...first,
      status: 'closed',
      updatedAt: new Date().toISOString(),
    });

    const second = cases.createCase({
      orderId: '1234',
      summary: 'Second',
      rootCause: 'Still blocked',
      severity: 'high',
      recommendedAction: 'Escalate',
    });

    expect(second.caseId).toBe('OPS-0002');
    expect(second.status).toBe('open');
    expect(cases.listOpenCases({ warehouseId: 'WH-EAST' }).cases.map((c) => c.caseId)).toEqual([
      'OPS-0002',
    ]);
  });

  it('throws NotFoundError when no case exists', () => {
    const { cases } = services();
    expect(() => cases.getCase({ orderId: '1234' })).toThrow(NotFoundError);
  });
});
