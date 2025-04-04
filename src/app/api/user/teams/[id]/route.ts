import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id;

    // Get fantasy team
    const team = await prisma.fantasyTeam.findUnique({
      where: {
        id: teamId,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Fantasy team not found' },
        { status: 404 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: {
        id: team.userId,
      },
      select: {
        name: true,
        image: true,
      },
    });

    // Get match details
    const matchDetails = await prisma.match.findUnique({
      where: {
        id: team.matchId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        teamAName: true,
        teamBName: true,
        startTime: true,
      },
    });

    // Get team players directly from the join table
    const teamPlayerRecords = await prisma.fantasyTeamPlayer.findMany({
      where: {
        fantasyTeamId: teamId,
      },
    });

    console.log(`Found ${teamPlayerRecords.length} team player records`);
    console.log(
      'Team player record IDs:',
      teamPlayerRecords.map((tp) => tp.playerId)
    );

    // Get the player IDs
    const playerIds = teamPlayerRecords.map((tp) => tp.playerId);

    // Get the actual player data
    const players = await prisma.player.findMany({
      where: {
        id: {
          in: playerIds,
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        country: true,
        teamName: true,
      },
    });

    console.log(`Found ${players.length} player records`);
    if (players.length > 0) {
      console.log('First player:', players[0]);
    } else {
      console.log('No player records found. Attempting to debug:');
      // Check if any players exist at all in the database
      const samplePlayers = await prisma.player.findMany({
        take: 5,
      });
      console.log(`Sample players in database: ${samplePlayers.length}`);
      if (samplePlayers.length > 0) {
        console.log('Sample player:', samplePlayers[0]);
      }
    }

    // Get player statistics from the database
    const playerStats = await prisma.playerStatistic.findMany({
      where: {
        matchId: team.matchId,
        playerId: {
          in: playerIds,
        },
      },
    });

    console.log(
      `Found ${playerStats.length} player statistics records for match ${team.matchId}`
    );

    // Create a map for quick lookup of player statistics
    const playerStatsMap = new Map();
    playerStats.forEach((stat) => {
      playerStatsMap.set(stat.playerId, stat);
    });

    // Map captain and vice-captain status to players
    const captainMap = teamPlayerRecords.reduce((map, tp) => {
      map[tp.playerId] = {
        isCaptain: tp.isCaptain,
        isViceCaptain: tp.isViceCaptain,
      };
      return map;
    }, {} as Record<string, { isCaptain: boolean; isViceCaptain: boolean }>);

    console.log('Captain map:', captainMap);

    // Transform players with correct statistics and points
    const transformedPlayers: Array<{
      id: string;
      name: string;
      image: string | null;
      role: string;
      country: string | null;
      team: string | null;
      isCaptain: boolean;
      isViceCaptain: boolean;
      points: number;
      multiplier: number;
      totalPoints: number;
    }> = [];

    if (players.length > 0) {
      players.forEach((player) => {
        // Standardize role format to WK, BAT, AR, BOWL
        let role = 'OTHER';
        if (player.role) {
          const upperRole = player.role.toUpperCase();
          if (
            upperRole.includes('KEEPER') ||
            upperRole.includes('WICKET') ||
            upperRole === 'WK'
          ) {
            role = 'WK';
          } else if (upperRole.includes('BAT') || upperRole === 'BATSMAN') {
            role = 'BAT';
          } else if (
            upperRole.includes('ROUND') ||
            upperRole === 'AR' ||
            upperRole === 'ALL-ROUNDER'
          ) {
            role = 'AR';
          } else if (upperRole.includes('BOWL') || upperRole === 'BOWLER') {
            role = 'BOWL';
          }
        }

        // Get player statistics from the database
        const playerStat = playerStatsMap.get(player.id);
        let points = 0;
        let playerStatsText = '';

        if (playerStat) {
          // Use actual player statistics
          points = playerStat.points || 0;
          playerStatsText = `${playerStat.runs || 0} runs, ${
            playerStat.fours || 0
          } fours, ${playerStat.sixes || 0} sixes, ${
            playerStat.wickets || 0
          } wickets, ${playerStat.catches || 0} catches`;
        } else {
          // No statistics found for this player in this match
          // This is fine if match hasn't started yet
          playerStatsText = 'No statistics available';
        }

        console.log(
          `Player ${player.name} (${role}): ${points} points [${playerStatsText}]`
        );

        const isCaptain = captainMap[player.id]?.isCaptain || false;
        const isViceCaptain = captainMap[player.id]?.isViceCaptain || false;
        const multiplier = isCaptain ? 2 : isViceCaptain ? 1.5 : 1;

        transformedPlayers.push({
          id: player.id,
          name: player.name,
          image: player.image,
          role: role,
          country: player.country,
          team: player.teamName,
          isCaptain,
          isViceCaptain,
          points,
          multiplier,
          totalPoints:
            points > 0 ? Math.round(points * multiplier * 10) / 10 : 0,
        });
      });

      console.log(`Transformed ${transformedPlayers.length} players`);
      console.log('First transformed player:', transformedPlayers[0]);
    }

    // Calculate total team points based on actual player statistics
    const totalPoints = transformedPlayers.reduce(
      (sum, player) => sum + player.totalPoints,
      0
    );

    console.log(`Total team points: ${totalPoints}`);

    // Get contest data if needed
    const contestEntries = await prisma.contestEntry.findMany({
      where: {
        fantasyTeamId: teamId,
      },
      include: {
        contest: true,
      },
    });

    // Format contests for response
    const contests = contestEntries.map((entry) => ({
      id: entry.contest.id,
      name: entry.contest.name,
      entryFee: entry.contest.entryFee,
      prizePool: entry.contest.prizePool,
      rank: entry.rank ? `#${entry.rank}` : 'TBD',
      winAmount: entry.winAmount || 0,
    }));

    // Create single contest data for backward compatibility
    const contestData =
      contestEntries.length > 0
        ? {
            id: contestEntries[0].contest.id,
            name: contestEntries[0].contest.name,
            entryFee: contestEntries[0].contest.entryFee,
            prizePool: contestEntries[0].contest.prizePool,
            totalSpots: contestEntries[0].contest.totalSpots,
          }
        : null;

    // Ensure we have a proper status
    let status = 'upcoming';
    if (matchDetails?.status === 'completed') {
      status = 'completed';
    } else if (matchDetails?.status === 'live') {
      status = 'live';
    }

    // Return response with team and player data
    return NextResponse.json({
      success: true,
      data: {
        id: team.id,
        name: team.name || 'Unnamed Team',
        matchId: team.matchId,
        user: user,
        match: matchDetails,
        contest: contestData,
        contests: contests,
        status: status,
        totalPoints: Math.round(totalPoints * 10) / 10,
        players: transformedPlayers,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching fantasy team:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch fantasy team',
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
