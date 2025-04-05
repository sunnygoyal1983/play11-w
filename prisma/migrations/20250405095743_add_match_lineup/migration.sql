-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamAPlayers" JSONB NOT NULL,
    "teamBPlayers" JSONB NOT NULL,
    "tossWinner" TEXT,
    "isTossComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_key" ON "MatchLineup"("matchId");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_idx" ON "MatchLineup"("matchId");

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
