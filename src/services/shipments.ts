import type { Shipment, ShipmentStatus as ShipmentStatusCode } from '../schemas/index.js';
import type { CommerceStore } from '../store/index.js';
import { OrderService } from './orders.js';
import { parseOrderId } from './parse.js';

/**
 * Deterministic shipment view for an order.
 * When no shipment rows exist, `status` is `"not_created"` (never null).
 */
export type ShipmentStatusResult = {
  orderId: string;
  hasShipment: boolean;
  status: ShipmentStatusCode | 'not_created';
  shipments: readonly Shipment[];
  primaryShipment: Shipment | undefined;
};

/**
 * Shipment / carrier status service.
 */
export class ShipmentService {
  private readonly orders: OrderService;

  constructor(private readonly store: CommerceStore) {
    this.orders = new OrderService(store);
  }

  /**
   * Returns shipment facts for an order.
   * Missing shipments are represented as `{ status: "not_created", hasShipment: false }`.
   *
   * @throws ValidationError when orderId is invalid
   * @throws NotFoundError when the order does not exist
   */
  getShipmentStatus(orderId: string): ShipmentStatusResult {
    const normalizedId = parseOrderId(orderId);
    this.orders.getOrder(normalizedId);

    const shipments = this.store.getShipmentsByOrderId(normalizedId);
    if (shipments.length === 0) {
      return {
        orderId: normalizedId,
        hasShipment: false,
        status: 'not_created',
        shipments: [],
        primaryShipment: undefined,
      };
    }

    const primaryShipment = selectPrimaryShipment(shipments);

    return {
      orderId: normalizedId,
      hasShipment: true,
      status: primaryShipment.status,
      shipments,
      primaryShipment,
    };
  }
}

/**
 * Prefers outbound active movement over voided/return labels when multiple rows exist.
 */
function selectPrimaryShipment(shipments: readonly Shipment[]): Shipment {
  const priority: readonly ShipmentStatusCode[] = [
    'exception',
    'in_transit',
    'shipped',
    'label_purchased',
    'delivered',
    'return_in_transit',
    'returned',
    'voided',
  ];

  for (const status of priority) {
    const match = shipments.find((shipment) => shipment.status === status);
    if (match) {
      return match;
    }
  }

  const first = shipments[0];
  if (!first) {
    throw new Error('selectPrimaryShipment called with an empty list');
  }
  return first;
}
