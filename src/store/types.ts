/**
 * Domain types for the store layer.
 * Schemas remain the single source of truth — these are re-exports of inferred types.
 */

export type {
  Order,
  Payment,
  CatalogSku,
  InventoryStock,
  InventoryReservation,
  InventoryDataset,
  Warehouse,
  WarehouseEvent,
  WarehousesDataset,
  Shipment,
  OperationsCase,
} from '../schemas/index.js';
