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
  const prizeBreakup: PrizeItem[] = [];

  console.log(
    `[Prize Breakup] Generating for contest with total prize: ${totalPrize}, winners: ${winnerCount}`
  );

  // First prize is always fixed
  prizeBreakup.push({
    rank: 1,
    amount: firstPrize,
    percentage: Math.round((firstPrize / totalPrize) * 100),
  });

  // If only one winner, return just the first prize
  if (winnerCount === 1) {
    return prizeBreakup;
  }

  // Calculate remaining prize pool after first prize
  let remainingPrize = totalPrize - firstPrize;

  // For mega contests (100+ winners)
  if (winnerCount >= 100) {
    return generateMegaContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      remainingPrize
    );
  }

  // For small contests with 2 or 3 winners, use simple percentage distribution
  if (winnerCount <= 3) {
    return generateSmallContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      remainingPrize
    );
  }

  // For medium contests (4-99 winners)
  return generateMediumContestPrizes(
    totalPrize,
    winnerCount,
    firstPrize,
    remainingPrize
  );
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

  let prizeAmountUsed = firstPrize;

  // Top 3 ranks get individual prizes
  if (winnerCount >= 3) {
    // Second prize (around 5-8% of total prize)
    const secondPrize = Math.floor(totalPrize * 0.06);
    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });
    prizeAmountUsed += secondPrize;

    // Third prize (around 3-5% of total prize)
    const thirdPrize = Math.floor(totalPrize * 0.04);
    prizeBreakup.push({
      rank: 3,
      amount: thirdPrize,
      percentage: Math.round((thirdPrize / totalPrize) * 100),
    });
    prizeAmountUsed += thirdPrize;
  }

  // Recalculate remaining prize after top 3
  const prizesForRemaining = totalPrize - prizeAmountUsed;
  let usedFromRemaining = 0;

  // For ranks 4-10, individual prizes with decreasing values
  const rank4to10Count = Math.min(7, winnerCount - 3);
  if (rank4to10Count > 0) {
    const rank4to10Prize = prizesForRemaining * 0.3;
    let rank4to10Used = 0;

    for (let i = 0; i < rank4to10Count; i++) {
      const rank = i + 4;
      const weight =
        (rank4to10Count - i) / ((rank4to10Count * (rank4to10Count + 1)) / 2);
      const amount = Math.floor(rank4to10Prize * weight);
      rank4to10Used += amount;

      prizeBreakup.push({
        rank,
        amount,
        percentage: Math.round((amount / totalPrize) * 100),
      });
    }

    usedFromRemaining += rank4to10Used;
  }

  // Remaining ranks in groups with same prize amount
  if (winnerCount > 10) {
    const remainingCount = winnerCount - 10;
    const leftoverPrize = prizesForRemaining - usedFromRemaining;

    // Create groups based on remaining count
    let groupBoundaries: number[][] = [];

    if (remainingCount <= 40) {
      // For smaller contests, create 2 groups
      const mid = Math.floor(remainingCount / 2) + 10;
      groupBoundaries = [
        [11, mid],
        [mid + 1, winnerCount],
      ];
    } else if (remainingCount <= 100) {
      // For medium contests, create 3 groups
      const third = Math.floor(remainingCount / 3);
      groupBoundaries = [
        [11, 10 + third],
        [11 + third, 10 + 2 * third],
        [11 + 2 * third, winnerCount],
      ];
    } else {
      // For larger contests, create 4+ groups
      groupBoundaries = [
        [11, 25],
        [26, 50],
        [51, 100],
        [101, winnerCount],
      ];
    }

    // Calculate weights for prize distribution
    let groupWeights = [];
    let totalWeight = 0;

    for (let i = 0; i < groupBoundaries.length; i++) {
      const [start, end] = groupBoundaries[i];
      const groupSize = end - start + 1;
      const weight = Math.pow(0.6, i) * groupSize;
      totalWeight += weight;
      groupWeights.push(weight);
    }

    // Distribute remaining prize pool
    let groupPrizeTotal = 0;
    for (let i = 0; i < groupBoundaries.length; i++) {
      const [start, end] = groupBoundaries[i];
      const groupSize = end - start + 1;

      // Last group gets whatever is left to ensure exact total
      let groupAmount;
      if (i === groupBoundaries.length - 1) {
        groupAmount = leftoverPrize - groupPrizeTotal;
      } else {
        groupAmount = Math.floor(
          (groupWeights[i] / totalWeight) * leftoverPrize
        );
        groupPrizeTotal += groupAmount;
      }

      const prizePerRank = Math.max(10, Math.floor(groupAmount / groupSize));

      // Create rank as string to avoid type issues
      const rankString = `${start}-${end}`;

      prizeBreakup.push({
        rank: rankString,
        amount: prizePerRank,
        percentage: Math.round(((prizePerRank * groupSize) / totalPrize) * 100),
      });
    }
  }

  return prizeBreakup;
}

