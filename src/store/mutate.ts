/**
 * In-memory mutations for operations cases.
 *
 * Responsibility:
 * - createCase / getCaseById / getCaseByOrderId against the in-memory store
 * - Enforce simple invariants (e.g. one open case per order) when implemented
 *
 * Note: Cases reset on process restart (no database by design).
 */

// TODO: Export createCase, getCaseById, findOpenCaseByOrderId
// TODO: Generate deterministic case IDs (e.g. CASE-XXXX)

export {};
