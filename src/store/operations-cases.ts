import type { OperationCase as DbOperationCase, PrismaClient } from '@prisma/client';
import { operationsCaseSchema, type OperationsCase } from '../schemas/index.js';
import { getPrismaClient } from './prisma.js';

const CREATED_BY = 'ai-copilot';

export type PersistOperationsCaseInput = OperationsCase & {
  warehouseId?: string;
};

export class PostgresOperationsCaseStore {
  private tableEnsured = false;

  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await this.prisma.$executeRawUnsafe(`
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
      await this.prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "OperationCase_orderId_idx" ON "OperationCase"("orderId");',
      );
      await this.prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "OperationCase_status_idx" ON "OperationCase"("status");',
      );
      await this.prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "OperationCase_warehouseId_idx" ON "OperationCase"("warehouseId");',
      );
      this.tableEnsured = true;
    } catch {
      this.tableEnsured = true;
    }
  }

  async insert(input: PersistOperationsCaseInput): Promise<OperationsCase> {
    await this.ensureTable();
    const opsCase = operationsCaseSchema.parse(input);
    const row = await this.prisma.operationCase.create({
      data: {
        id: opsCase.caseId,
        orderId: opsCase.orderId,
        summary: opsCase.summary,
        rootCause: opsCase.rootCause,
        severity: opsCase.severity,
        recommendedAction: opsCase.recommendedAction,
        status: opsCase.status,
        warehouseId: input.warehouseId ?? null,
        createdAt: new Date(opsCase.createdAt),
        updatedAt: new Date(opsCase.updatedAt),
      },
    });
    return toOperationsCase(row);
  }

  async findById(caseId: string): Promise<OperationsCase | undefined> {
    await this.ensureTable();
    const row = await this.prisma.operationCase.findUnique({
      where: { id: caseId },
    });
    return row ? toOperationsCase(row) : undefined;
  }

  async findByOrderId(orderId: string): Promise<OperationsCase[]> {
    await this.ensureTable();
    const rows = await this.prisma.operationCase.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toOperationsCase);
  }

  async listOpen(): Promise<OperationsCase[]> {
    await this.ensureTable();
    const rows = await this.prisma.operationCase.findMany({
      where: { status: 'open' },
      orderBy: { id: 'asc' },
    });
    return rows.map(toOperationsCase);
  }

  async listCaseIds(): Promise<string[]> {
    await this.ensureTable();
    const rows = await this.prisma.operationCase.findMany({
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}

let operationsCaseStore: PostgresOperationsCaseStore | undefined;

export function getOperationsCaseStore(): PostgresOperationsCaseStore {
  operationsCaseStore ??= new PostgresOperationsCaseStore();
  return operationsCaseStore;
}

export function resetOperationsCaseStoreForTests(): void {
  operationsCaseStore = undefined;
}

function toOperationsCase(row: DbOperationCase): OperationsCase {
  return operationsCaseSchema.parse({
    caseId: row.id,
    orderId: row.orderId,
    status: row.status,
    summary: row.summary,
    rootCause: row.rootCause,
    severity: row.severity,
    recommendedAction: row.recommendedAction,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: CREATED_BY,
  });
}
