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
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
        status: true,
        teamAId: true,
        teamBId: true,
      },
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

    // Fetch match players to get accurate team info and substitute status
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            teamName: true,
          },
        },
      },
    });

    console.log(
      `Found ${matchPlayers.length} match players for match ${matchId}`
    );

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

    // If no player statistics are available yet, return a default response structure
    if (formattedStats.length === 0) {
      console.log(
        `No player statistics found for match ${matchId}, returning default structure`
      );

      return NextResponse.json({
        success: true,
        data: [],
        matchDetails: {
          id: match.id,
          name: match.name,
          status: match.status,
          teams: {
            teamA: {
              name: match.teamAName,
            },
            teamB: {
              name: match.teamBName,
            },
          },
        },
      });
    }

    console.log(
      `Found ${formattedStats.length} player statistics for match ${matchId}`
    );

    // Process players and their stats
    const processedPlayers = formattedStats.map((player) => {
      // Find related match player data for additional info
      const matchPlayer = matchPlayers.find(
        (mp) => mp.playerId === player.playerId
      );

      // Get team data from match
      const teamName =
        matchPlayer?.player?.teamName ||
        (matchPlayer?.teamId === match.teamAId
          ? match.teamAName
          : matchPlayer?.teamId === match.teamBId
          ? match.teamBName
          : player.teamName || 'Unknown Team');

      return {
        id: player.playerId,
        name: player.playerName,
        isSubstitute: matchPlayer?.isSubstitute || false,
        teamName,
        playerImage: player.playerImage,
        role: player.role,
        points: player.points,
        runs: player.runs,
        balls: player.balls,
        fours: player.fours,
        sixes: player.sixes,
        strikeRate: player.strikeRate,
        wickets: player.wickets,
        overs: player.overs,
        maidens: player.maidens,
        economy: player.economy,
        runsConceded: player.runsConceded,
        catches: player.catches,
        stumpings: player.stumpings,
        runOuts: player.runOuts,
      };
    });

    return NextResponse.json({
      success: true,
      data: processedPlayers,
      matchDetails: {
        id: match.id,
        name: match.name,
        status: match.status,
        teams: {
          teamA: {
            name: match.teamAName,
          },
          teamB: {
            name: match.teamBName,
          },
        },
      },
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
