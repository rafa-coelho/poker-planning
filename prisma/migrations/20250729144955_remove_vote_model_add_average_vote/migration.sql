/*
  Warnings:

  - You are about to drop the `votes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT "votes_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "votes" DROP CONSTRAINT "votes_userId_fkey";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "averageVote" DOUBLE PRECISION;

-- DropTable
DROP TABLE "votes";
