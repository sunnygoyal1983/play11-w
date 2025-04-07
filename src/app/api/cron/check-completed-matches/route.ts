import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { triggerContestFinalization } from '@/services/live-match-scheduler';

/**
 * POST /api/cron/check-completed-matches
 * Checks for matches that have been completed recently but haven't had their contests finalized
 * This is a backup system to ensure contest winnings are credited to users even if the live match
 * tracking system missed the match completion
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication if not a cron job
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

    // Find matches that were completed in the last 48 hours
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const completedMatches = await prisma.match.findMany({
      where: {
        status: 'completed',
        updatedAt: {
          gte: fortyEightHoursAgo,
        },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        contests: {
          select: {
            id: true,
            entries: {
              select: {
                id: true,
                winAmount: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (completedMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recently completed matches found',
        matchesProcessed: 0,
      });
    }

    console.log(
      `Found ${completedMatches.length} recently completed matches to check`
    );

    // Track finalized matches and any errors
    const results: {
      matchesChecked: number;
      matchesFinalized: number;
      errors: string[];
      walletFixResults?: {
        success: boolean;
        missingTransactionsFixed: number;
        failedLogsProcessed: number;
      };
    } = {
      matchesChecked: completedMatches.length,
      matchesFinalized: 0,
      errors: [],
    };

    // Check each match for unfinalized contests
    for (const match of completedMatches) {
      try {
        // Check if any contests don't have winnings distributed yet
        const needsFinalization = match.contests.some((contest) =>
          contest.entries.some((entry) => entry.winAmount === null)
        );

        if (needsFinalization) {
          console.log(
            `Match ${match.name} (${match.id}) has unfinalized contests. Triggering finalization...`
          );

          // Trigger contest finalization for this match
          const success = await triggerContestFinalization(match.id);

          if (success) {
            results.matchesFinalized++;
            console.log(
              `Successfully finalized contests for match ${match.id}`
            );
          } else {
            results.errors.push(
              `Failed to finalize contests for match ${match.id}`
            );
          }
        } else {
          console.log(
            `Match ${match.name} (${match.id}) already has all contests finalized`
          );
        }
      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        results.errors.push(
          `Error processing match ${match.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    // After finalizing contests, run the wallet transaction fix to ensure
    // all winnings have corresponding transactions
    try {
      console.log('Running automatic wallet transaction fix...');
      const response = await fetch(
        new URL('/api/cron/fix-wallet-transactions', request.url),
        {
          method: 'GET',
          headers: {
            'x-cron-secret': cronSecretHeader || '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          `Wallet transaction fix completed. Fixed ${data.missingTransactionsFixed} missing transactions.`
        );

        results.walletFixResults = {
          success: data.success,
          missingTransactionsFixed: data.missingTransactionsFixed,
          failedLogsProcessed: data.failedLogsProcessed,
        };
      } else {
        console.error('Wallet transaction fix failed:', await response.text());
        results.errors.push('Failed to run wallet transaction fix');
      }
    } catch (error) {
      console.error('Error running wallet transaction fix:', error);
      results.errors.push(
        `Error running wallet transaction fix: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${results.matchesChecked} matches, finalized ${results.matchesFinalized}`,
      results,
    });
  } catch (error) {
    console.error('Error checking completed matches:', error);
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
 * GET /api/cron/check-completed-matches
 * Returns statistics about matches that need contest finalization
 * For admin use to monitor the system
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find matches that were completed in the last 48 hours
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const completedMatches = await prisma.match.findMany({
      where: {
        status: 'completed',
        updatedAt: {
          gte: fortyEightHoursAgo,
        },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        contests: {
          select: {
            id: true,
            name: true,
            entries: {
              select: {
                id: true,
                winAmount: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Analyze matches to find those needing finalization
    const stats = {
      totalMatches: completedMatches.length,
      matchesNeedingFinalization: 0,
      contestsNeedingFinalization: 0,
      matches: completedMatches.map((match) => {
        // Count contests needing finalization
        const unfinalizedContests = match.contests.filter((contest) =>
          contest.entries.some((entry) => entry.winAmount === null)
        );

        const needsFinalization = unfinalizedContests.length > 0;

        if (needsFinalization) {
          stats.matchesNeedingFinalization++;
          stats.contestsNeedingFinalization += unfinalizedContests.length;
        }

        return {
          id: match.id,
          name: match.name,
          updatedAt: match.updatedAt,
          needsFinalization,
          totalContests: match.contests.length,
          unfinalizedContests: unfinalizedContests.length,
        };
      }),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error checking completed matches status:', error);
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
