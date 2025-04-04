import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateLiveMatchPlayerStats } from '@/services/live-scoring-service';

/**
 * GET /api/user/matches/[id]/live-teams
 * Fetch user teams for a match with real-time points
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const matchId = params.id;

    console.log(`Fetching live teams for user ${userId} in match ${matchId}`);

    // First, update the player stats to ensure we have the latest data
    try {
      console.log('Updating player stats before fetching teams...');
      const statsUpdated = await updateLiveMatchPlayerStats(matchId);
      if (statsUpdated) {
        console.log('Successfully updated player stats before fetching teams');
      } else {
        console.warn('Player stats update did not complete successfully');
      }
    } catch (error) {
      console.error(`Error updating player stats before fetch:`, error);
      // Continue anyway to return the latest available data
    }

    // Fetch user teams for this match
    const teams = await prisma.fantasyTeam.findMany({
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
                teamName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(
      `Found ${teams.length} teams for user ${userId} in match ${matchId}`
    );

    // Get player statistics for this match - make sure to fetch the very latest
    const playerStats = await prisma.playerStatistic.findMany({
      where: { matchId },
      select: {
        playerId: true,
        points: true,
        runs: true,
        wickets: true,
        catches: true,
        stumpings: true,
        fours: true,
        sixes: true,
      },
    });

    console.log(
      `Found statistics for ${playerStats.length} players in match ${matchId}`
    );

    // Create a map for quick player stats lookup
    const playerStatsMap = new Map();
    playerStats.forEach((stat) => {
      playerStatsMap.set(stat.playerId, stat);
    });

    // For monitoring, check which players have non-zero points
    const playersWithPoints = playerStats.filter((p) => p.points > 0);
    console.log(`${playersWithPoints.length} players have non-zero points`);

    if (playersWithPoints.length > 0) {
      console.log(
        `Top 5 players by points:`,
        playersWithPoints
          .sort((a, b) => b.points - a.points)
          .slice(0, 5)
          .map(
            (p) =>
              `Player ${p.playerId}: ${p.points.toFixed(1)} pts (Runs: ${
                p.runs
              }, Wickets: ${p.wickets})`
          )
      );
    } else {
      console.log('No players have any points yet');
    }

    // Transform teams data with current points
    const liveTeams = teams.map((team) => {
      console.log(`Processing team ${team.name} (${team.id})`);

      // Transform players with current points
      const players = team.players.map((teamPlayer) => {
        // Get player's current points from statistics
        const playerStat = playerStatsMap.get(teamPlayer.playerId);
        const playerPoints = playerStat ? playerStat.points : 0;

        // Calculate effective points with captain/vice-captain multiplier
        let effectivePoints = playerPoints;
        if (teamPlayer.isCaptain) {
          effectivePoints *= 2; // 2x for captain
        } else if (teamPlayer.isViceCaptain) {
          effectivePoints *= 1.5; // 1.5x for vice-captain
        }

        console.log(
          `Player ${teamPlayer.player.name}: ${playerPoints} pts ${
            teamPlayer.isCaptain
              ? `(C: ${effectivePoints} pts)`
              : teamPlayer.isViceCaptain
              ? `(VC: ${effectivePoints} pts)`
              : ''
          }`
        );

        return {
          id: teamPlayer.playerId,
          name: teamPlayer.player.name,
          image: teamPlayer.player.image,
          role: teamPlayer.player.role,
          teamName: teamPlayer.player.teamName,
          isCaptain: teamPlayer.isCaptain,
          isViceCaptain: teamPlayer.isViceCaptain,
          currentPoints: playerPoints,
          effectivePoints: effectivePoints,
          // Include detailed stats for debugging
          runs: playerStat?.runs || 0,
          wickets: playerStat?.wickets || 0,
          catches: playerStat?.catches || 0,
          stumpings: playerStat?.stumpings || 0,
          fours: playerStat?.fours || 0,
          sixes: playerStat?.sixes || 0,
        };
      });

      // Calculate total team points
      const totalPoints = players.reduce((sum, player) => {
        return sum + player.effectivePoints;
      }, 0);

      console.log(`Team ${team.name} total points: ${totalPoints.toFixed(1)}`);

      return {
        id: team.id,
        name: team.name,
        captainId: team.players.find((p) => p.isCaptain)?.playerId || '',
        viceCaptainId:
          team.players.find((p) => p.isViceCaptain)?.playerId || '',
        currentPoints: totalPoints,
        players,
      };
    });

    console.log(
      `Successfully processed ${liveTeams.length} teams with points data`
    );

    // Create a new endpoint to force update scores for testing
    if (request.nextUrl.searchParams.has('forceUpdate')) {
      console.log('Force update mode detected, updating player stats again...');
      await updateLiveMatchPlayerStats(matchId);
    }

    return NextResponse.json({
      success: true,
      data: liveTeams,
    });
  } catch (error) {
    console.error('Error fetching live teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live teams' },
      { status: 500 }
    );
  }
}
