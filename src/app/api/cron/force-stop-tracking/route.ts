import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  stopTrackingMatchById,
  clearTrackingForCompletedMatches,
} from '@/services/live-match-scheduler';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cron/force-stop-tracking
 * Forcibly stops tracking for a specific match ID or all completed matches
 * This is an emergency endpoint for when the system is still tracking completed matches
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { matchId } = body;

    // If matchId is provided, stop tracking just that match
    if (matchId) {
      // Verify the match exists and get its details
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { id: true, name: true, status: true },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: `Match ${matchId} not found` },
          { status: 404 }
        );
      }

      console.log(
        `Force stopping tracking for match: ${match.name} (${matchId})`
      );

      // Stop tracking this match
      const success = await stopTrackingMatchById(matchId);

      return NextResponse.json({
        success: true,
        message: success
          ? `Successfully stopped tracking match ${matchId}`
          : `Match ${matchId} was not being tracked`,
        match: {
          id: match.id,
          name: match.name,
          status: match.status,
        },
      });
    }

    // If no matchId, check all completed matches
    await clearTrackingForCompletedMatches();

    return NextResponse.json({
      success: true,
      message: 'Cleared tracking for all completed matches',
    });
  } catch (error) {
    console.error('Error stopping match tracking:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
