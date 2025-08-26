/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `teams` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "public"."teams" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_externalId_key" ON "public"."organizations"("externalId");

-- CreateIndex
CREATE INDEX "organizations_externalId_idx" ON "public"."organizations"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_externalId_key" ON "public"."projects"("externalId");

-- CreateIndex
CREATE INDEX "projects_externalId_idx" ON "public"."projects"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_externalId_key" ON "public"."sessions"("externalId");

-- CreateIndex
CREATE INDEX "sessions_externalId_idx" ON "public"."sessions"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_externalId_key" ON "public"."teams"("externalId");

-- CreateIndex
CREATE INDEX "teams_externalId_idx" ON "public"."teams"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_externalId_key" ON "public"."tickets"("externalId");

-- CreateIndex
CREATE INDEX "tickets_externalId_idx" ON "public"."tickets"("externalId");
