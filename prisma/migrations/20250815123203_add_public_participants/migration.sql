/*
  Warnings:

  - A unique constraint covering the columns `[publicAccessCode]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "allowPublicAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicAccessCode" TEXT;

-- CreateTable
CREATE TABLE "public"."public_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_participants_sessionId_status_idx" ON "public"."public_participants"("sessionId", "status");

-- CreateIndex
CREATE INDEX "public_participants_expiresAt_idx" ON "public"."public_participants"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "public_participants_sessionId_name_key" ON "public"."public_participants"("sessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_publicAccessCode_key" ON "public"."sessions"("publicAccessCode");

-- AddForeignKey
ALTER TABLE "public"."public_participants" ADD CONSTRAINT "public_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."public_participants" ADD CONSTRAINT "public_participants_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
