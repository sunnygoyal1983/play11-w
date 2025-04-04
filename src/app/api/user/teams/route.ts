import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to view your teams' },
        { status: 401 }
      );
    }

    // Get user ID from session
    const userId = session.user.id;

    // Fetch user fantasy teams with related data
    const teams = await prisma.fantasyTeam.findMany({
      where: {
        userId: userId,
        isActive: true,
      },
      include: {
        match: {
          select: {
            id: true,
            name: true,
            status: true,
            startTime: true,
            teamAName: true,
            teamBName: true,
          },
        },
        contestEntries: {
          select: {
            id: true,
            contestId: true,
            rank: true,
            winAmount: true,
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the expected format
    const transformedTeams = teams.map((team) => {
      // Find captain and vice-captain details
      const captain = team.players.find((p) => p.isCaptain)?.player;
      const viceCaptain = team.players.find((p) => p.isViceCaptain)?.player;

      // Calculate match status
      let status = 'upcoming';
      const matchDate = new Date(team.match.startTime);
      const now = new Date();

      if (team.match.status === 'completed') {
        status = 'completed';
      } else if (
        team.match.status === 'live' ||
        (matchDate <= now && team.match.status !== 'completed')
      ) {
        status = 'live';
      }

      // Calculate points and ranks from contest entries
      let totalPoints = 0;
      let bestRank = '';

      // For completed matches, add point calculation logic here

      return {
        id: team.id,
        name: team.name,
        matchId: team.matchId,
        matchName: `${team.match.teamAName} vs ${team.match.teamBName}`,
        captainId: captain?.id || '',
        captainName: captain?.name || 'Unknown',
        viceCaptainId: viceCaptain?.id || '',
        viceCaptainName: viceCaptain?.name || 'Unknown',
        createdAt: team.createdAt.toISOString(),
        contestsJoined: team.contestEntries.length,
        points: totalPoints,
        rank: bestRank || '-',
        status: status,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedTeams,
    });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
      },
      { status: 500 }
    );
  }
}
