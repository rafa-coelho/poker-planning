/*
  Warnings:

  - You are about to drop the column `allowPublicAccess` on the `sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."sessions" DROP COLUMN "allowPublicAccess";
