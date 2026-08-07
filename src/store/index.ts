/**
 * Store layer public API.
 *
 * Persistence boundary between services and JSON mock data.
 * Load validates datasets once; mutations are in-memory for operations cases only.
 */

export {
  loadStore,
  resolveDefaultDataDir,
  type CommerceStore,
  type LoadStoreOptions,
} from './load.js';

export {
  insertOperationsCase,
  deleteOperationsCase,
  type InsertOperationsCaseInput,
} from './mutate.js';

export {
  getOperationsCaseStore,
  resetOperationsCaseStoreForTests,
  PostgresOperationsCaseStore,
  type PersistOperationsCaseInput,
} from './operations-cases.js';

export { getPrismaClient, resetPrismaClientForTests, type PrismaClientOptions } from './prisma.js';

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
} from './types.js';

import { loadStore, type CommerceStore, type LoadStoreOptions } from './load.js';

let processStore: CommerceStore | undefined;

/**
 * Returns the process-wide store, loading and validating JSON on first call.
 * Subsequent calls reuse the same in-memory instance (including cases).
 */
export function getStore(options?: LoadStoreOptions): CommerceStore {
  if (!processStore) {
    processStore = loadStore(options);
  }
  return processStore;
}

/**
 * Creates a fresh store instance without replacing the process singleton.
 * Prefer this in tests.
 */
export function createStore(options?: LoadStoreOptions): CommerceStore {
  return loadStore(options);
}

/**
 * Resets the process-wide store singleton (intended for tests).
 */
export function resetStoreForTests(): void {
  processStore = undefined;
}
