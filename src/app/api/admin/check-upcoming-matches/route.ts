import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateLiveMatchPlayerStats } from '@/services/live-scoring-service';

/**
 * POST /api/admin/check-upcoming-matches
 * Checks all upcoming matches and updates those that should be live based on start time
 * Only accessible by admin users
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current time
    const currentTime = new Date();

    // Find all upcoming matches that should be live based on start time
    const upcomingMatchesPastStartTime = await prisma.match.findMany({
      where: {
        status: 'upcoming',
        startTime: { lte: currentTime }, // Start time is in the past
      },
      select: {
        id: true,
        name: true,
        sportMonkId: true,
      },
    });

    // If no matches need updating, return early
    if (upcomingMatchesPastStartTime.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matches needed updating',
        updatedMatches: 0,
      });
    }

    // Update matches to live status
    const updateResults = [];

    for (const match of upcomingMatchesPastStartTime) {
      try {
        // Update match status to live
        await prisma.match.update({
          where: { id: match.id },
          data: { status: 'live' },
        });

        // Initialize player stats for the match
        try {
          await updateLiveMatchPlayerStats(match.id);
        } catch (statsError) {
          console.error(
            `Error updating initial match stats for ${match.id}:`,
            statsError
          );
        }

        updateResults.push({
          id: match.id,
          name: match.name,
          success: true,
        });
      } catch (updateError) {
        console.error(
          `Error updating match ${match.id} to live status:`,
          updateError
        );
        updateResults.push({
          id: match.id,
          name: match.name,
          success: false,
          error:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
        });
      }
    }

    // Count successful updates
    const successfulUpdates = updateResults.filter(
      (result) => result.success
    ).length;

    return NextResponse.json({
      success: true,
      message: `Updated ${successfulUpdates} matches to live status`,
      updatedMatches: successfulUpdates,
      details: updateResults,
    });
  } catch (error) {
    console.error('Error checking upcoming matches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check upcoming matches',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
