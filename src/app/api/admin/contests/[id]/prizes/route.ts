import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

// Helper function to generate prize breakup
interface PrizeItem {
  rank: number | string;
  amount: number;
  percentage: number;
}

function generatePrizeBreakup(contest: any): PrizeItem[] {
  const { totalPrize, winnerCount, firstPrize } = contest;

  console.log(
    `[Prize Breakup] Generating for contest with total prize: ${totalPrize}, winners: ${winnerCount}`
  );

  // First prize is always fixed
  const prizeBreakup: PrizeItem[] = [];

  // If only one winner, return just the first prize
  if (winnerCount === 1) {
    return [
      {
        rank: 1,
        amount: firstPrize,
        percentage: 100,
      },
    ];
  }

  // For mega contests (100+ winners), use the new simplified algorithm
  if (winnerCount >= 100) {
    return generateSimplifiedMegaContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize
    );
  }

  // For small contests with 2 or 3 winners, use simple percentage distribution
  if (winnerCount <= 3) {
    return generateSmallContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      totalPrize - firstPrize
    );
  }

  // For medium contests (4-99 winners)
  return generateMediumContestPrizes(
    totalPrize,
    winnerCount,
    firstPrize,
    totalPrize - firstPrize
  );
}

// New simplified function for mega contests
function generateSimplifiedMegaContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number
): PrizeItem[] {
  console.log(
    `[Prize Breakup] Using simplified mega contest distribution for ${winnerCount} winners`
  );

  // Initialize with first prize
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  // Calculate remaining prize pool
  let remainingPrize = totalPrize - firstPrize;

  // Define fixed top prizes (ranks 2-10)
  const topPrizes = [
    { rank: 2, percentage: 3 }, // 3% for rank 2
    { rank: 3, percentage: 2 }, // 2% for rank 3
    { rank: 4, percentage: 1.5 }, // 1.5% for rank 4
    { rank: 5, percentage: 1.2 }, // 1.2% for rank 5
    { rank: 6, percentage: 1 }, // 1% for rank 6
    { rank: 7, percentage: 0.9 }, // 0.9% for rank 7
    { rank: 8, percentage: 0.8 }, // 0.8% for rank 8
    { rank: 9, percentage: 0.7 }, // 0.7% for rank 9
    { rank: 10, percentage: 0.6 }, // 0.6% for rank 10
  ];

  // Calculate and add top prizes
  let usedPrize = firstPrize;
  for (const prize of topPrizes) {
    if (prize.rank > winnerCount) break;

    const amount = Math.floor(totalPrize * (prize.percentage / 100));
    prizeBreakup.push({
      rank: prize.rank,
      amount: amount,
      percentage: prize.percentage,
    });

    usedPrize += amount;
  }

  // Define a simpler tier structure for remaining ranks
  // This ensures we have clean ranges with no duplicates
  const tiers = [
    { start: 11, end: 100, factor: 1.3 },
    { start: 101, end: 200, factor: 1.2 },
    { start: 201, end: 500, factor: 1.1 },
    { start: 501, end: 1000, factor: 1.0 },
    { start: 1001, end: 2000, factor: 0.9 },
    { start: 2001, end: 3000, factor: 0.8 },
    { start: 3001, end: 4000, factor: 0.7 },
    { start: 4001, end: 5000, factor: 0.6 },
    { start: 5001, end: winnerCount, factor: 0.5 },
  ];

  // Filter out tiers that aren't applicable to this contest
  const validTiers = tiers
    .filter((tier) => tier.start <= winnerCount)
    .map((tier) => ({
      ...tier,
      end: Math.min(tier.end, winnerCount),
    }));

  // Calculate total weighted count for distribution
  let totalWeightedCount = 0;
  for (const tier of validTiers) {
    const tierSize = tier.end - tier.start + 1;
    if (tierSize > 0) {
      totalWeightedCount += tierSize * tier.factor;
    }
  }

  // Calculate prize per weighted unit
  const prizePerWeightedUnit = remainingPrize / totalWeightedCount;

  // Distribute prizes to tiers
  let totalAllocated = 0;

  for (const tier of validTiers) {
    const tierSize = tier.end - tier.start + 1;
    if (tierSize <= 0) continue;

    // Calculate tier amount with weighting
    const tierAmount = Math.max(
      10,
      Math.floor(prizePerWeightedUnit * tier.factor)
    );

    // Create a clean rank display format
    const rankDisplay = `${tier.start}-${tier.end}`;
    const totalTierAmount = tierAmount * tierSize;
    totalAllocated += totalTierAmount;

    prizeBreakup.push({
      rank: rankDisplay,
      amount: tierAmount,
      percentage: Math.round((totalTierAmount / totalPrize) * 100),
    });
  }

  // Check for any remaining unallocated prize money
  const unallocated = remainingPrize - totalAllocated;

  // Add unallocated amount to first prize
  if (Math.abs(unallocated) > 0) {
    console.log(
      `[Prize Breakup] Adjusting first prize by ${unallocated} to balance total`
    );
    prizeBreakup[0].amount += unallocated;
    prizeBreakup[0].percentage = Math.round(
      (prizeBreakup[0].amount / totalPrize) * 100
    );
  }

  // Sort prize breakup by rank
  prizeBreakup.sort((a, b) => {
    return getRankValue(a.rank) - getRankValue(b.rank);
  });

  // Verify total winners covered
  let totalWinnersCovered = 0;
  for (const prize of prizeBreakup) {
    if (typeof prize.rank === 'number') {
      totalWinnersCovered += 1;
    } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      const [start, end] = prize.rank.split('-').map(Number);
      totalWinnersCovered += end - start + 1;
    }
  }

  console.log(
    `[Prize Breakup] Total winners covered: ${totalWinnersCovered}, Expected: ${winnerCount}`
  );

  // Final check - if we're missing winners, add them to the last tier
  if (totalWinnersCovered < winnerCount) {
    console.log(
      `[Prize Breakup] Missing ${
        winnerCount - totalWinnersCovered
      } winners, adding them to final tier`
    );

    // Find the last range prize
    const lastRangePrize = [...prizeBreakup]
      .filter((p) => typeof p.rank === 'string' && p.rank.includes('-'))
      .sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];

    if (lastRangePrize) {
      // Update the end of the range to include all winners
      const [start] = lastRangePrize.rank.toString().split('-').map(Number);
      lastRangePrize.rank = `${start}-${winnerCount}`;

      // Recalculate percentage based on new count
      const newTierSize = winnerCount - start + 1;
      const newTierTotal = lastRangePrize.amount * newTierSize;
      lastRangePrize.percentage = Math.round((newTierTotal / totalPrize) * 100);
    }
  }

  // Verify total prize distribution
  const totalDistribution = calculateTotalPrizeDistribution(
    prizeBreakup,
    winnerCount
  );
  console.log(
    `[Prize Breakup] Total prize distribution: ${totalDistribution}, Expected: ${totalPrize}`
  );

  return prizeBreakup;
}

