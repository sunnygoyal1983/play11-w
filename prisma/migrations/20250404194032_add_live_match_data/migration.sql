-- CreateTable
CREATE TABLE "BallData" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "ballNumber" INTEGER NOT NULL,
    "over" DOUBLE PRECISION NOT NULL,
    "teamId" TEXT,
    "batsmanId" TEXT,
    "bowlerId" TEXT,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "isFour" BOOLEAN NOT NULL DEFAULT false,
    "isSix" BOOLEAN NOT NULL DEFAULT false,
    "isWicket" BOOLEAN NOT NULL DEFAULT false,
    "wicketType" TEXT,
    "outBatsmanId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inning" INTEGER NOT NULL DEFAULT 1,
    "sportMonkBallId" TEXT,
    "ballData" JSONB,

    CONSTRAINT "BallData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSummary" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamAScore" TEXT,
    "teamBScore" TEXT,
    "overs" TEXT,
    "currentInnings" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,

    CONSTRAINT "MatchSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BallData_matchId_idx" ON "BallData"("matchId");

-- CreateIndex
CREATE INDEX "BallData_sportMonkBallId_idx" ON "BallData"("sportMonkBallId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSummary_matchId_key" ON "MatchSummary"("matchId");

-- CreateIndex
CREATE INDEX "MatchSummary_matchId_idx" ON "MatchSummary"("matchId");

-- AddForeignKey
ALTER TABLE "BallData" ADD CONSTRAINT "BallData_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSummary" ADD CONSTRAINT "MatchSummary_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
