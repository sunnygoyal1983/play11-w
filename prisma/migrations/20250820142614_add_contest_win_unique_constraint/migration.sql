/*
  Warnings:

  - You are about to drop the column `ballData` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `inning` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `isFour` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `isSix` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `outBatsmanId` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `over` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `BallData` table. All the data in the column will be lost.
  - You are about to drop the column `wicketType` on the `BallData` table. All the data in the column will be lost.
  - You are about to alter the column `batsmanId` on the `BallData` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `bowlerId` on the `BallData` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `firstPrize` on the `Contest` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Contest` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrize` on the `Contest` table. All the data in the column will be lost.
  - You are about to drop the column `winnerCount` on the `Contest` table. All the data in the column will be lost.
  - You are about to drop the column `winnerPercentage` on the `Contest` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Contest` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `entryFee` on the `Contest` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `prizePool` on the `Contest` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `points` on the `ContestEntry` table. All the data in the column will be lost.
  - You are about to drop the column `winAmount` on the `ContestEntry` table. All the data in the column will be lost.
  - You are about to drop the column `captainId` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `viceCaptainId` on the `FantasyTeam` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FantasyTeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FantasyTeamPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `leagueId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `leagueName` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `sportMonkId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamAId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamALogo` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamAName` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamBId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamBLogo` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `teamBName` on the `Match` table. All the data in the column will be lost.
  - The `status` column on the `Match` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `venue` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to drop the column `isCaptain` on the `MatchPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `isSubstitute` on the `MatchPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `isViceCaptain` on the `MatchPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `MatchPlayer` table. All the data in the column will be lost.
  - You are about to drop the column `selected` on the `MatchPlayer` table. All the data in the column will be lost.
  - You are about to alter the column `teamId` on the `MatchPlayer` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `currentInnings` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `overs` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `rawData` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `teamAScore` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `teamBScore` on the `MatchSummary` table. All the data in the column will be lost.
  - You are about to drop the column `battingStyle` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `bowlingStyle` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `sportMonkId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `teamName` on the `Player` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Player` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `teamId` on the `Player` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `balls` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `economy` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `maidens` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `overs` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `runsConceded` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to drop the column `stumpings` on the `PlayerStatistic` table. All the data in the column will be lost.
  - You are about to alter the column `strikeRate` on the `PlayerStatistic` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.
  - You are about to drop the column `rank` on the `PrizeBreakup` table. All the data in the column will be lost.
  - You are about to alter the column `prize` on the `PrizeBreakup` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to drop the column `category` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Setting` table. All the data in the column will be lost.
  - You are about to alter the column `key` on the `Setting` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `Setting` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to drop the column `country` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `sportMonkId` on the `Team` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `shortName` on the `Team` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to drop the column `country` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `season` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `seasonId` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `shortName` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `sportMonkId` on the `Tournament` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Tournament` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to drop the column `metadata` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Transaction` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `accountHolderName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ifscCode` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `password` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `walletBalance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `address` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `panNumber` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `phone` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - A unique constraint covering the columns `[sportMonkBallId]` on the table `BallData` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contestId,userId,fantasyTeamId]` on the table `ContestEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,matchId,teamName]` on the table `FantasyTeam` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fantasyTeamId,playerId]` on the table `FantasyTeamPlayer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sportMonkApiId]` on the table `Match` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sportMonkApiId]` on the table `MatchSummary` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sportMonkApiId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[panNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `overNumber` to the `BallData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sportMonkBallId` to the `BallData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contestType` to the `Contest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Contest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ContestEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamName` to the `FantasyTeam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchDate` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchType` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sportMonkApiId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team1Id` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team1Name` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team2Id` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team2Name` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournamentId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sportMonkApiId` to the `MatchSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `MatchSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MatchSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sportMonkApiId` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Made the column `teamId` on table `Player` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `role` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Made the column `strikeRate` on table `PlayerStatistic` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `rankFrom` to the `PrizeBreakup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rankTo` to the `PrizeBreakup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceAfter` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CONTEST_WIN', 'CONTEST_ENTRY', 'REFUND', 'BONUS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContestType" AS ENUM ('HEAD_TO_HEAD', 'SMALL', 'MEDIUM', 'GRAND');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER');

-- DropForeignKey
ALTER TABLE "Contest" DROP CONSTRAINT "Contest_matchId_fkey";

-- DropForeignKey
ALTER TABLE "ContestEntry" DROP CONSTRAINT "ContestEntry_contestId_fkey";

-- DropForeignKey
ALTER TABLE "ContestEntry" DROP CONSTRAINT "ContestEntry_fantasyTeamId_fkey";

-- DropForeignKey
ALTER TABLE "ContestEntry" DROP CONSTRAINT "ContestEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "MatchPlayer" DROP CONSTRAINT "MatchPlayer_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchPlayer" DROP CONSTRAINT "MatchPlayer_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_teamId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_matchId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerStatistic" DROP CONSTRAINT "PlayerStatistic_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PrizeBreakup" DROP CONSTRAINT "PrizeBreakup_contestId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex
DROP INDEX "ContestEntry_userId_contestId_fantasyTeamId_key";

-- DropIndex
DROP INDEX "Match_sportMonkId_key";

-- DropIndex
DROP INDEX "MatchSummary_matchId_key";

-- DropIndex
DROP INDEX "Player_sportMonkId_key";

-- DropIndex
DROP INDEX "PrizeBreakup_contestId_rank_key";

-- DropIndex
DROP INDEX "Team_sportMonkId_key";

-- DropIndex
DROP INDEX "Tournament_sportMonkId_key";

-- AlterTable
ALTER TABLE "BallData" DROP COLUMN "ballData",
DROP COLUMN "inning",
DROP COLUMN "isFour",
DROP COLUMN "isSix",
DROP COLUMN "outBatsmanId",
DROP COLUMN "over",
DROP COLUMN "teamId",
DROP COLUMN "timestamp",
DROP COLUMN "wicketType",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isBye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLegBye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNoBall" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overNumber" INTEGER NOT NULL,
ALTER COLUMN "batsmanId" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "bowlerId" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "runs" DROP DEFAULT,
DROP COLUMN "sportMonkBallId",
ADD COLUMN     "sportMonkBallId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Contest" DROP COLUMN "firstPrize",
DROP COLUMN "isActive",
DROP COLUMN "totalPrize",
DROP COLUMN "winnerCount",
DROP COLUMN "winnerPercentage",
ADD COLUMN     "contestStatus" "ContestStatus" NOT NULL DEFAULT 'UPCOMING',
ADD COLUMN     "contestType" "ContestType" NOT NULL,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTeamsPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "winningPercentage" INTEGER,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "entryFee" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "prizePool" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ContestEntry" DROP COLUMN "points",
DROP COLUMN "winAmount",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "prize" DECIMAL(10,2),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FantasyTeam" DROP COLUMN "captainId",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "viceCaptainId",
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "teamName" VARCHAR(100) NOT NULL,
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FantasyTeamPlayer" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "endTime",
DROP COLUMN "format",
DROP COLUMN "isActive",
DROP COLUMN "leagueId",
DROP COLUMN "leagueName",
DROP COLUMN "name",
DROP COLUMN "result",
DROP COLUMN "sportMonkId",
DROP COLUMN "startTime",
DROP COLUMN "teamAId",
DROP COLUMN "teamALogo",
DROP COLUMN "teamAName",
DROP COLUMN "teamBId",
DROP COLUMN "teamBLogo",
DROP COLUMN "teamBName",
ADD COLUMN     "matchDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "matchType" VARCHAR(50) NOT NULL,
ADD COLUMN     "sportMonkApiId" INTEGER NOT NULL,
ADD COLUMN     "team1Id" VARCHAR(50) NOT NULL,
ADD COLUMN     "team1Name" VARCHAR(100) NOT NULL,
ADD COLUMN     "team1Score" VARCHAR(50),
ADD COLUMN     "team2Id" VARCHAR(50) NOT NULL,
ADD COLUMN     "team2Name" VARCHAR(100) NOT NULL,
ADD COLUMN     "team2Score" VARCHAR(50),
ADD COLUMN     "tournamentId" TEXT NOT NULL,
ADD COLUMN     "winner" VARCHAR(100),
DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
ALTER COLUMN "venue" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "MatchPlayer" DROP COLUMN "isCaptain",
DROP COLUMN "isSubstitute",
DROP COLUMN "isViceCaptain",
DROP COLUMN "points",
DROP COLUMN "selected",
ADD COLUMN     "isPlaying" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "teamId" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "MatchSummary" DROP COLUMN "currentInnings",
DROP COLUMN "lastUpdated",
DROP COLUMN "overs",
DROP COLUMN "rawData",
DROP COLUMN "status",
DROP COLUMN "teamAScore",
DROP COLUMN "teamBScore",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sportMonkApiId" INTEGER NOT NULL,
ADD COLUMN     "summary" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "battingStyle",
DROP COLUMN "bowlingStyle",
DROP COLUMN "country",
DROP COLUMN "isActive",
DROP COLUMN "sportMonkId",
DROP COLUMN "teamName",
ADD COLUMN     "creditValue" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sportMonkApiId" INTEGER NOT NULL,
ADD COLUMN     "totalPoints" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "teamId" SET NOT NULL,
ALTER COLUMN "teamId" SET DATA TYPE VARCHAR(50),
DROP COLUMN "role",
ADD COLUMN     "role" "PlayerRole" NOT NULL;

-- AlterTable
ALTER TABLE "PlayerStatistic" DROP COLUMN "balls",
DROP COLUMN "economy",
DROP COLUMN "maidens",
DROP COLUMN "overs",
DROP COLUMN "points",
DROP COLUMN "runsConceded",
DROP COLUMN "stumpings",
ADD COLUMN     "ballsFaced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "economyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fantasyPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "oversBowled" DECIMAL(3,1) NOT NULL DEFAULT 0,
ALTER COLUMN "strikeRate" SET NOT NULL,
ALTER COLUMN "strikeRate" SET DEFAULT 0,
ALTER COLUMN "strikeRate" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "PrizeBreakup" DROP COLUMN "rank",
ADD COLUMN     "rankFrom" INTEGER NOT NULL,
ADD COLUMN     "rankTo" INTEGER NOT NULL,
ALTER COLUMN "prize" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "category",
DROP COLUMN "type",
ALTER COLUMN "key" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "value" DROP NOT NULL,
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "country",
DROP COLUMN "image",
DROP COLUMN "isActive",
DROP COLUMN "sportMonkId",
ADD COLUMN     "logo" TEXT,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "shortName" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "country",
DROP COLUMN "image",
DROP COLUMN "season",
DROP COLUMN "seasonId",
DROP COLUMN "shortName",
DROP COLUMN "sportMonkId",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sport" VARCHAR(50) NOT NULL DEFAULT 'cricket',
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "metadata",
DROP COLUMN "reference",
ADD COLUMN     "balanceAfter" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "paymentGateway" VARCHAR(50),
ADD COLUMN     "paymentMethod" VARCHAR(50),
ADD COLUMN     "referenceId" VARCHAR(100),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountHolderName",
DROP COLUMN "accountNumber",
DROP COLUMN "bankName",
DROP COLUMN "ifscCode",
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "password" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "walletBalance" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "panNumber" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(15);

-- CreateIndex
CREATE UNIQUE INDEX "BallData_sportMonkBallId_key" ON "BallData"("sportMonkBallId");

-- CreateIndex
CREATE INDEX "BallData_sportMonkBallId_idx" ON "BallData"("sportMonkBallId");

-- CreateIndex
CREATE INDEX "BallData_batsmanId_idx" ON "BallData"("batsmanId");

-- CreateIndex
CREATE INDEX "BallData_bowlerId_idx" ON "BallData"("bowlerId");

-- CreateIndex
CREATE INDEX "Contest_matchId_idx" ON "Contest"("matchId");

-- CreateIndex
CREATE INDEX "Contest_contestStatus_idx" ON "Contest"("contestStatus");

-- CreateIndex
CREATE INDEX "Contest_createdBy_idx" ON "Contest"("createdBy");

-- CreateIndex
CREATE INDEX "Contest_contestType_idx" ON "Contest"("contestType");

-- CreateIndex
CREATE INDEX "Contest_entryFee_idx" ON "Contest"("entryFee");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_idx" ON "ContestEntry"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE INDEX "ContestEntry_fantasyTeamId_idx" ON "ContestEntry"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "ContestEntry_rank_idx" ON "ContestEntry"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contestId_userId_fantasyTeamId_key" ON "ContestEntry"("contestId", "userId", "fantasyTeamId");

-- CreateIndex
CREATE INDEX "FantasyTeam_userId_idx" ON "FantasyTeam"("userId");

-- CreateIndex
CREATE INDEX "FantasyTeam_matchId_idx" ON "FantasyTeam"("matchId");

-- CreateIndex
CREATE INDEX "FantasyTeam_totalPoints_idx" ON "FantasyTeam"("totalPoints");

-- CreateIndex
CREATE INDEX "FantasyTeam_rank_idx" ON "FantasyTeam"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_userId_matchId_teamName_key" ON "FantasyTeam"("userId", "matchId", "teamName");

-- CreateIndex
CREATE INDEX "FantasyTeamPlayer_fantasyTeamId_idx" ON "FantasyTeamPlayer"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "FantasyTeamPlayer_playerId_idx" ON "FantasyTeamPlayer"("playerId");

-- CreateIndex
CREATE INDEX "FantasyTeamPlayer_isCaptain_idx" ON "FantasyTeamPlayer"("isCaptain");

-- CreateIndex
CREATE INDEX "FantasyTeamPlayer_isViceCaptain_idx" ON "FantasyTeamPlayer"("isViceCaptain");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeamPlayer_fantasyTeamId_playerId_key" ON "FantasyTeamPlayer"("fantasyTeamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_sportMonkApiId_key" ON "Match"("sportMonkApiId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_sportMonkApiId_idx" ON "Match"("sportMonkApiId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_matchDate_idx" ON "Match"("matchDate");

-- CreateIndex
CREATE INDEX "MatchPlayer_matchId_idx" ON "MatchPlayer"("matchId");

-- CreateIndex
CREATE INDEX "MatchPlayer_playerId_idx" ON "MatchPlayer"("playerId");

-- CreateIndex
CREATE INDEX "MatchPlayer_teamId_idx" ON "MatchPlayer"("teamId");

-- CreateIndex
CREATE INDEX "MatchPlayer_isPlaying_idx" ON "MatchPlayer"("isPlaying");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSummary_sportMonkApiId_key" ON "MatchSummary"("sportMonkApiId");

-- CreateIndex
CREATE INDEX "MatchSummary_sportMonkApiId_idx" ON "MatchSummary"("sportMonkApiId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_sportMonkApiId_key" ON "Player"("sportMonkApiId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE INDEX "Player_role_idx" ON "Player"("role");

-- CreateIndex
CREATE INDEX "Player_sportMonkApiId_idx" ON "Player"("sportMonkApiId");

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE INDEX "PlayerStatistic_matchId_idx" ON "PlayerStatistic"("matchId");

-- CreateIndex
CREATE INDEX "PlayerStatistic_playerId_idx" ON "PlayerStatistic"("playerId");

-- CreateIndex
CREATE INDEX "PlayerStatistic_fantasyPoints_idx" ON "PlayerStatistic"("fantasyPoints");

-- CreateIndex
CREATE INDEX "PrizeBreakup_contestId_idx" ON "PrizeBreakup"("contestId");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_isPublic_idx" ON "Setting"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Tournament_isActive_idx" ON "Tournament"("isActive");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_referenceId_idx" ON "Transaction"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_panNumber_key" ON "User"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_panNumber_idx" ON "User"("panNumber");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayer" ADD CONSTRAINT "MatchPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeBreakup" ADD CONSTRAINT "PrizeBreakup_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatistic" ADD CONSTRAINT "PlayerStatistic_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatistic" ADD CONSTRAINT "PlayerStatistic_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create unique constraint for contest win transactions
CREATE OR REPLACE FUNCTION get_entry_id(metadata jsonb) 
RETURNS text AS $$
BEGIN
  RETURN metadata->>'entryId';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE UNIQUE INDEX unique_contest_win_entry
ON "Transaction" (type, get_entry_id(metadata))
WHERE type = 'contest_win' AND metadata->>'entryId' IS NOT NULL;

COMMENT ON INDEX unique_contest_win_entry IS 'Prevents duplicate contest_win transactions for the same entry';
