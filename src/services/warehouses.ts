import { NotFoundError, ValidationError } from '../errors.js';
import type { Warehouse, WarehouseEvent } from '../schemas/index.js';
import type { CommerceStore } from '../store/index.js';
import { OrderService } from './orders.js';
import { parseOrderId, parseWarehouseId } from './parse.js';

/**
 * Query for warehouse health — by order assignment or warehouse id.
 */
export type WarehouseStatusQuery = {
  orderId?: string;
  warehouseId?: string;
};

/**
 * Deterministic warehouse health view (facility + events).
 */
export type WarehouseStatus = {
  warehouseId: string;
  warehouse: Warehouse;
  events: readonly WarehouseEvent[];
  activeEvents: readonly WarehouseEvent[];
  resolvedFromOrderId: string | undefined;
};

/**
 * Warehouse health / event service.
 */
export class WarehouseService {
  private readonly orders: OrderService;

  constructor(private readonly store: CommerceStore) {
    this.orders = new OrderService(store);
  }

  /**
   * Returns warehouse status for an order's assigned facility or a warehouse id.
   * Exactly one of `orderId` or `warehouseId` should be provided (both allowed; warehouseId wins).
   *
   * @throws ValidationError when neither id is provided or an id is invalid
   * @throws NotFoundError when the order or warehouse does not exist
   */
  getWarehouseStatus(query: WarehouseStatusQuery): WarehouseStatus {
    const hasOrderId = query.orderId !== undefined && query.orderId !== '';
    const hasWarehouseId = query.warehouseId !== undefined && query.warehouseId !== '';

    if (!hasOrderId && !hasWarehouseId) {
      throw new ValidationError('Either orderId or warehouseId is required');
    }

    let warehouseId: string;
    let resolvedFromOrderId: string | undefined;

    if (hasWarehouseId) {
      warehouseId = parseWarehouseId(query.warehouseId as string);
    } else {
      const orderId = parseOrderId(query.orderId as string);
      const order = this.orders.getOrder(orderId);
      warehouseId = order.warehouseId;
      resolvedFromOrderId = orderId;
    }

    const warehouse = this.store.getWarehouse(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found: ${warehouseId}`, { warehouseId });
    }

    const events = this.store.getWarehouseEvents(warehouseId);
    const activeEvents = events.filter((event) => event.status === 'active');

    return {
      warehouseId,
      warehouse,
      events,
      activeEvents,
      resolvedFromOrderId,
    };
  }
}
