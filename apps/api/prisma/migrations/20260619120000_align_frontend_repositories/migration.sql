-- AlterTable: Asset — align with frontend WorkspaceAsset (name/size/source/moduleId/tags/previewUrl/userId/updatedAt/lastAccessedAt)
ALTER TABLE "Asset" ADD COLUMN "userId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "name" TEXT;
ALTER TABLE "Asset" ADD COLUMN "size" TEXT NOT NULL DEFAULT '0 KB';
ALTER TABLE "Asset" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'uploaded';
ALTER TABLE "Asset" ADD COLUMN "moduleId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Asset" ADD COLUMN "previewUrl" TEXT;
ALTER TABLE "Asset" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Asset" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

-- AlterTable: UsageEvent — align with frontend WorkspaceUsageEvent (moduleId/targetType/targetId/providerKind/runtimeMode; kind<->category)
ALTER TABLE "UsageEvent" ADD COLUMN "moduleId" TEXT;
ALTER TABLE "UsageEvent" ADD COLUMN "targetType" TEXT;
ALTER TABLE "UsageEvent" ADD COLUMN "targetId" TEXT;
ALTER TABLE "UsageEvent" ADD COLUMN "providerKind" TEXT;
ALTER TABLE "UsageEvent" ADD COLUMN "runtimeMode" TEXT;

-- AlterTable: AuditLog — align with frontend AuditLog (actor.id<->userId, actor.email<->actorEmail)
ALTER TABLE "AuditLog" ADD COLUMN "actorEmail" TEXT;
