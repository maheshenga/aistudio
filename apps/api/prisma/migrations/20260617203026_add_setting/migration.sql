-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Setting_workspaceId_ownerId_idx" ON "Setting"("workspaceId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_workspaceId_ownerId_key_key" ON "Setting"("workspaceId", "ownerId", "key");

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
