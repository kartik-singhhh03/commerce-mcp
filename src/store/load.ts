/**
 * JSON mock data loader.
 *
 * Responsibility:
 * - Read data/*.json at startup
 * - Validate with Zod schemas (fail fast on corrupt seed data)
 * - Build in-memory indexes (by orderId, sku, warehouseId, caseId)
 *
 * Does NOT:
 * - Mutate cases (see mutate.ts)
 * - Contain investigation / reasoning logic
 */

// TODO: Export loadStore(): CommerceStore
// TODO: Resolve data directory relative to project root (works in dist/ and tsx)

export {};
