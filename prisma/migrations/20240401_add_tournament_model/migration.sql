-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "sportMonkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "image" TEXT,
    "country" TEXT,
    "season" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "sportMonkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "image" TEXT,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "sportMonkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "venue" TEXT,
    "teamAId" TEXT NOT NULL,
    "teamAName" TEXT NOT NULL,
    "teamALogo" TEXT,
    "teamBId" TEXT NOT NULL,
    "teamBName" TEXT NOT NULL,
    "teamBLogo" TEXT,
    "leagueId" TEXT,
    "leagueName" TEXT,
    "result" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "sportMonkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "country" TEXT,
    "teamId" TEXT,
    "teamName" TEXT,
    "role" TEXT,
    "battingStyle" TEXT,
    "bowlingStyle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_sportMonkId_key" ON "Tournament"("sportMonkId");
CREATE UNIQUE INDEX "Team_sportMonkId_key" ON "Team"("sportMonkId");
CREATE UNIQUE INDEX "Match_sportMonkId_key" ON "Match"("sportMonkId");
CREATE UNIQUE INDEX "Player_sportMonkId_key" ON "Player"("sportMonkId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "Tournament"("sportMonkId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("sportMonkId") ON DELETE SET NULL ON UPDATE CASCADE; 