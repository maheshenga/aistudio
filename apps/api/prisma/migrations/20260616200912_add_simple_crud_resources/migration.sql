-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "moduleId" TEXT,
    "landingUrl" TEXT,
    "linkedAssetIds" TEXT[],
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyPartner" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "invitedUsers" INTEGER NOT NULL DEFAULT 0,
    "totalCommissionCents" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payoutStatus" TEXT NOT NULL DEFAULT 'none',
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "contentSummary" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_config',
    "connectedAccounts" INTEGER NOT NULL DEFAULT 0,
    "credentialRef" TEXT,
    "clientIdLast4" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordLibrary" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL DEFAULT '',
    "sourceText" TEXT NOT NULL DEFAULT '',
    "moduleId" TEXT NOT NULL DEFAULT 'copywriting_keywords',
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[],
    "keywords" TEXT[],
    "blockedTerms" TEXT[],
    "archivedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_createdAt_idx" ON "Campaign"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_status_idx" ON "Campaign"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Announcement_workspaceId_createdAt_idx" ON "Announcement"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AgencyPartner_workspaceId_createdAt_idx" ON "AgencyPartner"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AgencyPartner_workspaceId_payoutStatus_idx" ON "AgencyPartner"("workspaceId", "payoutStatus");

-- CreateIndex
CREATE INDEX "RiskEvent_workspaceId_createdAt_idx" ON "RiskEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "RiskEvent_workspaceId_decision_idx" ON "RiskEvent"("workspaceId", "decision");

-- CreateIndex
CREATE INDEX "RiskEvent_workspaceId_severity_idx" ON "RiskEvent"("workspaceId", "severity");

-- CreateIndex
CREATE INDEX "MediaAccount_workspaceId_createdAt_idx" ON "MediaAccount"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAccount_workspaceId_status_idx" ON "MediaAccount"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "KeywordLibrary_workspaceId_createdAt_idx" ON "KeywordLibrary"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "KeywordLibrary_workspaceId_status_idx" ON "KeywordLibrary"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyPartner" ADD CONSTRAINT "AgencyPartner_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAccount" ADD CONSTRAINT "MediaAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordLibrary" ADD CONSTRAINT "KeywordLibrary_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
