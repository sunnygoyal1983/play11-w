import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log(`Fetching player statistics for match: ${matchId}`);

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      console.error(`Match not found: ${matchId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Match not found',
        },
        { status: 404 }
      );
    }

    // Fetch player statistics with player and team data
    const playerStatistics = await prisma.playerStatistic.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            teamName: true,
          },
        },
      },
      orderBy: [{ points: 'desc' }],
    });

    // Transform data to include player name and image
    const formattedStats = playerStatistics.map((stat) => ({
      id: stat.id,
      matchId: stat.matchId,
      playerId: stat.playerId,
      playerName: stat.player.name,
      playerImage: stat.player.image,
      teamName: stat.player.teamName || 'Unknown Team',
      role: stat.player.role,
      points: stat.points,
      runs: stat.runs,
      balls: stat.balls,
      fours: stat.fours,
      sixes: stat.sixes,
      strikeRate: stat.strikeRate,
      wickets: stat.wickets,
      overs: stat.overs,
      maidens: stat.maidens,
      economy: stat.economy,
      runsConceded: stat.runsConceded,
      catches: stat.catches,
      stumpings: stat.stumpings,
      runOuts: stat.runOuts,
    }));

    console.log(
      `Found ${formattedStats.length} player statistics for match ${matchId}`
    );
    return NextResponse.json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    console.error('Error fetching player statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch player statistics',
      },
      { status: 500 }
    );
  }
}
