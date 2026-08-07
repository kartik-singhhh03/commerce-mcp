-- CreateTable
CREATE TABLE "OperationCase" (
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

-- CreateIndex
CREATE INDEX "OperationCase_orderId_idx" ON "OperationCase"("orderId");

-- CreateIndex
CREATE INDEX "OperationCase_status_idx" ON "OperationCase"("status");

-- CreateIndex
CREATE INDEX "OperationCase_warehouseId_idx" ON "OperationCase"("warehouseId");
