import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/cron/auto-complete-old-matches
 * Automatically marks live matches as completed if their start date is 24+ hours in the past
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication if not a cron job
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Please log in' },
          { status: 401 }
        );
      }
      // Allow any authenticated user to auto-complete old matches
      // This is a harmless operation that benefits all users
    }

    // Calculate 24 hours ago from current time
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    console.log(
      `Checking for live matches started before: ${twentyFourHoursAgo.toISOString()}`
    );

    // Find live matches that started more than 24 hours ago
    const oldLiveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
        startTime: {
          lte: twentyFourHoursAgo,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        teamAName: true,
        teamBName: true,
      },
    });

    if (oldLiveMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No old live matches found to complete',
        matchesCompleted: 0,
      });
    }

    console.log(
      `Found ${oldLiveMatches.length} old live matches to mark as completed`
    );

    // Track results
    const results = {
      matchesChecked: oldLiveMatches.length,
      matchesCompleted: 0,
      errors: [] as string[],
      completedMatches: [] as Array<{
        id: string;
        name: string;
        startTime: string;
        hoursOld: number;
      }>,
    };

    // Update each old match to completed status
    for (const match of oldLiveMatches) {
      try {
        const hoursOld = Math.round(
          (Date.now() - new Date(match.startTime).getTime()) / (1000 * 60 * 60)
        );

        console.log(
          `Marking match as completed: ${match.name} (${match.teamAName} vs ${match.teamBName}) - Started ${hoursOld} hours ago`
        );

        await prisma.match.update({
          where: { id: match.id },
          data: {
            status: 'completed',
            result: `Auto-completed: Match ran for more than 24 hours (${hoursOld}h)`,
            updatedAt: new Date(),
          },
        });

        results.matchesCompleted++;
        results.completedMatches.push({
          id: match.id,
          name: match.name,
          startTime: match.startTime.toISOString(),
          hoursOld,
        });

        console.log(`Successfully marked match ${match.id} as completed`);
      } catch (error) {
        const errorMessage = `Failed to complete match ${match.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMessage);
        results.errors.push(errorMessage);
      }
    }

    const message = `Checked ${results.matchesChecked} old live matches, completed ${results.matchesCompleted}`;
    console.log(message);

    return NextResponse.json({
      success: true,
      message,
      results,
    });
  } catch (error) {
    console.error('Error auto-completing old matches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/auto-complete-old-matches
 * Returns statistics about live matches that are older than 24 hours
 * For admin use to monitor which matches would be auto-completed
 */
export async function GET(request: NextRequest) {
  try {
    // Allow public access for testing - just return basic stats
    const includeDetails =
      request.nextUrl.searchParams.get('details') === 'true';

    if (includeDetails) {
      // Check authentication for detailed view
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized - Admin access required for detailed view',
          },
          { status: 401 }
        );
      }
    }

    // Calculate 24 hours ago from current time
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find live matches that started more than 24 hours ago
    const oldLiveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
        startTime: {
          lte: twentyFourHoursAgo,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        teamAName: true,
        teamBName: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (!includeDetails) {
      // Public view - just return count and basic info
      return NextResponse.json({
        success: true,
        stats: {
          totalOldMatches: oldLiveMatches.length,
          cutoffTime: twentyFourHoursAgo.toISOString(),
          message:
            oldLiveMatches.length > 0
              ? `${oldLiveMatches.length} matches are older than 24 hours and can be auto-completed`
              : 'No old matches found',
        },
      });
    }

    // Calculate how old each match is for detailed view
    const matchesWithAge = oldLiveMatches.map((match) => {
      const hoursOld = Math.round(
        (Date.now() - new Date(match.startTime).getTime()) / (1000 * 60 * 60)
      );

      return {
        id: match.id,
        name: match.name,
        teams: `${match.teamAName} vs ${match.teamBName}`,
        startTime: match.startTime.toISOString(),
        hoursOld,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalOldMatches: oldLiveMatches.length,
        cutoffTime: twentyFourHoursAgo.toISOString(),
        matches: matchesWithAge,
      },
    });
  } catch (error) {
    console.error('Error checking old matches status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
