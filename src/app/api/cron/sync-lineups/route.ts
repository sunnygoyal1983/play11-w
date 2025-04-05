import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshLineupFromApi } from '@/services/lineup-service';

/**
 * Cron job to sync lineups for all upcoming and live matches
 * This can be called every 5-10 minutes to ensure we have the latest lineup data
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Starting automated sync of match lineups...');

    // Check for authorization if needed
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      // For development, allow without secret
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Find all upcoming and live matches that might have lineup data
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { status: 'upcoming' },
          { status: 'live' },
          { status: 'in_progress' },
        ],
        // Only look at matches happening soon or already started
        startTime: {
          lte: new Date(Date.now() + 3 * 60 * 60 * 1000), // Within next 3 hours
        },
      },
      select: {
        id: true,
        sportMonkId: true,
        name: true,
        status: true,
        startTime: true,
      },
    });

    console.log(`Found ${matches.length} matches to check for lineup data`);

    // Process each match
    const results = [];
    for (const match of matches) {
      try {
        // Check if we already have lineup data for this match
        const existingLineup = await prisma.matchLineup.findUnique({
          where: { matchId: match.id },
        });

        // Skip if we already have lineup data and the match is not live
        // For live matches, we still want to refresh occasionally
        if (
          existingLineup &&
          existingLineup.isTossComplete &&
          match.status !== 'live'
        ) {
          results.push({
            matchId: match.id,
            name: match.name,
            status: 'skipped',
            reason: 'Lineup already exists',
          });
          continue;
        }

        console.log(
          `Syncing lineup data for match ${match.id} (${match.name})`
        );

        // Force refresh lineup data from the API
        const result = await refreshLineupFromApi(match.id);

        if (result.success) {
          results.push({
            matchId: match.id,
            name: match.name,
            status: 'success',
            tossComplete: result.tossComplete,
            teamAPlayers: result.teamA?.length || 0,
            teamBPlayers: result.teamB?.length || 0,
          });
        } else {
          results.push({
            matchId: match.id,
            name: match.name,
            status: 'failed',
            reason: result.message,
          });
        }
      } catch (error) {
        console.error(`Error syncing lineup for match ${match.id}:`, error);
        results.push({
          matchId: match.id,
          name: match.name,
          status: 'error',
          error: String(error),
        });
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return NextResponse.json(
      {
        success: true,
        message: `Checked lineups for ${matches.length} matches`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in cron job for syncing lineups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync lineups' },
      { status: 500 }
    );
  }
}
