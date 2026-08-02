/**
 * Service layer public API.
 * Business logic only — no MCP, HTTP, or transport concerns.
 */

export { OrderService } from './orders.js';
export { PaymentService } from './payments.js';
export { InventoryService, type InventoryStatus } from './inventory.js';
export { WarehouseService, type WarehouseStatus, type WarehouseStatusQuery } from './warehouses.js';
export { ShipmentService, type ShipmentStatusResult } from './shipments.js';
export { OperationsCaseService, type OpenOperationsCasesList } from './cases.js';
export { parseOrderId, parseWarehouseId, validationFromZod } from './parse.js';

import type { CommerceStore } from '../store/index.js';
import { InventoryService } from './inventory.js';
import { OperationsCaseService } from './cases.js';
import { OrderService } from './orders.js';
import { PaymentService } from './payments.js';
import { ShipmentService } from './shipments.js';
import { WarehouseService } from './warehouses.js';

/**
 * Convenience facade that wires all domain services to one store instance.
 */
export type CommerceServices = {
  orders: OrderService;
  payments: PaymentService;
  inventory: InventoryService;
  warehouses: WarehouseService;
  shipments: ShipmentService;
  cases: OperationsCaseService;
};

/**
 * Creates a full set of domain services bound to the given store.
 */
export function createServices(store: CommerceStore): CommerceServices {
  return {
    orders: new OrderService(store),
    payments: new PaymentService(store),
    inventory: new InventoryService(store),
    warehouses: new WarehouseService(store),
    shipments: new ShipmentService(store),
    cases: new OperationsCaseService(store),
  };
}
