import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchMatchDetails } from '@/services/sportmonk/matches';

/**
 * Cron job to sync player data for all upcoming and live matches
 * This can be called every 5-10 minutes to ensure we have the latest player data
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Starting automated sync of match players...');

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

    // Find all upcoming and live matches that might have player data
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

    console.log(`Found ${matches.length} matches to check for player data`);

    // Process each match
    const results = [];
    for (const match of matches) {
      try {
        // Get current player count
        const beforeCount = await prisma.matchPlayer.count({
          where: { matchId: match.id },
        });

        console.log(
          `Syncing player data for match ${match.id} (${match.name})`
        );

        // Fetch match details which will update MatchPlayer records
        if (match.sportMonkId) {
          await fetchMatchDetails(parseInt(match.sportMonkId));

          // Get updated player count
          const afterCount = await prisma.matchPlayer.count({
            where: { matchId: match.id },
          });

          // Get substitute count
          const substituteCount = await prisma.matchPlayer.count({
            where: {
              matchId: match.id,
              isSubstitute: true,
            },
          });

          results.push({
            matchId: match.id,
            name: match.name,
            status: 'success',
            playersBefore: beforeCount,
            playersAfter: afterCount,
            substitutes: substituteCount,
          });
        } else {
          results.push({
            matchId: match.id,
            name: match.name,
            status: 'skipped',
            reason: 'No SportMonk ID',
          });
        }
      } catch (error) {
        console.error(`Error syncing players for match ${match.id}:`, error);
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
        message: `Checked player data for ${matches.length} matches`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in cron job for syncing players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync players' },
      { status: 500 }
    );
  }
}