// Helper function for small contests (1-3 winners)
function generateSmallContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  remainingPrize: number
): PrizeItem[] {
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  if (winnerCount <= 1) return prizeBreakup;

  // Calculate remaining prize pool after first prize
  if (winnerCount === 2) {
    const secondPrize = remainingPrize;
    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });
  } else {
    // For 3 winners
    const secondPrize = Math.floor(remainingPrize * 0.6);
    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });

    const thirdPrize = remainingPrize - secondPrize;
    prizeBreakup.push({
      rank: 3,
      amount: thirdPrize,
      percentage: Math.round((thirdPrize / totalPrize) * 100),
    });
  }

  return prizeBreakup;
}

// Helper function for medium contests (4-99 winners)
function generateMediumContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  remainingPrize: number
): PrizeItem[] {
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  // Second prize (around 6% of total prize)
  const secondPrize = Math.floor(totalPrize * 0.06);
  prizeBreakup.push({
    rank: 2,
    amount: secondPrize,
    percentage: Math.round((secondPrize / totalPrize) * 100),
  });

  // Third prize (around 4% of total prize)
  const thirdPrize = Math.floor(totalPrize * 0.04);
  prizeBreakup.push({
    rank: 3,
    amount: thirdPrize,
    percentage: Math.round((thirdPrize / totalPrize) * 100),
  });

  let prizeAmountUsed = firstPrize + secondPrize + thirdPrize;

  // Remaining prize pool for ranks 4+
  const prizesForRemaining = remainingPrize;

  // For ranks 4-10, individual prizes with decreasing values
  const rank4to10Count = Math.min(7, winnerCount - 3);
  if (rank4to10Count > 0) {
    const rank4to10Prize = prizesForRemaining * 0.4;
    let rank4to10Used = 0;

    // Calculate weights for ranks 4-10
    let totalWeight = 0;
    const weights = [];
    for (let i = 0; i < rank4to10Count; i++) {
      const weight = rank4to10Count - i;
      weights.push(weight);
      totalWeight += weight;
    }

    // Distribute prizes for ranks 4-10
    for (let i = 0; i < rank4to10Count; i++) {
      const rank = i + 4;
      const amount = Math.floor(rank4to10Prize * (weights[i] / totalWeight));
      rank4to10Used += amount;

      prizeBreakup.push({
        rank,
        amount,
        percentage: Math.round((amount / totalPrize) * 100),
      });
    }

    prizeAmountUsed += rank4to10Used;
  }

  // Remaining ranks (11+) grouped with same prize amount
  if (winnerCount > 10) {
    const remainingCount = winnerCount - 10;
    const leftoverPrize = remainingPrize - prizeAmountUsed;

    // For simplicity, use a flat distribution for the remaining ranks
    const amountPerRank = Math.floor(leftoverPrize / remainingCount);

    // Ensure minimum prize of 10
    const finalAmount = Math.max(10, amountPerRank);

    // Create a single group for ranks 11 to winnerCount
    prizeBreakup.push({
      rank: `11-${winnerCount}`,
      amount: finalAmount,
      percentage: Math.round(
        ((finalAmount * remainingCount) / totalPrize) * 100
      ),
    });

    // Calculate how much we actually allocated
    const actualAllocated = finalAmount * remainingCount;

    // If we have any difference due to rounding, adjust first prize
    const difference = leftoverPrize - actualAllocated;
    if (Math.abs(difference) > 0) {
      prizeBreakup[0].amount += difference;
      prizeBreakup[0].percentage = Math.round(
        (prizeBreakup[0].amount / totalPrize) * 100
      );
    }
  }

  return prizeBreakup;
}

