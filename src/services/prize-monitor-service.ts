import { prisma } from '@/lib/prisma';

/**
 * Service to monitor prize distribution issues
 */
export async function monitorPrizeDistribution(days = 7): Promise<any> {
  try {
    console.log(
      `[Prize Monitor] Checking for missed prizes in the last ${days} days`
    );

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // First, get contests that have been completed recently
    const recentContests = await prisma.contest.findMany({
      where: {
        match: {
          status: 'completed',
          endTime: {
            gte: dateThreshold,
          },
        },
      },
      include: {
        match: {
          select: {
            name: true,
            status: true,
            endTime: true,
          },
        },
      },
    });

    console.log(
      `[Prize Monitor] Found ${recentContests.length} completed contests to check`
    );

    const issues = [];
    let totalIssues = 0;

    // For each contest, find entries that should have received prizes but didn't
    for (const contest of recentContests) {
      // Find entries with rank <= winnerCount but winAmount = 0
      const problemEntries = await prisma.contestEntry.findMany({
        where: {
          contestId: contest.id,
          rank: {
            lte: contest.winnerCount,
          },
          winAmount: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          rank: 'asc',
        },
      });

      if (problemEntries.length > 0) {
        console.log(
          `[Prize Monitor] Found ${problemEntries.length} entries with missed prizes in contest: ${contest.name} (${contest.id})`
        );

        // Get prize breakup for this contest to calculate missing prize amounts
        const prizeBreakup = await prisma.prizeBreakup.findMany({
          where: { contestId: contest.id },
          orderBy: { rank: 'asc' },
        });

        const entriesWithPrizeInfo = problemEntries.map((entry) => {
          // Find the prize that should have been awarded
          const prizeForRank = prizeBreakup.find((p) => {
            // Direct match
            if (p.rank === (entry.rank?.toString() || '0')) {
              return true;
            }

            // Range match
            if (p.rank.includes('-')) {
              const [start, end] = p.rank.split('-').map(Number);
              return (entry.rank || 0) >= start && (entry.rank || 0) <= end;
            }

            return false;
          });

          const missedPrizeAmount = prizeForRank?.prize || 0;

          // Log detailed info about the missed prize
          console.log(
            `[Prize Monitor] User ${entry.user?.name} (${entry.user?.email}) at rank ${entry.rank} missed prize amount: ${missedPrizeAmount}`
          );

          return {
            entryId: entry.id,
            contestId: contest.id,
            contestName: contest.name,
            rank: entry.rank,
            userId: entry.userId,
            userName: entry.user?.name || 'Unknown',
            userEmail: entry.user?.email || 'Unknown',
            userRole: entry.user?.role || 'USER',
            missedPrizeAmount,
            matchName: contest.match.name,
            matchEndTime: contest.match.endTime,
          };
        });

        issues.push({
          contestId: contest.id,
          contestName: contest.name,
          matchId: contest.matchId,
          matchName: contest.match.name,
          matchEndTime: contest.match.endTime,
          totalEntries: entriesWithPrizeInfo.length,
          entries: entriesWithPrizeInfo,
        });

        totalIssues += entriesWithPrizeInfo.length;

        // Store alert in database for admin viewing
        await storeMonitoringAlert(contest, entriesWithPrizeInfo);
      }
    }

    const result = {
      totalIssuesFound: totalIssues,
      contestsWithIssues: issues.length,
      issues,
    };

    console.log(
      `[Prize Monitor] Monitoring complete. Found ${totalIssues} issues across ${issues.length} contests.`
    );

    return result;
  } catch (error) {
    console.error(
      '[Prize Monitor] Error monitoring prize distribution:',
      error
    );
    throw error;
  }
}

/**
 * Store monitoring alerts in the database
 */
