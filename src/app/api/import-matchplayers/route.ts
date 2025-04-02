import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/sportmonk';
import { fetchMatchDetails } from '@/services/sportmonk/matches';

type MatchError = {
  matchId: string;
  name?: string;
  error: string;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let result = {
      success: true,
      processed: 0,
      total: 0,
      matchesWithPlayers: 0,
      errors: [] as MatchError[],
      matchDetails: null,
    };

    // If a specific matchId is provided, just process that one
    if (matchId) {
      console.log(`Importing players for specific match: ${matchId}`);

      try {
        const matchData = await fetchMatchDetails(parseInt(matchId));
        result.matchDetails = matchData;
        result.processed = 1;
      } catch (error) {
        result.errors.push({
          matchId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Check how many players were imported for this match
      const playerCount = await prisma.matchPlayer.count({
        where: {
          match: {
            sportMonkId: matchId,
          },
        },
      });

      result.matchesWithPlayers = playerCount > 0 ? 1 : 0;

      return NextResponse.json(result);
    }

    // If no specific match, process matches without players
    // First find matches that don't have any players
    const matchesWithoutPlayers = await prisma.match.findMany({
      where: {
        players: {
          none: {},
        },
      },
      take: limit,
      orderBy: {
        startTime: 'desc',
      },
      select: {
        id: true,
        sportMonkId: true,
        name: true,
      },
    });

    result.total = matchesWithoutPlayers.length;
    console.log(
      `Found ${matchesWithoutPlayers.length} matches without players`
    );

    // Process each match
    for (const match of matchesWithoutPlayers) {
      try {
        console.log(
          `Importing players for match: ${match.sportMonkId} - ${match.name}`
        );
        await fetchMatchDetails(parseInt(match.sportMonkId));
        result.processed++;

        // Check if we successfully added players
        const playerCount = await prisma.matchPlayer.count({
          where: {
            matchId: match.id,
          },
        });

        if (playerCount > 0) {
          result.matchesWithPlayers++;
        }
      } catch (error) {
        console.error(
          `Error importing players for match ${match.sportMonkId}:`,
          error
        );
        result.errors.push({
          matchId: match.sportMonkId,
          name: match.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      ...result,
      message: `Processed ${result.processed} matches, added players to ${result.matchesWithPlayers} matches`,
    });
  } catch (error) {
    console.error('Error importing match players:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import match players',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
