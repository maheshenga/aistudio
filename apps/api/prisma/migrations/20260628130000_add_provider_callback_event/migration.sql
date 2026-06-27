-- CreateTable
CREATE TABLE "ProviderCallbackEvent" (
    "id" TEXT NOT NULL,
    "providerKind" TEXT NOT NULL,
    "externalTaskId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCallbackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCallbackEvent_providerKind_externalEventId_key" ON "ProviderCallbackEvent"("providerKind", "externalEventId");

-- CreateIndex
CREATE INDEX "ProviderCallbackEvent_externalTaskId_idx" ON "ProviderCallbackEvent"("externalTaskId");
