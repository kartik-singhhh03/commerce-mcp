import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  casesFileSchema,
  inventoryDatasetSchema,
  normalizeOrderId,
  ordersFileSchema,
  paymentsFileSchema,
  shipmentsFileSchema,
  warehousesDatasetSchema,
  type CatalogSku,
  type InventoryReservation,
  type InventoryStock,
  type OperationsCase,
  type Order,
  type Payment,
  type Shipment,
  type Warehouse,
  type WarehouseEvent,
} from '../schemas/index.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Default path to the `data/` directory (works from `src/store` and `dist/store`). */
export function resolveDefaultDataDir(): string {
  return join(moduleDir, '..', '..', 'data');
}

export type LoadStoreOptions = {
  /** Absolute or relative path to the JSON data directory. Defaults to project `data/`. */
  dataDir?: string;
};

/**
 * In-memory commerce store with Map indexes for O(1) primary-key lookup.
 * Cases are mutable; all other collections are treated as read-only seed data.
 */
export type CommerceStore = {
  readonly dataDir: string;
  readonly ordersById: ReadonlyMap<string, Order>;
  readonly paymentsById: ReadonlyMap<string, Payment>;
  readonly paymentsByOrderId: ReadonlyMap<string, readonly Payment[]>;
  readonly skusById: ReadonlyMap<string, CatalogSku>;
  readonly stockByKey: ReadonlyMap<string, InventoryStock>;
  readonly reservationsByOrderId: ReadonlyMap<string, readonly InventoryReservation[]>;
  readonly warehousesById: ReadonlyMap<string, Warehouse>;
  readonly eventsByWarehouseId: ReadonlyMap<string, readonly WarehouseEvent[]>;
  readonly eventsById: ReadonlyMap<string, WarehouseEvent>;
  readonly shipmentsById: ReadonlyMap<string, Shipment>;
  readonly shipmentsByOrderId: ReadonlyMap<string, readonly Shipment[]>;
  /** Mutable in-memory index for operations cases (never written to disk). */
  readonly casesById: Map<string, OperationsCase>;
  readonly casesByOrderId: Map<string, OperationsCase[]>;

  /** Returns an order by id (`"1234"` or `"#1234"`). */
  getOrder(orderId: string): Order | undefined;
  /** Returns all payments for an order. */
  getPaymentsByOrderId(orderId: string): readonly Payment[];
  /** Returns the first payment for an order, if any. */
  getPaymentByOrderId(orderId: string): Payment | undefined;
  /** Returns a catalog SKU by sku code. */
  getSku(sku: string): CatalogSku | undefined;
  /** Returns stock for a sku at a warehouse (`sku::warehouseId`). */
  getStock(sku: string, warehouseId: string): InventoryStock | undefined;
  /** Returns inventory reservations for an order. */
  getReservationsByOrderId(orderId: string): readonly InventoryReservation[];
  /** Returns a warehouse by id. */
  getWarehouse(warehouseId: string): Warehouse | undefined;
  /** Returns warehouse events for a facility (active and resolved). */
  getWarehouseEvents(warehouseId: string): readonly WarehouseEvent[];
  /** Returns a warehouse event by id. */
  getWarehouseEvent(eventId: string): WarehouseEvent | undefined;
  /** Returns all shipments for an order (may be empty). */
  getShipmentsByOrderId(orderId: string): readonly Shipment[];
  /** Returns a shipment by id. */
  getShipment(shipmentId: string): Shipment | undefined;
  /** Returns an operations case by id. */
  getOperationsCase(caseId: string): OperationsCase | undefined;
  /** Returns all in-memory operations cases for an order. */
  getOperationsCasesByOrderId(orderId: string): readonly OperationsCase[];
};

function stockKey(sku: string, warehouseId: string): string {
  return `${sku}::${warehouseId}`;
}

