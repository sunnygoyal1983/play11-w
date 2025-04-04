import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateLiveMatchPlayerStats } from '@/services/live-scoring-service';

/**
 * POST /api/matches/[id]/check-status
 * Checks and updates a match's status based on its start time
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const matchId = params.id;

    // Get match details
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        name: true,
        status: true,
        startTime: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if the match should be live based on start time
    const currentTime = new Date();
    let statusChanged = false;
    let newStatus = match.status;

    if (match.status === 'upcoming' && match.startTime <= currentTime) {
      // Update match to live
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'live' },
      });

      // Start tracking for live updates if not already tracked
      try {
        await updateLiveMatchPlayerStats(matchId);
      } catch (error) {
        console.error(
          `Error updating initial match stats for ${matchId}:`,
          error
        );
      }

      statusChanged = true;
      newStatus = 'live';
    }

    return NextResponse.json({
      success: true,
      data: {
        id: match.id,
        name: match.name,
        previousStatus: match.status,
        currentStatus: newStatus,
        statusChanged,
      },
    });
  } catch (error) {
    console.error('Error checking match status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check match status' },
      { status: 500 }
    );
  }
}
