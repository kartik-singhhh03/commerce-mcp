/**
 * MCP tool registration surface.
 * Each tool is a thin AI interface over exactly one service method.
 */

export { registerGetOrder } from './get-order.js';
export { registerGetPaymentStatus } from './get-payment-status.js';
export { registerGetInventoryStatus } from './get-inventory-status.js';
export { registerGetWarehouseStatus } from './get-warehouse-status.js';
export { registerGetShipmentStatus } from './get-shipment-status.js';
export { registerCreateOperationsCase } from './create-operations-case.js';
export { registerGetOperationsCase } from './get-operations-case.js';
export { registerListOpenOperationsCases } from './list-open-operations-cases.js';
export { toolSuccess, toolFailure } from './helpers.js';

import type { McpServer } from '@modelcontextprotocol/server';
import type { CommerceServices } from '../services/index.js';
import { registerCreateOperationsCase } from './create-operations-case.js';
import { registerGetInventoryStatus } from './get-inventory-status.js';
import { registerGetOperationsCase } from './get-operations-case.js';
import { registerGetOrder } from './get-order.js';
import { registerGetPaymentStatus } from './get-payment-status.js';
import { registerGetShipmentStatus } from './get-shipment-status.js';
import { registerGetWarehouseStatus } from './get-warehouse-status.js';
import { registerListOpenOperationsCases } from './list-open-operations-cases.js';

/**
 * Registers every commerce operations tool on the given MCP server.
 */
export function registerAllTools(server: McpServer, services: CommerceServices): void {
  registerGetOrder(server, services.orders);
  registerGetPaymentStatus(server, services.payments);
  registerGetInventoryStatus(server, services.inventory);
  registerGetWarehouseStatus(server, services.warehouses);
  registerGetShipmentStatus(server, services.shipments);
  registerCreateOperationsCase(server, services.cases);
  registerGetOperationsCase(server, services.cases);
  registerListOpenOperationsCases(server, services.cases);
}
