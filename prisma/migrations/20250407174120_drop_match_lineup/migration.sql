/*
  Warnings:

  - You are about to drop the `MatchLineup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MatchLineup" DROP CONSTRAINT "MatchLineup_matchId_fkey";

-- DropTable
DROP TABLE "MatchLineup";
