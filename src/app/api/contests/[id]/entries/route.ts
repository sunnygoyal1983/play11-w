import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Build the query based on whether we want all entries or just for a specific user
    const whereClause = userId ? { contestId, userId } : { contestId };

    // Fetch contest entries
    const entries = await prisma.contestEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        rank: true,
        winAmount: true,
        fantasyTeamId: true,
        userId: true,
        fantasyTeam: {
          select: {
            id: true,
            name: true,
            captainId: true,
            viceCaptainId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [{ rank: 'asc' }],
    });

    // Fetch player statistics to calculate points
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { matchId: true },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Add calculated points for display purposes
    const entriesWithPoints = await Promise.all(
      entries.map(async (entry) => {
        // Get the team players
        const teamPlayers = await prisma.fantasyTeamPlayer.findMany({
          where: { fantasyTeamId: entry.fantasyTeamId },
          include: { player: true },
        });

        // Get player statistics
        const playerIds = teamPlayers.map((tp) => tp.playerId);
        const playerStats = await prisma.playerStatistic.findMany({
          where: {
            matchId: contest.matchId,
            playerId: { in: playerIds },
          },
        });

        // Calculate total points
        let totalPoints = 0;
        const statsMap = new Map(
          playerStats.map((stat) => [stat.playerId, stat])
        );

        for (const teamPlayer of teamPlayers) {
          const playerStat = statsMap.get(teamPlayer.playerId);
          if (playerStat) {
            let points = playerStat.points;

            // Apply captain and vice-captain multipliers
            if (teamPlayer.isCaptain) {
              points *= 2;
            } else if (teamPlayer.isViceCaptain) {
              points *= 1.5;
            }

            totalPoints += points;
          }
        }

        return {
          ...entry,
          points: parseFloat(totalPoints.toFixed(2)),
        };
      })
    );

    // Sort by points in descending order
    const sortedEntries = entriesWithPoints.sort((a, b) => b.points - a.points);

    return NextResponse.json(sortedEntries);
  } catch (error) {
    console.error('Error fetching contest entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest entries' },
      { status: 500 }
    );
  }
}