function readJsonFile(dataDir: string, fileName: string): unknown {
  const filePath = join(dataDir, fileName);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read ${fileName} from ${dataDir}: ${reason}`);
  }
}

function parseDataset<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid ${label}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function groupBy<T, K extends string>(items: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Loads every JSON dataset once, validates with Zod, and builds Map indexes.
 * Throws with a descriptive message if any file is missing or invalid.
 */
export function loadStore(options: LoadStoreOptions = {}): CommerceStore {
  const dataDir = options.dataDir ?? resolveDefaultDataDir();

  const orders = parseDataset(ordersFileSchema, readJsonFile(dataDir, 'orders.json'), 'orders.json');
  const payments = parseDataset(
    paymentsFileSchema,
    readJsonFile(dataDir, 'payments.json'),
    'payments.json',
  );
  const inventory = parseDataset(
    inventoryDatasetSchema,
    readJsonFile(dataDir, 'inventory.json'),
    'inventory.json',
  );
  const warehousesDataset = parseDataset(
    warehousesDatasetSchema,
    readJsonFile(dataDir, 'warehouses.json'),
    'warehouses.json',
  );
  const shipments = parseDataset(
    shipmentsFileSchema,
    readJsonFile(dataDir, 'shipments.json'),
    'shipments.json',
  );
  const seedCases = parseDataset(casesFileSchema, readJsonFile(dataDir, 'cases.json'), 'cases.json');

  const ordersById = new Map(orders.map((order) => [order.orderId, order]));
  const paymentsById = new Map(payments.map((payment) => [payment.paymentId, payment]));
  const paymentsByOrderId = groupBy(payments, (payment) => payment.orderId);
  const skusById = new Map(inventory.skus.map((sku) => [sku.sku, sku]));
  const stockByKey = new Map(
    inventory.stock.map((row) => [stockKey(row.sku, row.warehouseId), row]),
  );
  const reservationsByOrderId = groupBy(inventory.reservations, (row) => row.orderId);
  const warehousesById = new Map(
    warehousesDataset.warehouses.map((warehouse) => [warehouse.warehouseId, warehouse]),
  );
  const eventsByWarehouseId = groupBy(warehousesDataset.events, (event) => event.warehouseId);
  const eventsById = new Map(warehousesDataset.events.map((event) => [event.eventId, event]));
  const shipmentsById = new Map(shipments.map((shipment) => [shipment.shipmentId, shipment]));
  const shipmentsByOrderId = groupBy(shipments, (shipment) => shipment.orderId);

  const casesById = new Map<string, OperationsCase>();
  const casesByOrderId = new Map<string, OperationsCase[]>();
  for (const opsCase of seedCases) {
    casesById.set(opsCase.caseId, opsCase);
    const bucket = casesByOrderId.get(opsCase.orderId);
    if (bucket) {
      bucket.push(opsCase);
    } else {
      casesByOrderId.set(opsCase.orderId, [opsCase]);
    }
  }

  const store: CommerceStore = {
    dataDir,
    ordersById,
    paymentsById,
    paymentsByOrderId,
    skusById,
    stockByKey,
    reservationsByOrderId,
    warehousesById,
    eventsByWarehouseId,
    eventsById,
    shipmentsById,
    shipmentsByOrderId,
    casesById,
    casesByOrderId,

    getOrder(orderId: string): Order | undefined {
      return ordersById.get(normalizeOrderId(orderId));
    },

    getPaymentsByOrderId(orderId: string): readonly Payment[] {
      return paymentsByOrderId.get(normalizeOrderId(orderId)) ?? [];
    },

    getPaymentByOrderId(orderId: string): Payment | undefined {
      return store.getPaymentsByOrderId(orderId)[0];
    },

    getSku(sku: string): CatalogSku | undefined {
      return skusById.get(sku);
    },

    getStock(sku: string, warehouseId: string): InventoryStock | undefined {
      return stockByKey.get(stockKey(sku, warehouseId));
    },

    getReservationsByOrderId(orderId: string): readonly InventoryReservation[] {
      return reservationsByOrderId.get(normalizeOrderId(orderId)) ?? [];
    },

    getWarehouse(warehouseId: string): Warehouse | undefined {
      return warehousesById.get(warehouseId);
    },

    getWarehouseEvents(warehouseId: string): readonly WarehouseEvent[] {
      return eventsByWarehouseId.get(warehouseId) ?? [];
    },

    getWarehouseEvent(eventId: string): WarehouseEvent | undefined {
      return eventsById.get(eventId);
    },

    getShipmentsByOrderId(orderId: string): readonly Shipment[] {
      return shipmentsByOrderId.get(normalizeOrderId(orderId)) ?? [];
    },

    getShipment(shipmentId: string): Shipment | undefined {
      return shipmentsById.get(shipmentId);
    },

    getOperationsCase(caseId: string): OperationsCase | undefined {
      return casesById.get(caseId);
    },

    getOperationsCasesByOrderId(orderId: string): readonly OperationsCase[] {
      return casesByOrderId.get(normalizeOrderId(orderId)) ?? [];
    },
  };

  return store;
}
