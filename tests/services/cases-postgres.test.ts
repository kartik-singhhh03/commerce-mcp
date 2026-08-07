import { ConflictError, NotFoundError } from '../../src/errors.js';
import { createServices } from '../../src/services/index.js';
import {
  createStore,
  getPrismaClient,
  resetOperationsCaseStoreForTests,
  resetPrismaClientForTests,
} from '../../src/store/index.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describeWithPostgres = databaseUrl ? describe : describe.skip;

function services() {
  const store = createStore();
  return { store, ...createServices(store) };
}

async function resetCaseStorage(): Promise<void> {
  if (!databaseUrl) return;
  process.env.DATABASE_URL = databaseUrl;
  resetOperationsCaseStoreForTests();
  const prisma = getPrismaClient({ databaseUrl });
  await ensureOperationCaseTable();
  await prisma.operationCase.deleteMany();
}

async function ensureOperationCaseTable(): Promise<void> {
  const prisma = getPrismaClient({ databaseUrl });
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OperationCase" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "rootCause" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "recommendedAction" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "warehouseId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "OperationCase_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "OperationCase_orderId_idx" ON "OperationCase"("orderId");',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "OperationCase_status_idx" ON "OperationCase"("status");',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "OperationCase_warehouseId_idx" ON "OperationCase"("warehouseId");',
  );
}

describeWithPostgres('OperationsCaseService PostgreSQL persistence', () => {
  beforeAll(async () => {
    await resetCaseStorage();
  });

  beforeEach(async () => {
    await resetCaseStorage();
  });

  afterAll(async () => {
    await resetPrismaClientForTests();
    resetOperationsCaseStoreForTests();
  });

  it('creates OPS-0001 and inserts it into PostgreSQL', async () => {
    const { cases } = services();

    const created = await cases.createCase({
      orderId: '#1234',
      summary: 'Order has not shipped',
      rootCause: 'Pick blocked while warehouse degraded',
      severity: 'high',
      recommendedAction: 'Unblock pick zone B or reallocate inventory',
    });

    expect(created.caseId).toBe('OPS-0001');
    expect(created.status).toBe('open');

    const row = await getPrismaClient({ databaseUrl }).operationCase.findUnique({
      where: { id: 'OPS-0001' },
    });
    expect(row).toMatchObject({
      id: 'OPS-0001',
      orderId: '1234',
      status: 'open',
      warehouseId: 'WH-EAST',
    });
  });

  it('does not lose cases when the service is restarted', async () => {
    const first = services();
    const created = await first.cases.createCase({
      orderId: '1234',
      summary: 'Persistent',
      rootCause: 'Persistent root cause',
      severity: 'medium',
      recommendedAction: 'Re-read after restart',
    });

    await resetPrismaClientForTests();
    resetOperationsCaseStoreForTests();

    const second = services();
    const fetched = await second.cases.getCase({ caseId: created.caseId });

    expect(fetched).toMatchObject({
      caseId: 'OPS-0001',
      orderId: '1234',
      status: 'open',
      summary: 'Persistent',
    });
  });

  it('keeps duplicate open case protection', async () => {
    const { cases } = services();
    await cases.createCase({
      orderId: '1234',
      summary: 'First',
      rootCause: 'First root cause',
      severity: 'high',
      recommendedAction: 'Do first thing',
    });

    await expect(
      cases.createCase({
        orderId: '#1234',
        summary: 'Duplicate',
        rootCause: 'Duplicate root cause',
        severity: 'low',
        recommendedAction: 'None',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('allows a new open case after the previous case is closed', async () => {
    const { cases } = services();
    const first = await cases.createCase({
      orderId: '1234',
      summary: 'First',
      rootCause: 'First',
      severity: 'medium',
      recommendedAction: 'Close me',
    });

    await getPrismaClient({ databaseUrl }).operationCase.update({
      where: { id: first.caseId },
      data: { status: 'closed', updatedAt: new Date() },
    });

    const second = await cases.createCase({
      orderId: '1234',
      summary: 'Second',
      rootCause: 'Still blocked',
      severity: 'high',
      recommendedAction: 'Escalate',
    });

    expect(second.caseId).toBe('OPS-0002');
    expect(second.status).toBe('open');

    const openCases = await cases.listOpenCases({ warehouseId: 'WH-EAST' });
    expect(openCases.cases.map((c) => c.caseId)).toEqual(['OPS-0002']);
  });

  it('throws NotFoundError when no case exists', async () => {
    const { cases } = services();
    await expect(cases.getCase({ orderId: '1234' })).rejects.toThrow(NotFoundError);
  });
});
