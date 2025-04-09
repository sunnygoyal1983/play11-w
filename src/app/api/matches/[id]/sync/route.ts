import { NextResponse } from 'next/server';
import { syncLiveMatchData } from '@/services/ball-data-service';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint to sync live match data from SportMonks to our database
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Syncing live data for match: ${params.id}`);

    // Allow testing the sync with specific SportMonk ID
    const { searchParams } = new URL(request.url);
    const testSportMonkId = searchParams.get('sportmonk_id');
    const forceSync = searchParams.get('force') === 'true';

    // Get match from our database first to get SportMonk ID
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sportMonkId: true,
        status: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Use test ID if provided, otherwise use from DB or fallback to our ID
    const sportMonkId = testSportMonkId || match.sportMonkId || params.id;

    console.log(`Using SportMonk ID: ${sportMonkId} for match ${match.id}`);

    // Sync data from SportMonks to our database
    if (match.status === 'completed') {
      console.log(`🛑 Match is already completed in database, skipping sync`);
      return {
        status: 'completed',
        message: 'Match already completed, sync skipped',
        matchId: match.id,
      };
    }
    const result = await syncLiveMatchData(match.id, sportMonkId, forceSync);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to sync match data' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Synced match data successfully. Added ${result.newBallsAdded} new balls.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error syncing match data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync match data' },
      { status: 500 }
    );
  }
}
