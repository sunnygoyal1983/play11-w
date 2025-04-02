import { NextRequest, NextResponse } from 'next/server';
import { fetchMatchPlayersFromSquad } from '@/services/sportmonk/players';

/**
 * API endpoint to import match players from team squads
 * GET /api/import-squad-players?matchId=123&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(
      `Starting player import from squad${
        matchId ? ` for match ${matchId}` : ''
      }, limit: ${limit}`
    );

    const result = await fetchMatchPlayersFromSquad(matchId, limit);

    return NextResponse.json({
      ...result,
      message: `Processed ${result.processed} matches, added players to ${result.matchesWithPlayers} matches`,
    });
  } catch (error) {
    console.error('Error importing squad players:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import squad players',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
