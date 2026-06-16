-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "creditBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditLedger_workspaceId_createdAt_idx" ON "CreditLedger"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedger_workspaceId_reason_idx" ON "CreditLedger"("workspaceId", "reason");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLedger_workspaceId_idempotencyKey_key" ON "CreditLedger"("workspaceId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
