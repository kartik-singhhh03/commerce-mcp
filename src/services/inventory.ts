import type {
  InventoryReservation,
  InventoryStock,
  Order,
} from '../schemas/index.js';
import type { CommerceStore } from '../store/index.js';
import { OrderService } from './orders.js';
import { parseOrderId } from './parse.js';

/**
 * Deterministic inventory view for an order (reservations + related stock rows).
 */
export type InventoryStatus = {
  orderId: string;
  warehouseId: string;
  reservations: readonly InventoryReservation[];
  stock: readonly InventoryStock[];
  order: Order;
};

/**
 * Inventory / reservation service.
 * Surfaces reservation and pick state as data — never explains root cause.
 */
export class InventoryService {
  private readonly orders: OrderService;

  constructor(private readonly store: CommerceStore) {
    this.orders = new OrderService(store);
  }

  /**
   * Returns reservation and stock facts for every line on the order.
   *
   * @throws ValidationError when orderId is invalid
   * @throws NotFoundError when the order does not exist
   */
  getInventoryStatus(orderId: string): InventoryStatus {
    const normalizedId = parseOrderId(orderId);
    const order = this.orders.getOrder(normalizedId);
    const reservations = this.store.getReservationsByOrderId(normalizedId);

    const stockKeys = new Set<string>();
    const stock: InventoryStock[] = [];

    for (const reservation of reservations) {
      const key = `${reservation.sku}::${reservation.warehouseId}`;
      if (stockKeys.has(key)) {
        continue;
      }
      stockKeys.add(key);
      const row = this.store.getStock(reservation.sku, reservation.warehouseId);
      if (row) {
        stock.push(row);
      }
    }

    for (const line of order.lineItems) {
      const key = `${line.sku}::${order.warehouseId}`;
      if (stockKeys.has(key)) {
        continue;
      }
      stockKeys.add(key);
      const row = this.store.getStock(line.sku, order.warehouseId);
      if (row) {
        stock.push(row);
      }
    }

    return {
      orderId: normalizedId,
      warehouseId: order.warehouseId,
      reservations,
      stock,
      order,
    };
  }
}
