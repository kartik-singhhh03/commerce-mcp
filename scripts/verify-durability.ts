import { ConflictError, ValidationError } from '../src/errors.js';
import { createServices } from '../src/services/index.js';
import {
  createStore,
  getPrismaClient,
  resetOperationsCaseStoreForTests,
  resetPrismaClientForTests,
} from '../src/store/index.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for durability verification script.');
  process.exit(1);
}

const apiKey = process.env.OPS_API_KEY ?? 'ops-secret-key';

console.log('--- Starting Operations Case PostgreSQL Durability & Guardrail Verification ---');

const prisma = getPrismaClient();

// Ensure database table exists before deleting
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

await prisma.operationCase.deleteMany();
console.log('1. Cleared existing database cases');

const store1 = createStore();
const services1 = createServices(store1);

// Step 1: Unauthenticated case creation must be rejected
try {
  await services1.cases.createCase({
    orderId: '#1234',
    summary: 'Unauthenticated case creation',
    rootCause: 'Testing guardrail rejection',
    severity: 'high',
    recommendedAction: 'Should fail',
  });
  console.error('ERROR: Unauthenticated case creation succeeded when it should have failed!');
  process.exit(1);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('2. Unauthenticated case creation rejected by server-side guardrail (ValidationError)');
  } else {
    throw error;
  }
}

// Step 2: Authorized Case Creation
const created1 = await services1.cases.createCase({
  apiKey,
  orderId: '#1234',
  summary: 'Durability test order delay',
  rootCause: 'Pick blocked while WH-EAST is degraded',
  severity: 'high',
  recommendedAction: 'Clear conveyor belt in Pick Zone B',
});

console.log(`3. Created case with apiKey: ${created1.caseId} (status: ${created1.status})`);

// Step 3: Verify duplicate open case protection
try {
  await services1.cases.createCase({
    apiKey,
    orderId: '1234',
    summary: 'Duplicate case attempt',
    rootCause: 'Duplicate',
    severity: 'low',
    recommendedAction: 'None',
  });
  console.error('ERROR: Duplicate case creation succeeded when it should have failed!');
  process.exit(1);
} catch (error) {
  if (error instanceof ConflictError) {
    console.log('4. Duplicate open case protection verified (ConflictError caught)');
  } else {
    throw error;
  }
}

// Step 4: Simulate application restart
await resetPrismaClientForTests();
resetOperationsCaseStoreForTests();
console.log('5. Simulated server restart (disconnected Prisma client & reset store state)');

// Step 5: Verify case survives restart
const store2 = createStore();
const services2 = createServices(store2);

const fetchedAfterRestart = await services2.cases.getCase({ caseId: created1.caseId });
console.log(`6. Fetched after restart: ${fetchedAfterRestart.caseId}`);
console.log(`   Summary: "${fetchedAfterRestart.summary}"`);
console.log(`   Warehouse: ${store2.getOrder(fetchedAfterRestart.orderId)?.warehouseId}`);

const openCases = await services2.cases.listOpenCases({ warehouseId: 'WH-EAST' });
console.log(`7. Listed open cases for WH-EAST after restart: count = ${openCases.count}`);

if (openCases.count !== 1 || openCases.cases[0]?.caseId !== created1.caseId) {
  console.error('ERROR: Open cases list after restart mismatch');
  process.exit(1);
}

// Step 6: Close case & create subsequent case with apiKey
const restartPrisma = getPrismaClient();
await restartPrisma.operationCase.update({
  where: { id: created1.caseId },
  data: { status: 'closed', updatedAt: new Date() },
});
console.log(`8. Closed case ${created1.caseId}`);

const created2 = await services2.cases.createCase({
  apiKey,
  orderId: '1234',
  summary: 'Subsequent case after resolution',
  rootCause: 'New issue detected',
  severity: 'medium',
  recommendedAction: 'Inspect packing line',
});

console.log(`9. Created subsequent case with apiKey after closing: ${created2.caseId} (status: ${created2.status})`);

await resetPrismaClientForTests();
resetOperationsCaseStoreForTests();

console.log('--- ALL DURABILITY & GUARDRAIL VERIFICATIONS PASSED SUCCESSFULLY ---');
