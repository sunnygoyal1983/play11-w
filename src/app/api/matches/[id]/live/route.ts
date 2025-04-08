import { NextResponse } from 'next/server';
import { fetchLiveMatchDetails } from '@/services/live-scoring-service';
import {
  getLiveMatchData,
  syncLiveMatchData,
} from '@/services/ball-data-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Fetching live data for match: ${params.id}`);

    // Get match from our database first
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
        teamAId: true,
        teamBId: true,
        status: true,
        sportMonkId: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // If we have a SportMonk ID, use it for syncing if needed
    const sportMonkId = match.sportMonkId || params.id;

    try {
      // --- START: Refactored Logic ---
      console.log(`Attempting to fetch cached data for match ${match.id}`);
      let localDataResult = await getLiveMatchData(match.id);

      // Check if local data is valid
      const isLocalDataValid =
        localDataResult?.success &&
        localDataResult.data?.teamAScore && // Check for a key field
        localDataResult.data?.recentOvers !== undefined; // Check another key field

      if (!isLocalDataValid) {
        console.log(
          `Cached data invalid or missing for match ${match.id}. Triggering sync.`
        );

        // CRITICAL FIX: Don't sync if match is completed
        if (match.status === 'completed') {
          console.log(
            `🛑 SKIPPED SYNC: Match ${match.name} (${match.id}) is completed.`
          );
          // If sync is skipped for a completed match, try getting data one last time
          // in case it completed just now.
          localDataResult = await getLiveMatchData(match.id);
        } else {
          try {
            // Trigger sync and *await* its completion before fetching again
            await syncLiveMatchData(match.id, sportMonkId);
            console.log(
              `Sync completed for match ${match.id}. Refetching data.`
            );
            // Fetch the data again after sync
            localDataResult = await getLiveMatchData(match.id);
          } catch (syncError) {
            console.error('Error during synchronous sync:', syncError);
            // Proceed to return fallback data if sync fails
            // Ensure we fall through to error handling by setting a failure state
            localDataResult = {
              success: false,
              error: 'Sync failed, could not retrieve fresh data',
            };
          }
        }
      } else {
        // Optional: Check staleness even if valid, and trigger background sync
        const matchSummary = await prisma.matchSummary.findUnique({
          where: { matchId: match.id },
          select: { lastUpdated: true },
        });
        const now = new Date();
        const lastUpdated = matchSummary?.lastUpdated || new Date(0);
        const dataAge = now.getTime() - lastUpdated.getTime();

        if (dataAge > 30000 && match.status !== 'completed') {
          // 30 seconds
          console.log(
            `Data is stale (${dataAge}ms old), triggering background sync`
          );
          // Don't await - let it happen in the background
          syncLiveMatchData(match.id, sportMonkId).catch((err) => {
            console.error('Background sync failed:', err);
          });
        }
      }

      // After attempting fetch/sync, check the result
      if (localDataResult?.success && localDataResult.data) {
        console.log(
          `Successfully retrieved processed data for match ${match.id}`
        );
        return NextResponse.json(
          { success: true, data: localDataResult.data },
          { status: 200 }
        );
      } else {
        console.error(
          `Failed to retrieve valid data for match ${match.id} after sync/fetch.`
        );
        // Return fallback data if getLiveMatchData failed even after sync
        return NextResponse.json(
          {
            success: true, // Still success, but using fallback
            data: {
              teamAName: match.teamAName || 'Team A',
              teamBName: match.teamBName || 'Team B',
              teamAScore: '0/0',
              teamBScore: 'Yet to bat',
              overs: '0.0',
              currentInnings: 1,
              currentBatsman1: 'Waiting for data...',
              currentBatsman1Score: '0 (0)',
              currentBatsman2: 'Waiting for data...',
              currentBatsman2Score: '0 (0)',
              currentBowler: 'Waiting for data...',
              currentBowlerFigures: '0/0 (0.0)',
              lastWicket: 'No wickets yet',
              recentOvers: '',
            },
            note: 'Using fallback data as live data retrieval failed.',
          },
          { status: 200 }
        );
      }
      // --- END: Refactored Logic ---
    } catch (error) {
      console.error('Outer error fetching live match data:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch live match data' },
        { status: 500 }
      );
    }
  } catch (error) {
    // This catch block seems redundant now, but kept for safety
    console.error('Top-level error in GET handler:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
