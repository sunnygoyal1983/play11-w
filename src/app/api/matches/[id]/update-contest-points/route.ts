import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLiveContestPoints } from '@/services/live-match-scheduler';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/matches/[id]/update-contest-points
 * Manually updates contest points for a live match
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
    console.log(`Manual contest points update requested for match ${matchId}`);

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, name: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Update contest points
    const success = await updateLiveContestPoints(matchId);

    if (success) {
      // Get updated contest entries to confirm
      const contestEntries = await prisma.contestEntry.findMany({
        where: {
          contest: {
            matchId,
          },
        },
        select: {
          id: true,
          points: true,
          fantasyTeamId: true,
        },
        orderBy: {
          points: 'desc',
        },
        take: 10,
      });

      return NextResponse.json({
        success: true,
        message: 'Contest points updated successfully',
        entriesCount: contestEntries.length,
        topEntries: contestEntries.map((entry) => ({
          id: entry.id,
          teamId: entry.fantasyTeamId,
          points: entry.points,
        })),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update contest points',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error updating contest points for ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while updating contest points',
      },
      { status: 500 }
    );
  }
}
