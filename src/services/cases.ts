import { ConflictError, NotFoundError } from '../errors.js';
import {
  createOperationsCaseInputSchema,
  getOperationsCaseInputSchema,
  listOpenOperationsCasesInputSchema,
  type CreateOperationsCaseInput,
  type GetOperationsCaseInput,
  type ListOpenOperationsCasesInput,
  type OperationsCase,
} from '../schemas/index.js';
import { insertOperationsCase, type CommerceStore } from '../store/index.js';
import { OrderService } from './orders.js';
import { parseOrderId, parseWarehouseId, validationFromZod } from './parse.js';

const CASE_ID_PATTERN = /^OPS-(\d+)$/;

/**
 * Result of listing open operations cases.
 */
export type OpenOperationsCasesList = {
  count: number;
  cases: OperationsCase[];
};

/**
 * Operations case service — create, retrieve, and list investigation cases.
 * Does not decide root cause; the caller (AI) supplies summary fields.
 */
export class OperationsCaseService {
  private readonly orders: OrderService;

  constructor(private readonly store: CommerceStore) {
    this.orders = new OrderService(store);
  }

  /**
   * Creates a new open operations case for an order.
   * Generates ids as `OPS-0001`, `OPS-0002`, …
   * Rejects when an OPEN case already exists for the order.
   * Closed (and other non-open) cases do not block creation.
   *
   * @throws ValidationError when input is invalid
   * @throws NotFoundError when the order does not exist
   * @throws ConflictError when an open case already exists for the order
   */
  createCase(input: CreateOperationsCaseInput | unknown): OperationsCase {
    const parsed = createOperationsCaseInputSchema.safeParse(input);
    if (!parsed.success) {
      throw validationFromZod('createCase input', parsed.error);
    }

    const data = parsed.data;
    const orderId = parseOrderId(data.orderId);
    this.orders.getOrder(orderId);

    const existingOpen = this.findOpenCase(orderId);
    if (existingOpen) {
      throw new ConflictError(
        `An open operations case already exists for order ${orderId}: ${existingOpen.caseId}`,
        { orderId, caseId: existingOpen.caseId },
      );
    }

    const now = new Date().toISOString();
    const opsCase: OperationsCase = {
      caseId: this.nextCaseId(),
      orderId,
      status: 'open',
      summary: data.summary,
      rootCause: data.rootCause,
      severity: data.severity,
      recommendedAction: data.recommendedAction,
      createdAt: now,
      updatedAt: now,
      createdBy: 'ai-copilot',
    };

    return insertOperationsCase(this.store, opsCase);
  }

  /**
   * Retrieves an operations case by `caseId` and/or `orderId`.
   * When only `orderId` is provided, prefers an open case, otherwise the most recently updated.
   *
   * @throws ValidationError when neither id is provided or input is invalid
   * @throws NotFoundError when no matching case exists
   */
  getCase(input: GetOperationsCaseInput | unknown): OperationsCase {
    const parsed = getOperationsCaseInputSchema.safeParse(input);
    if (!parsed.success) {
      throw validationFromZod('getCase input', parsed.error);
    }

    const { caseId, orderId } = parsed.data;

    if (caseId !== undefined) {
      const found = this.store.getOperationsCase(caseId);
      if (!found) {
        throw new NotFoundError(`Operations case not found: ${caseId}`, { caseId });
      }
      return found;
    }

    if (orderId === undefined) {
      throw new NotFoundError('Operations case not found');
    }

    const normalizedOrderId = parseOrderId(orderId);
    this.orders.getOrder(normalizedOrderId);

    const cases = this.store.getOperationsCasesByOrderId(normalizedOrderId);
    if (cases.length === 0) {
      throw new NotFoundError(`No operations case found for order: ${normalizedOrderId}`, {
        orderId: normalizedOrderId,
      });
    }

    return selectPreferredCase(cases);
  }

  /**
   * Lists all open operations cases, optionally filtered by the order's warehouse.
   * Returns an empty list when nothing matches (never null).
   *
   * @throws ValidationError when input is invalid
   */
  listOpenCases(input: ListOpenOperationsCasesInput | unknown = {}): OpenOperationsCasesList {
    const parsed = listOpenOperationsCasesInputSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw validationFromZod('listOpenCases input', parsed.error);
    }

    const warehouseId =
      parsed.data.warehouseId !== undefined
        ? parseWarehouseId(parsed.data.warehouseId)
        : undefined;

    const cases = [...this.store.casesById.values()]
      .filter((opsCase) => opsCase.status === 'open')
      .filter((opsCase) => {
        if (warehouseId === undefined) return true;
        const order = this.store.getOrder(opsCase.orderId);
        return order?.warehouseId === warehouseId;
      })
      .sort((a, b) => a.caseId.localeCompare(b.caseId));

    return { count: cases.length, cases };
  }

  /**
   * Returns the open case for an order, if any.
   */
  private findOpenCase(orderId: string): OperationsCase | undefined {
    return this.store
      .getOperationsCasesByOrderId(orderId)
      .find((opsCase) => opsCase.status === 'open');
  }

  /**
   * Generates the next `OPS-NNNN` identifier from cases already in the store.
   */
  private nextCaseId(): string {
    let max = 0;
    for (const caseId of this.store.casesById.keys()) {
      const match = CASE_ID_PATTERN.exec(caseId);
      if (!match) {
        continue;
      }
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > max) {
        max = value;
      }
    }
    return `OPS-${String(max + 1).padStart(4, '0')}`;
  }
}

function selectPreferredCase(cases: readonly OperationsCase[]): OperationsCase {
  const open = cases.find((opsCase) => opsCase.status === 'open');
  if (open) {
    return open;
  }

  const sorted = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const preferred = sorted[0];
  if (!preferred) {
    throw new NotFoundError('No operations case found');
  }
  return preferred;
}
