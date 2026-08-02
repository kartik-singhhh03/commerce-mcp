import { NotFoundError } from '../errors.js';
import type { Payment } from '../schemas/index.js';
import type { CommerceStore } from '../store/index.js';
import { OrderService } from './orders.js';
import { parseOrderId } from './parse.js';

/**
 * Payment status service.
 * Surfaces capture / auth / failure facts for an order.
 */
export class PaymentService {
  private readonly orders: OrderService;

  constructor(private readonly store: CommerceStore) {
    this.orders = new OrderService(store);
  }

  /**
   * Returns the primary payment record for an order.
   * Ensures the order exists first so callers get a clear NotFound for unknown orders.
   *
   * @throws ValidationError when orderId is invalid
   * @throws NotFoundError when the order or payment does not exist
   */
  getPaymentStatus(orderId: string): Payment {
    const normalizedId = parseOrderId(orderId);
    this.orders.getOrder(normalizedId);

    const payment = this.store.getPaymentByOrderId(normalizedId);
    if (!payment) {
      throw new NotFoundError(`Payment not found for order: ${normalizedId}`, {
        orderId: normalizedId,
      });
    }
    return payment;
  }
}
