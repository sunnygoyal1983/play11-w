import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const matchId = params.id;
    const userId = session.user.id;

    console.log(`Fetching teams for user ${userId} and match ${matchId}`);

    // Fetch user's fantasy teams for this match
    const userTeams = await prisma.fantasyTeam.findMany({
      where: {
        userId,
        matchId,
        isActive: true,
      },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        contestEntries: {
          select: {
            rank: true,
            winAmount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Find player statistics for this match to calculate points
    const playerStats = await prisma.playerStatistic.findMany({
      where: { matchId },
      select: {
        playerId: true,
        points: true,
      },
    });

    // Create a map for quick player stats lookup
    const playerStatsMap = new Map();
    playerStats.forEach((stat) => {
      playerStatsMap.set(stat.playerId, stat.points);
    });

    // Transform data for the response
    const formattedTeams = userTeams.map((team) => {
      // Calculate total team points
      let totalPoints = 0;

      // Format player data
      const players = team.players.map((teamPlayer) => {
        // Get player points from stats
        const playerPoints = playerStatsMap.get(teamPlayer.playerId) || 0;

        // Add to total team points with captain/vice-captain multipliers
        if (teamPlayer.isCaptain) {
          totalPoints += playerPoints * 2;
        } else if (teamPlayer.isViceCaptain) {
          totalPoints += playerPoints * 1.5;
        } else {
          totalPoints += playerPoints;
        }

        return {
          id: teamPlayer.playerId,
          name: teamPlayer.player.name,
          image: teamPlayer.player.image,
          role: teamPlayer.player.role,
          isCaptain: teamPlayer.isCaptain,
          isViceCaptain: teamPlayer.isViceCaptain,
          points: playerPoints,
        };
      });

      // Get the best rank and prize from contest entries
      let bestRank = null;
      let totalPrize = 0;

      team.contestEntries.forEach((entry) => {
        if (entry.winAmount && entry.winAmount > 0) {
          totalPrize += entry.winAmount;
        }

        if (entry.rank && (bestRank === null || entry.rank < bestRank)) {
          bestRank = entry.rank;
        }
      });

      return {
        id: team.id,
        name: team.name,
        captainId: team.captainId,
        viceCaptainId: team.viceCaptainId,
        points: totalPoints,
        rank: bestRank,
        prize: totalPrize > 0 ? totalPrize : null,
        players,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedTeams,
    });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user teams',
      },
      { status: 500 }
    );
  }
}
