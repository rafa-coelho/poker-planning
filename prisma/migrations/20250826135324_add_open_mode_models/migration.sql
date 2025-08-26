-- AlterTable
ALTER TABLE "public"."open_sessions" ALTER COLUMN "expiresAt" SET DEFAULT (NOW() + INTERVAL '24 hours');
