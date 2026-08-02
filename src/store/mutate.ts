import { normalizeOrderId, operationsCaseSchema, type OperationsCase } from '../schemas/index.js';
import type { CommerceStore } from './load.js';

export type InsertOperationsCaseInput = OperationsCase;

/**
 * Inserts a validated operations case into the in-memory store.
 * Does not write to the filesystem. Replaces an existing case with the same caseId.
 *
 * @param store - Target commerce store
 * @param input - Full operations case (or unknown value validated via Zod)
 * @returns The validated case that was stored
 */
export function insertOperationsCase(
  store: CommerceStore,
  input: InsertOperationsCaseInput | unknown,
): OperationsCase {
  const opsCase = operationsCaseSchema.parse(input);
  const orderId = normalizeOrderId(opsCase.orderId);
  const normalized: OperationsCase = { ...opsCase, orderId };

  const previous = store.casesById.get(normalized.caseId);
  store.casesById.set(normalized.caseId, normalized);

  if (previous) {
    const prevOrderId = normalizeOrderId(previous.orderId);
    const prevBucket = store.casesByOrderId.get(prevOrderId);
    if (prevBucket) {
      const nextBucket = prevBucket.filter((item) => item.caseId !== normalized.caseId);
      if (nextBucket.length === 0) {
        store.casesByOrderId.delete(prevOrderId);
      } else {
        store.casesByOrderId.set(prevOrderId, nextBucket);
      }
    }
  }

  const bucket = store.casesByOrderId.get(orderId);
  if (bucket) {
    const withoutSelf = bucket.filter((item) => item.caseId !== normalized.caseId);
    withoutSelf.push(normalized);
    store.casesByOrderId.set(orderId, withoutSelf);
  } else {
    store.casesByOrderId.set(orderId, [normalized]);
  }

  return normalized;
}

/**
 * Removes an operations case from the in-memory store.
 * Does not write to the filesystem.
 *
 * @param store - Target commerce store
 * @param caseId - Case identifier to remove
 * @returns The removed case, or undefined if it did not exist
 */
export function deleteOperationsCase(
  store: CommerceStore,
  caseId: string,
): OperationsCase | undefined {
  const existing = store.casesById.get(caseId);
  if (!existing) {
    return undefined;
  }

  store.casesById.delete(caseId);
  const orderId = normalizeOrderId(existing.orderId);
  const bucket = store.casesByOrderId.get(orderId);
  if (bucket) {
    const nextBucket = bucket.filter((item) => item.caseId !== caseId);
    if (nextBucket.length === 0) {
      store.casesByOrderId.delete(orderId);
    } else {
      store.casesByOrderId.set(orderId, nextBucket);
    }
  }

  return existing;
}