async function storeMonitoringAlert(contest: any, entries: any[]) {
  try {
    const totalMissedAmount = entries.reduce(
      (sum, entry) => sum + entry.missedPrizeAmount,
      0
    );

    await prisma.setting.create({
      data: {
        key: `prize_monitor_alert_${contest.id}_${Date.now()}`,
        value: JSON.stringify({
          contestId: contest.id,
          contestName: contest.name,
          matchId: contest.matchId,
          matchName: contest.match.name,
          timestamp: new Date().toISOString(),
          totalMissedAmount,
          entriesCount: entries.length,
          entries,
        }),
        type: 'json',
        category: 'prize_monitor',
        description: `Prize distribution alert for contest ${contest.name} - ${entries.length} entries affected`,
      },
    });

    console.log(
      `[Prize Monitor] Alert stored in database for contest ${contest.id}`
    );
  } catch (error) {
    console.error('[Prize Monitor] Failed to store monitoring alert:', error);
  }
}

/**
 * Fix missed prize distributions
 */
export async function fixMissedPrizeDistributions(
  contestId: string
): Promise<any> {
  try {
    console.log(
      `[Prize Monitor] Fixing missed prizes for contest: ${contestId}`
    );

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { match: true },
    });

    if (!contest) {
      throw new Error(`Contest not found: ${contestId}`);
    }

    // Find entries with rank <= winnerCount but winAmount = 0
    const entriesWithMissedPrizes = await prisma.contestEntry.findMany({
      where: {
        contestId,
        rank: {
          lte: contest.winnerCount,
        },
        winAmount: 0,
      },
      include: {
        user: true,
      },
      orderBy: {
        rank: 'asc',
      },
    });

    console.log(
      `[Prize Monitor] Found ${entriesWithMissedPrizes.length} entries with missed prizes`
    );

    if (entriesWithMissedPrizes.length === 0) {
      return { message: 'No missed prizes to fix' };
    }

    // Get prize breakup
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    const fixedEntries: Array<{
      entryId: string;
      userId: string;
      userName: string;
      rank: number | null;
      prizeAmount: number;
      transactionCreated: boolean;
      transactionId?: string;
    }> = [];

    // Process each entry with missed prize
    for (const entry of entriesWithMissedPrizes) {
      // Find the matching prize
      const prizeForRank = prizeBreakup.find((p) => {
        // Direct match
        if (p.rank === (entry.rank?.toString() || '0')) {
          return true;
        }

        // Range match
        if (p.rank.includes('-')) {
          const [start, end] = p.rank.split('-').map(Number);
          return (entry.rank || 0) >= start && (entry.rank || 0) <= end;
        }

        return false;
      });

      if (!prizeForRank) {
        console.log(
          `[Prize Monitor] No prize found for rank ${entry.rank || 'undefined'}`
        );
        continue;
      }

      const prizeAmount = prizeForRank.prize || 0;

      // 1. Update the contest entry winAmount
      await prisma.contestEntry.update({
        where: { id: entry.id },
        data: { winAmount: prizeAmount },
      });

      // 2. Check if a transaction already exists
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: entry.userId,
          type: 'contest_win',
          reference: {
            contains: `Contest Win: ${contest.name}`,
          },
        },
      });

      if (existingTransaction) {
        console.log(
          `[Prize Monitor] Transaction already exists for user ${entry.userId}`
        );
        fixedEntries.push({
          entryId: entry.id,
          userId: entry.userId,
          userName: entry.user.name,
          rank: entry.rank,
          prizeAmount,
          transactionCreated: false,
        });
        continue;
      }

      // 3. Update wallet balance
      await prisma.user.update({
        where: { id: entry.userId },
        data: {
          walletBalance: {
            increment: prizeAmount,
          },
        },
      });

      console.log(
        `[Prize Monitor] Updated wallet balance for user ${entry.user.name}`
      );

      // 4. Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: entry.userId,
          amount: prizeAmount,
          type: 'contest_win',
          status: 'completed',
          reference: `Contest Win: ${contest.name} - Rank ${entry.rank} (auto fix)`,
        },
      });

      console.log(
        `[Prize Monitor] Created transaction record: ${transaction.id}`
      );

      fixedEntries.push({
        entryId: entry.id,
        userId: entry.userId,
        userName: entry.user.name,
        rank: entry.rank,
        prizeAmount,
        transactionCreated: true,
        transactionId: transaction.id,
      });
    }

    return {
      contestId,
      contestName: contest.name,
      totalFixed: fixedEntries.length,
      fixedEntries,
    };
  } catch (error) {
    console.error('[Prize Monitor] Error fixing missed prizes:', error);
    throw error;
  }
}