// Helper function to calculate the total prize distribution
function calculateTotalPrizeDistribution(
  prizeBreakup: PrizeItem[],
  winnerCount: number
): number {
  let total = 0;

  for (const item of prizeBreakup) {
    if (typeof item.rank === 'number') {
      // Single rank prize
      total += item.amount;
    } else if (typeof item.rank === 'string' && item.rank.includes('-')) {
      // Range prize
      const parts = item.rank.split('-');
      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);

      if (!isNaN(start) && !isNaN(end)) {
        const count = end - start + 1;
        total += item.amount * count;
      }
    }
  }

  return total;
}

function getRankValue(rank: string | number): number {
  if (typeof rank === 'string') {
    // For string ranks like "101-200", extract the first number
    const firstPart = rank.split('-')[0];
    const parsedRank = parseInt(firstPart);
    return isNaN(parsedRank) ? 0 : parsedRank;
  }
  return rank;
}

// GET - Retrieve prize breakup for a contest
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;

    // Check if the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Fetch existing prize breakup
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    // Transform the data to include percentage and group similar ranks
    const totalPrize = contest.totalPrize;

    // First pass - create initial transformed objects with percentage
    const basicTransform = prizeBreakup.map((prize) => ({
      id: prize.id,
      rank: prize.rank,
      amount: prize.prize,
      percentage: Math.round((prize.prize / totalPrize) * 100),
    }));

    // Second pass - group by amounts and create rank ranges
    const rankedPrizes = [];
    let currentGroup = null;

    for (const prize of basicTransform) {
      if (
        currentGroup &&
        currentGroup.amount === prize.amount &&
        // Extract numeric values for comparison
        getRankValue(currentGroup.endRank) === getRankValue(prize.rank) - 1
      ) {
        // Extend the current group
        currentGroup.endRank = prize.rank;
      } else {
        // Start a new group
        if (currentGroup) {
          // Format and add the previous group
          if (currentGroup.rank === currentGroup.endRank) {
            // Single rank
            rankedPrizes.push({
              id: currentGroup.id,
              rank: currentGroup.rank,
              amount: currentGroup.amount,
              percentage: currentGroup.percentage,
            });
          } else {
            // Range of ranks
            rankedPrizes.push({
              id: currentGroup.id,
              rank: `${currentGroup.rank}-${currentGroup.endRank}`,
              amount: currentGroup.amount,
              percentage: currentGroup.percentage,
            });
          }
        }

        // Initialize the new group
        currentGroup = {
          id: prize.id,
          rank: prize.rank,
          endRank: prize.rank,
          amount: prize.amount,
          percentage: prize.percentage,
        };
      }
    }

    // Add the last group
    if (currentGroup) {
      if (currentGroup.rank === currentGroup.endRank) {
        // Single rank
        rankedPrizes.push({
          id: currentGroup.id,
          rank: currentGroup.rank,
          amount: currentGroup.amount,
          percentage: currentGroup.percentage,
        });
      } else {
        // Range of ranks
        rankedPrizes.push({
          id: currentGroup.id,
          rank: `${currentGroup.rank}-${currentGroup.endRank}`,
          amount: currentGroup.amount,
          percentage: currentGroup.percentage,
        });
      }
    }

    return NextResponse.json(rankedPrizes);
  } catch (error) {
    console.error('Error fetching prize breakup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prize breakup' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate prize breakup for a contest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Restore authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if the user is an admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update prize breakups' },
        { status: 403 }
      );
    }

    const contestId = params.id;
    console.log(
      `[Admin Prizes API] Regenerating prizes for contest: ${contestId}`
    );

    // Fetch the contest details
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      console.log(`[Admin Prizes API] Contest not found: ${contestId}`);
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Delete existing prize breakup
    const deleteResult = await prisma.prizeBreakup.deleteMany({
      where: { contestId },
    });

    console.log(
      `[Admin Prizes API] Deleted ${deleteResult.count} existing prize entries for contest: ${contestId}`
    );

    // Generate new prize breakup
    const prizeBreakup = generatePrizeBreakup(contest);

    console.log(
      `[Admin Prizes API] Generated ${prizeBreakup.length} prize breakup entries`
    );

    // Check if we created entries for all winners
    let actualWinnerCount = 0;

    for (const prize of prizeBreakup) {
      if (typeof prize.rank === 'number') {
        actualWinnerCount += 1;
      } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
        const [start, end] = prize.rank.split('-').map(Number);
        actualWinnerCount += end - start + 1;
      }
    }

    console.log(
      `[Admin Prizes API] Total winners covered: ${actualWinnerCount}, Expected: ${contest.winnerCount}`
    );

    // Check for prize money exceeding the total prize pool
    const totalPrizeDistribution = calculateTotalPrizeDistribution(
      prizeBreakup,
      actualWinnerCount
    );

    // If there's still a major discrepancy, log it but continue
    if (Math.abs(totalPrizeDistribution - Number(contest.totalPrize)) > 100) {
      console.warn(
        `[Admin Prizes API] Warning: Final prize distribution ${totalPrizeDistribution} differs from totalPrize ${
          contest.totalPrize
        } by ${totalPrizeDistribution - Number(contest.totalPrize)}`
      );
    }

    // Create new prize breakup entries in the database
    const createdPrizes = await Promise.all(
      prizeBreakup.map(async (prize) => {
        // Convert rank to string for database storage
        const rankValue =
          typeof prize.rank === 'number' ? prize.rank.toString() : prize.rank;

        return prisma.prizeBreakup.create({
          data: {
            contestId,
            rank: rankValue,
            prize: prize.amount,
          },
        });
      })
    );

    console.log(
      `[Admin Prizes API] Created ${createdPrizes.length} prize breakup entries in database`
    );

    // Final check if actual winners match expected winners
    if (actualWinnerCount !== contest.winnerCount) {
      console.warn(
        `[Admin Prizes API] Warning: Prize breakup covers ${actualWinnerCount} winners, but expected ${contest.winnerCount}`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Prize breakup regenerated with ${prizeBreakup.length} tiers covering ${actualWinnerCount} winners`,
      prizeBreakup,
    });
  } catch (error) {
    console.error(
      '[Admin Prizes API] Error regenerating prize breakup:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to regenerate prize breakup' },
      { status: 500 }
    );
  }
}
