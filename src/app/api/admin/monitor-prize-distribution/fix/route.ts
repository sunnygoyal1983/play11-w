import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAuthenticatedAdmin } from '@/lib/auth-utils';
import { fixMissedPrizeDistributions } from '@/services/prize-monitor-service';

/**
 * POST - Fix missed prize distributions for a specific contest
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!(await isAuthenticatedAdmin(session))) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    // Get contestId from request body
    const body = await req.json();
    const { contestId } = body;

    if (!contestId) {
      return NextResponse.json(
        { error: 'Contest ID is required' },
        { status: 400 }
      );
    }

    // Call the service to fix missed prize distributions
    const result = await fixMissedPrizeDistributions(contestId);

    return NextResponse.json({
      success: true,
      message: `Successfully fixed ${result.totalFixed} missed prize distributions for contest ${result.contestName}.`,
      result,
    });
  } catch (error) {
    console.error('Error fixing prize distributions:', error);
    return NextResponse.json(
      { error: 'Failed to fix prize distributions' },
      { status: 500 }
    );
  }
}