// Helper function for mega contests (100+ winners)
function generateMegaContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  remainingPrize: number
): PrizeItem[] {
  console.log(
    `[Prize Breakup] Starting mega contest distribution for totalPrize: ${totalPrize}, winners: ${winnerCount}`
  );

  // Initialize the prize breakup with the first prize
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  let prizeAmountUsed = firstPrize;

  // Second tier: Rank 2
  const secondPrize = Math.floor(totalPrize * 0.03);
  prizeBreakup.push({
    rank: 2,
    amount: secondPrize,
    percentage: Math.round((secondPrize / totalPrize) * 100),
  });
  prizeAmountUsed += secondPrize;

  // Third tier: Rank 3
  const thirdPrize = Math.floor(totalPrize * 0.02);
  prizeBreakup.push({
    rank: 3,
    amount: thirdPrize,
    percentage: Math.round((thirdPrize / totalPrize) * 100),
  });
  prizeAmountUsed += thirdPrize;

  // Calculate remaining prize pool for distribution
  const remainingForDistribution = totalPrize - prizeAmountUsed;

  // Define tier boundaries based on winner count
  const tierDefinitions = [];

  // Create dynamic tiers based on winner count
  if (winnerCount <= 1000) {
    tierDefinitions.push(
      { start: 4, end: 10 },
      { start: 11, end: 25 },
      { start: 26, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 250 },
      { start: 251, end: 500 },
      { start: 501, end: winnerCount }
    );
  } else if (winnerCount <= 5000) {
    tierDefinitions.push(
      { start: 4, end: 10 },
      { start: 11, end: 25 },
      { start: 26, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 250 },
      { start: 251, end: 500 },
      { start: 501, end: 1000 },
      { start: 1001, end: 2500 },
      { start: 2501, end: winnerCount }
    );
  } else {
    // For very large contests (5000+)
    tierDefinitions.push(
      { start: 4, end: 10 },
      { start: 11, end: 25 },
      { start: 26, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 250 },
      { start: 251, end: 500 },
      { start: 501, end: 1000 },
      { start: 1001, end: 2500 },
      { start: 2501, end: 5000 },
      { start: 5001, end: winnerCount }
    );
  }

  // Filter and adjust tiers
  const validTiers = tierDefinitions
    .filter((tier) => tier.start <= winnerCount)
    .map((tier) => ({
      start: tier.start,
      end: Math.min(tier.end, winnerCount),
    }));

  // Calculate total winners in tiers
  let totalTierWinners = validTiers.reduce(
    (sum, tier) => sum + (tier.end - tier.start + 1),
    0
  );

  // Calculate prize distribution with exponential decay
  let totalDistributed = 0;

  for (let i = 0; i < validTiers.length; i++) {
    const tier = validTiers[i];
    const tierSize = tier.end - tier.start + 1;

    if (tierSize <= 0) continue;

    // Calculate tier prize with exponential decay
    const weight = Math.pow(0.7, i); // Decay factor
    let tierAmount;

    if (i === validTiers.length - 1) {
      // Last tier gets remaining prize pool
      tierAmount = remainingForDistribution - totalDistributed;
    } else {
      // Calculate tier amount based on weight and size
      tierAmount = Math.floor(
        (remainingForDistribution * weight * tierSize) /
          (totalTierWinners * Math.pow(0.7, validTiers.length - 1))
      );
      totalDistributed += tierAmount;
    }

    // Calculate prize per rank, ensuring minimum of 10
    const prizePerRank = Math.max(10, Math.floor(tierAmount / tierSize));

    // Add tier to prize breakup
    prizeBreakup.push({
      rank: `${tier.start}-${tier.end}`,
      amount: prizePerRank,
      percentage: Math.round(((prizePerRank * tierSize) / totalPrize) * 100),
    });
  }

  // Sort prize breakup by rank
  prizeBreakup.sort((a, b) => {
    return getRankValue(a.rank) - getRankValue(b.rank);
  });

  // Verify total prize distribution
  const totalDistribution = prizeBreakup.reduce((sum, item) => {
    const amount = item.amount;
    if (typeof item.rank === 'string') {
      const [start, end] = item.rank.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        return sum + amount * (end - start + 1);
      }
    }
    return sum + amount;
  }, 0);

  console.log(
    `[Prize Breakup] Total prize distribution: ${totalDistribution} out of ${totalPrize}`
  );

  // If we're significantly under the total prize, adjust the first prize
  if (totalDistribution < totalPrize - 100) {
    const difference = totalPrize - totalDistribution;
    prizeBreakup[0].amount += difference;
    prizeBreakup[0].percentage = Math.round(
      (prizeBreakup[0].amount / totalPrize) * 100
    );
  }

  return prizeBreakup;
}

function getRankValue(rank: string | number): number {
  if (typeof rank === 'string') {
    return parseInt(rank.split('-')[0]);
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
        currentGroup.endRank === prize.rank - 1
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
    // Check authentication and admin status
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

    // Create new prize breakup entries
    const createdPrizes = await Promise.all(
      prizeBreakup.map(async (prize) => {
        // For range ranks like "101-200", store as string
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

    if (actualWinnerCount < contest.winnerCount) {
      console.warn(
        `[Admin Prizes API] Warning: Prize breakup only covers ${actualWinnerCount} winners out of ${contest.winnerCount}`
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
