import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to view team details' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const teamId = params.id;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Fetch the fantasy team with all related data
    const team = await prisma.fantasyTeam.findUnique({
      where: {
        id: teamId,
        userId: userId, // Ensure the team belongs to the logged-in user
      },
      include: {
        match: {
          select: {
            id: true,
            name: true,
            status: true,
            startTime: true,
            teamAName: true,
            teamALogo: true,
            teamBName: true,
            teamBLogo: true,
          },
        },
        contestEntries: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
                entryFee: true,
                totalSpots: true,
                filledSpots: true,
                prizePool: true,
              },
            },
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
                country: true,
                teamName: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found or you do not have permission to view it' },
        { status: 404 }
      );
    }

    // Transform the data to include player points and other calculated fields
    const transformedPlayers = team.players.map((teamPlayer) => {
      // Here you would calculate player points based on match statistics
      // For now, we'll use dummy points
      const points = 0;

      return {
        id: teamPlayer.player.id,
        name: teamPlayer.player.name,
        image: teamPlayer.player.image,
        role: teamPlayer.player.role,
        country: teamPlayer.player.country,
        team: teamPlayer.player.teamName,
        isCaptain: teamPlayer.isCaptain,
        isViceCaptain: teamPlayer.isViceCaptain,
        points: points,
        // Calculate multiplier based on captain/vice-captain status
        multiplier: teamPlayer.isCaptain
          ? 2
          : teamPlayer.isViceCaptain
          ? 1.5
          : 1,
        totalPoints:
          points *
          (teamPlayer.isCaptain ? 2 : teamPlayer.isViceCaptain ? 1.5 : 1),
      };
    });

    // Sort players by role for better display
    const sortedPlayers = [...transformedPlayers].sort((a, b) => {
      // Custom sorting logic: WK, BAT, AR, BOWL
      const roleOrder: Record<string, number> = {
        WK: 1,
        BAT: 2,
        AR: 3,
        BOWL: 4,
      };

      const roleA = a.role?.toUpperCase() || '';
      const roleB = b.role?.toUpperCase() || '';

      return (roleOrder[roleA] || 999) - (roleOrder[roleB] || 999);
    });

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

    // Calculate total points
    const totalPoints = sortedPlayers.reduce(
      (sum, player) => sum + player.totalPoints,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        matchId: team.matchId,
        match: {
          id: team.match.id,
          name: team.match.name,
          teamA: team.match.teamAName,
          teamALogo: team.match.teamALogo,
          teamB: team.match.teamBName,
          teamBLogo: team.match.teamBLogo,
          startTime: team.match.startTime,
          status: team.match.status,
        },
        players: sortedPlayers,
        totalPoints: totalPoints,
        status: status,
        contests: team.contestEntries.map((entry) => ({
          id: entry.contest.id,
          name: entry.contest.name,
          entryFee: entry.contest.entryFee,
          prizePool: entry.contest.prizePool,
          rank: entry.rank || '-',
          winAmount: entry.winAmount || 0,
        })),
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team details',
      },
      { status: 500 }
    );
  }
}

// PUT: Update team details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Please sign in to edit your team',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const teamId = params.id;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Get request body
    const data = await request.json();
    const { name, players } = data;

    if (!name || !players) {
      return NextResponse.json(
        { success: false, error: 'Name and players are required' },
        { status: 400 }
      );
    }

    // Verify user owns the team
    const team = await prisma.fantasyTeam.findUnique({
      where: {
        id: teamId,
        userId: userId,
      },
      include: {
        match: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found or you do not have permission to edit it',
        },
        { status: 404 }
      );
    }

    // Check if match has started
    const matchDate = new Date(team.match.startTime);
    const now = new Date();

    if (now >= matchDate) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit team after match has started' },
        { status: 400 }
      );
    }

    // Begin transaction to update team
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Update team name
      const teamUpdate = await tx.fantasyTeam.update({
        where: {
          id: teamId,
        },
        data: {
          name,
        },
      });

      // Validate captain and vice captain
      const captainCount = players.filter((p: any) => p.isCaptain).length;
      const viceCaptainCount = players.filter(
        (p: any) => p.isViceCaptain
      ).length;

      if (captainCount !== 1 || viceCaptainCount !== 1) {
        throw new Error(
          'Team must have exactly one captain and one vice captain'
        );
      }

      // Update player roles (captain, vice captain)
      for (const playerUpdate of players) {
        await tx.fantasyTeamPlayer.updateMany({
          where: {
            fantasyTeamId: teamId,
            playerId: playerUpdate.id,
          },
          data: {
            isCaptain: playerUpdate.isCaptain,
            isViceCaptain: playerUpdate.isViceCaptain,
          },
        });
      }

      return teamUpdate;
    });

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully',
    });
  } catch (error) {
    console.error('Error updating team:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to update team';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
