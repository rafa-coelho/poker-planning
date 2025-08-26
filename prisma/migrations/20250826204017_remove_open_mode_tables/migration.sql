/*
  Warnings:

  - You are about to drop the `open_session_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `open_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `open_tickets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `open_votes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."open_session_participants" DROP CONSTRAINT "open_session_participants_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."open_sessions" DROP CONSTRAINT "open_sessions_currentTicketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."open_tickets" DROP CONSTRAINT "open_tickets_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."open_votes" DROP CONSTRAINT "open_votes_ticketId_fkey";

-- DropTable
DROP TABLE "public"."open_session_participants";

-- DropTable
DROP TABLE "public"."open_sessions";

-- DropTable
DROP TABLE "public"."open_tickets";

-- DropTable
DROP TABLE "public"."open_votes";
