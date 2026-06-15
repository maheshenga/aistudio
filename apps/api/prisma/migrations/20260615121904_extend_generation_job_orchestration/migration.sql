-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "currentStep" TEXT,
ADD COLUMN     "externalRef" JSONB,
ADD COLUMN     "externalTaskId" TEXT,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "providerKind" TEXT,
ADD COLUMN     "runtimeMode" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "GenerationJob_externalTaskId_idx" ON "GenerationJob"("externalTaskId");
