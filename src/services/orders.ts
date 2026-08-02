import { NotFoundError } from '../errors.js';
import type { Order } from '../schemas/index.js';
import type { CommerceStore } from '../store/index.js';
import { parseOrderId } from './parse.js';

/**
 * Order lookup service.
 * Returns deterministic order facts only — no root-cause narrative.
 */
export class OrderService {
  constructor(private readonly store: CommerceStore) {}

  /**
   * Finds an order by id.
   * Accepts both `"1234"` and `"#1234"`.
   *
   * @throws ValidationError when orderId is invalid
   * @throws NotFoundError when the order does not exist
   */
  getOrder(orderId: string): Order {
    const normalizedId = parseOrderId(orderId);
    const order = this.store.getOrder(normalizedId);
    if (!order) {
      throw new NotFoundError(`Order not found: ${normalizedId}`, { orderId: normalizedId });
    }
    return order;
  }
}
