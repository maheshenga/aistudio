-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'manual',
    "lifecycleStage" TEXT NOT NULL DEFAULT 'new_lead',
    "ownerId" TEXT,
    "tags" TEXT[],
    "source" JSONB,
    "notes" TEXT,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_workspaceId_createdAt_idx" ON "Customer"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_workspaceId_lifecycleStage_idx" ON "Customer"("workspaceId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Customer_workspaceId_channel_idx" ON "Customer"("workspaceId", "channel");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
