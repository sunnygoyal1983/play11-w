import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

/**
 * Process a contest winner, update their wallet and create transaction record
 * This function includes retry logic and verification to ensure transactions are created
 */
async function processContestWinner(
  entry: any,
  contest: any,
  winAmount: number,
  retryCount = 0
) {
  const maxRetries = 3;

  try {
    // Check if this entry already has a transaction (to prevent duplicates)
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: entry.userId,
        type: 'contest_win',
        status: 'completed',
        reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
      },
    });

    if (existingTransaction) {
      console.log(
        `Transaction already exists for user ${entry.userId}, contest ${contest.id}, rank ${entry.rank}`
      );

      // Verify contest entry has winAmount set
      const contestEntry = await prisma.contestEntry.findUnique({
        where: { id: entry.id },
      });

      if (!contestEntry?.winAmount) {
        // Update just the winAmount if missing
        await prisma.contestEntry.update({
          where: { id: entry.id },
          data: { winAmount },
        });
        console.log(`Updated missing winAmount for entry ${entry.id}`);
      }

      return;
    }

    // First, ensure the contest entry is marked with the correct winAmount
    // Do this as a separate transaction to ensure at least this part succeeds
    try {
      console.log(
        `Updating contest entry ${entry.id} with winAmount ${winAmount}`
      );
      await prisma.contestEntry.update({
        where: { id: entry.id },
        data: { winAmount },
      });
    } catch (updateError) {
      console.error(`Error updating contest entry winAmount: ${updateError}`);
      throw updateError; // Rethrow to trigger retry logic
    }

    // Now try to update the wallet and create the transaction record
    try {
      // Add to user wallet
      await prisma.user.update({
        where: { id: entry.userId },
        data: {
          walletBalance: {
            increment: winAmount,
          },
        },
      });

      console.log(
        `Updated wallet balance for user ${entry.userId}, added ${winAmount}`
      );

      // Create transaction record
      const txn = await prisma.transaction.create({
        data: {
          userId: entry.userId,
          amount: winAmount,
          type: 'contest_win',
          status: 'completed',
          reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
        },
      });

      console.log(`Created transaction record: ${txn.id}`);
    } catch (txError) {
      console.error(
        `Error in wallet update or transaction creation: ${txError}`
      );

      // Check if the user's wallet was already updated
      // If it was, we need to create just the transaction record
      try {
        // Try to create just the transaction record with a slightly modified reference
        // to avoid uniqueness conflicts if that's the issue
        await prisma.transaction.create({
          data: {
            userId: entry.userId,
            amount: winAmount,
            type: 'contest_win',
            status: 'completed',
            reference: `Contest Win: ${contest.name} - Rank ${
              entry.rank
            } (retry ${Date.now()})`,
          },
        });
        console.log(`Created fallback transaction for user ${entry.userId}`);
      } catch (fallbackError) {
        console.error(
          `Fallback transaction creation also failed: ${fallbackError}`
        );
        throw txError; // Rethrow the original error to trigger retry logic
      }
    }

    // Verify transaction was created successfully - check with a more flexible query
    const verifyTransaction = await prisma.transaction.findFirst({
      where: {
        userId: entry.userId,
        type: 'contest_win',
        status: 'completed',
        amount: winAmount,
        reference: {
          contains: `Contest Win: ${contest.name}`,
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (!verifyTransaction) {
      throw new Error(
        'Transaction verification failed - transaction not found after creation'
      );
    }

    console.log(
      `Successfully processed win for user ${entry.userId}, contest ${contest.id}, rank ${entry.rank}, amount ${winAmount}`
    );
  } catch (error) {
    console.error(
      `Error processing contest winner for entry ${entry.id}:`,
      error
    );

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(
        `Retrying process contest winner (${retryCount + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return processContestWinner(entry, contest, winAmount, retryCount + 1);
    } else {
      // Log critical error for manual intervention
      console.error(
        `CRITICAL: Failed to process contest winner after ${maxRetries} retries.`,
        {
          userId: entry.userId,
          contestId: contest.id,
          entryId: entry.id,
          rank: entry.rank,
          winAmount,
        }
      );

      // Create an error record in the database for later processing
      try {
        await prisma.setting.create({
          data: {
            key: `failed_contest_win_${entry.id}_${Date.now()}`,
            value: JSON.stringify({
              userId: entry.userId,
              contestId: contest.id,
              entryId: entry.id,
              rank: entry.rank,
              winAmount,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }),
            type: 'json',
            category: 'error_log',
            description:
              'Failed contest win transaction that needs manual processing',
          },
        });
      } catch (logError) {
        console.error('Failed to log error to database:', logError);
      }
    }
  }
}

/**
 * POST - Finalize contest rankings and distribute prizes
 * This endpoint should be called when a match is completed
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

    const contestId = params.id;

    // Check if the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        match: true,
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Check if match is completed
    if (contest.match.status !== 'completed') {
      return NextResponse.json(
        { error: 'Match must be completed to finalize contest' },
        { status: 400 }
      );
    }

    // Get all entries for this contest
    const entries = await prisma.contestEntry.findMany({
      where: { contestId },
      include: {
        fantasyTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for this contest' },
        { status: 404 }
      );
    }

    // Calculate points for each team
    const entriesWithPoints = await Promise.all(
      entries.map(async (entry) => {
        // Calculate total points for the team
        let totalPoints = 0;

        // Get player statistics for this match
        for (const teamPlayer of entry.fantasyTeam.players) {
          const playerStats = await prisma.playerStatistic.findUnique({
            where: {
              matchId_playerId: {
                matchId: contest.matchId,
                playerId: teamPlayer.playerId,
              },
            },
          });

          if (playerStats) {
            // Apply captain/vice-captain multiplier
            let points = playerStats.points;
            if (teamPlayer.isCaptain) {
              points *= 2; // 2x for captain
            } else if (teamPlayer.isViceCaptain) {
              points *= 1.5; // 1.5x for vice-captain
            }
            totalPoints += points;
          }
        }

        return {
          ...entry,
          calculatedPoints: totalPoints,
        };
      })
    );

    // Sort entries by points (descending)
    const sortedEntries = entriesWithPoints.sort(
      (a, b) => b.calculatedPoints - a.calculatedPoints
    );

    // Assign ranks and determine prize winners
    const rankedEntries = sortedEntries.map((entry, index) => {
      // Assign rank (1-based)
      const rank = index + 1;
      return { ...entry, rank };
    });

    // Get prize breakup for this contest
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    // First, update entry ranks and points (this can be done outside the main transaction)
    for (const entry of rankedEntries) {
      try {
        await prisma.contestEntry.update({
          where: { id: entry.id },
          data: {
            rank: entry.rank,
            points: entry.calculatedPoints,
          },
        });
      } catch (error) {
        console.error(
          `Error updating rank and points for entry ${entry.id}:`,
          error
        );
        // Continue to other entries if one fails
      }
    }

    // Process winners and create transactions
    const processedWinners = [];
    for (const entry of rankedEntries) {
      // Find matching prize - check both direct matches and ranges
      const prizeForRank = prizeBreakup.find((p) => {
        // For direct rank matches
        if (p.rank === entry.rank.toString()) {
          return true;
        }

        // For rank ranges like "101-200"
        if (p.rank.includes('-')) {
          const [start, end] = p.rank.split('-').map(Number);
          return entry.rank >= start && entry.rank <= end;
        }

        return false;
      });

      if (prizeForRank) {
        const winAmount = prizeForRank.prize;

        // Log more details for admin users
        if (entry.user?.role === 'ADMIN') {
          console.log(
            `Admin user found at rank ${entry.rank}: ${entry.user.name} (${entry.user.email})`
          );
          console.log(`Prize amount: ${winAmount}`);
        }

        // For each winner, process in its own transaction with retries
        await processContestWinner(entry, contest, winAmount);
        processedWinners.push({
          userId: entry.userId,
          userName: entry.user.name,
          rank: entry.rank,
          amount: winAmount,
          isAdmin: entry.user?.role === 'ADMIN',
        });
      } else {
        console.log(`No prize found for rank ${entry.rank}`);
      }
    }

    return NextResponse.json({
      message: 'Contest finalized successfully',
      totalEntries: rankedEntries.length,
      totalPrizesDistributed: prizeBreakup.reduce((sum, p) => sum + p.prize, 0),
      winners: processedWinners,
    });
  } catch (error) {
    console.error('Error finalizing contest:', error);
    return NextResponse.json(
      { error: 'Failed to finalize contest' },
      { status: 500 }
    );
  }
}
