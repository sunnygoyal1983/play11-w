import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLiveMatchData } from '@/services/ball-data-service';

/**
 * Cron job to sync all active matches data with our database
 * This would be called every 1-2 minutes by an external cron service
 */
export async function GET() {
  try {
    console.log('Starting automated sync of live matches...');

    // Find all matches with status "active" or similar
    const activeMatches = await prisma.match.findMany({
      where: {
        OR: [
          { status: 'live' },
          { status: 'active' },
          { status: 'in_progress' },
          { status: 'UPCOMING' }, // Include upcoming matches for pre-game data
        ],
      },
      select: {
        id: true,
        sportMonkId: true,
      },
    });

    console.log(`Found ${activeMatches.length} active matches to sync`);

    // Process each match
    const results = [];
    for (const match of activeMatches) {
      const sportMonkId = match.sportMonkId || match.id;

      try {
        console.log(`Syncing match ${match.id} (SportMonk ID: ${sportMonkId})`);
        const result = await syncLiveMatchData(match.id, sportMonkId);

        if (result) {
          results.push({
            matchId: match.id,
            success: true,
            newBallsAdded: result.newBallsAdded,
          });
        } else {
          results.push({
            matchId: match.id,
            success: false,
            error: 'Failed to sync match data',
          });
        }
      } catch (error) {
        console.error(`Error syncing match ${match.id}:`, error);
        results.push({
          matchId: match.id,
          success: false,
          error: String(error),
        });
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return NextResponse.json(
      {
        success: true,
        message: `Synced ${activeMatches.length} matches`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in cron job for syncing matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync matches' },
      { status: 500 }
    );
  }
}
