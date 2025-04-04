import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { triggerContestFinalization } from '@/services/live-match-scheduler';

/**
 * POST - Finalize all contests for a match
 * This endpoint handles automatically finalizing all contests for a specific match
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const matchId = params.id;

    // Call the service function to finalize contests
    const success = await triggerContestFinalization(matchId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Contests finalized successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to finalize contests',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error finalizing contests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
