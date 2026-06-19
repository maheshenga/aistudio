-- Make "type" optional with default and "input" nullable
ALTER TABLE "GenerationJob" ALTER COLUMN "type" SET DEFAULT 'generation';
ALTER TABLE "GenerationJob" ALTER COLUMN "input" DROP NOT NULL;

-- Add frontend-aligned columns
ALTER TABLE "GenerationJob" ADD COLUMN "title" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "prompt" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "moduleId" TEXT;
