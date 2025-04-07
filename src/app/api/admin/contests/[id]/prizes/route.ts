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
  const prizeAfterFirst = totalPrize - firstPrize;

  // For small contests with 2 or 3 winners, use simple percentage distribution
  if (winnerCount <= 3) {
    const secondPrize = Math.floor(prizeAfterFirst * 0.6);
    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });

    if (winnerCount === 3) {
      const thirdPrize = prizeAfterFirst - secondPrize;
      prizeBreakup.push({
        rank: 3,
        amount: thirdPrize,
        percentage: Math.round((thirdPrize / totalPrize) * 100),
      });
    }

    return prizeBreakup;
  }

  // For medium contests (4-99 winners), use a decreasing prize distribution
  if (winnerCount < 100) {
    // Top 3 ranks get individual prizes
    if (winnerCount >= 3) {
      // Second prize (around 5-8% of total prize)
      const secondPrize = Math.floor(totalPrize * 0.06);
      prizeBreakup.push({
        rank: 2,
        amount: secondPrize,
        percentage: Math.round((secondPrize / totalPrize) * 100),
      });

      // Third prize (around 3-5% of total prize)
      const thirdPrize = Math.floor(totalPrize * 0.04);
      prizeBreakup.push({
        rank: 3,
        amount: thirdPrize,
        percentage: Math.round((thirdPrize / totalPrize) * 100),
      });
    }

    // Remaining prize pool after top 3
    const topThreePrize =
      winnerCount >= 3
        ? firstPrize + prizeBreakup[1].amount + prizeBreakup[2].amount
        : firstPrize;
    const prizesForRemaining = totalPrize - topThreePrize;

    // For ranks 4-10, individual prizes with decreasing values
    const rank4to10Count = Math.min(7, winnerCount - 3);
    if (rank4to10Count > 0) {
      const rank4to10Prize = prizesForRemaining * 0.3;
      for (let i = 0; i < rank4to10Count; i++) {
        const rank = i + 4;
        const weight =
          (rank4to10Count - i) / ((rank4to10Count * (rank4to10Count + 1)) / 2);
        const amount = Math.floor(rank4to10Prize * weight);

        prizeBreakup.push({
          rank,
          amount,
          percentage: Math.round((amount / totalPrize) * 100),
        });
      }
    }

    // Remaining ranks in groups with same prize amount
    if (winnerCount > 10) {
      const remainingCount = winnerCount - 10;
      const remainingPrizeAmount = prizesForRemaining * 0.7;

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

      // Calculate diminishing prize amounts for each group
      let prizePerGroup = [];
      let totalWeight = 0;

      for (let i = 0; i < groupBoundaries.length; i++) {
        const weight = Math.pow(0.6, i); // Exponential decay
        totalWeight += weight;
        prizePerGroup.push(weight);
      }

      // Normalize and distribute
      for (let i = 0; i < groupBoundaries.length; i++) {
        const [start, end] = groupBoundaries[i];
        const groupSize = end - start + 1;
        const groupPrize =
          (prizePerGroup[i] / totalWeight) * remainingPrizeAmount;
        const prizePerRank = Math.floor(groupPrize / groupSize);

        if (prizePerRank <= 0) continue; // Skip if prize is too small

        prizeBreakup.push({
          rank: `${start}-${end}`,
          amount: prizePerRank,
          percentage: Math.round(
            ((prizePerRank * groupSize) / totalPrize) * 100
          ),
        });
      }
    }

    return prizeBreakup;
  }

  // For mega contests (100+ winners), create Dream11-style tiered grouping
  // Analyze the prize structure in the example: large first prize, then groups with decreasing prizes

  // First tier: Top 1 (already added)

  // Second tier: Rank 2 (around 2-5% of prize pool)
  const secondPrize = Math.floor(totalPrize * 0.03);
  prizeBreakup.push({
    rank: 2,
    amount: secondPrize,
    percentage: Math.round((secondPrize / totalPrize) * 100),
  });

  // Third tier: Rank 3 (slightly less than rank 2)
  const thirdPrize = Math.floor(totalPrize * 0.02);
  prizeBreakup.push({
    rank: 3,
    amount: thirdPrize,
    percentage: Math.round((thirdPrize / totalPrize) * 100),
  });

  // Define tier boundaries based on total winners
  // These tiers follow Dream11's approach with gradually increasing group sizes
  const tierDefinitions = [];

  // Create tiers based on winner count
  if (winnerCount <= 100) {
    tierDefinitions.push(
      { start: 4, end: 10 },
      { start: 11, end: 25 },
      { start: 26, end: 50 },
      { start: 51, end: winnerCount }
    );
  } else if (winnerCount <= 1000) {
    tierDefinitions.push(
      { start: 4, end: 10 },
      { start: 11, end: 25 },
      { start: 26, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 250 },
      { start: 251, end: 500 },
      { start: 501, end: winnerCount }
    );
  } else {
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
  }

  // Filter out tiers that start beyond our winner count
  const validTiers = tierDefinitions.filter(
    (tier) => tier.start <= winnerCount
  );

  // Calculate the remaining prize pool after top 3 prizes
  const remainingPrize = totalPrize - firstPrize - secondPrize - thirdPrize;

  // Calculate multipliers for each tier with exponential decay
  // The sum of these will be used to divide the prize pool proportionally
  let tierMultipliers = [];
  let multiplierSum = 0;

  for (let i = 0; i < validTiers.length; i++) {
    const tier = validTiers[i];
    const tierSize = tier.end - tier.start + 1;

    // Smaller ranks get higher prizes (hence higher multiplier)
    // Use an exponential decay for more natural distribution
    const multiplier = Math.pow(0.7, i) * tierSize;
    multiplierSum += multiplier;
    tierMultipliers.push(multiplier);
  }

  // Distribute remaining prize pool proportionally
  for (let i = 0; i < validTiers.length; i++) {
    const tier = validTiers[i];
    const tierSize = tier.end - tier.start + 1;

    // Calculate prize for this tier
    const tierPrizePool = (tierMultipliers[i] / multiplierSum) * remainingPrize;
    const prizePerRank = Math.floor(tierPrizePool / tierSize);

    // Ensure prize is at least 10 rupees
    const finalPrize = Math.max(10, prizePerRank);

    prizeBreakup.push({
      rank: `${tier.start}-${tier.end}`,
      amount: finalPrize,
      percentage: Math.round(((finalPrize * tierSize) / totalPrize) * 100),
    });
  }

  // Ensure all winners get prizes - add any missing ranks
  const coveredRanks = new Set();

  // Add all ranks from prize breakup
  for (const prize of prizeBreakup) {
    if (typeof prize.rank === 'number') {
      coveredRanks.add(prize.rank);
    } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      const [start, end] = prize.rank.split('-').map(Number);
      for (let rank = start; rank <= end; rank++) {
        coveredRanks.add(rank);
      }
    }
  }

  // Check if all winners are covered
  let allCovered = true;
  for (let rank = 1; rank <= winnerCount; rank++) {
    if (!coveredRanks.has(rank)) {
      allCovered = false;
      break;
    }
  }

  if (!allCovered) {
    console.log(
      `[Prize Breakup] Not all winners covered in the prize breakup. Ensuring coverage for all ${winnerCount} winners.`
    );

    // Find the smallest prize already in the breakup
    let smallestPrize = Number.MAX_SAFE_INTEGER;
    for (const prize of prizeBreakup) {
      if (prize.amount < smallestPrize) {
        smallestPrize = prize.amount;
      }
    }

    // Ensure it's at least 10 rupees
    smallestPrize = Math.max(10, smallestPrize);

    // Fill in any missing ranks
    let missingRankStart = null;
    let missingRankEnd = null;

    for (let rank = 1; rank <= winnerCount; rank++) {
      if (!coveredRanks.has(rank)) {
        if (missingRankStart === null) {
          missingRankStart = rank;
        }
        missingRankEnd = rank;
      } else if (missingRankStart !== null) {
        // We found a gap - add it
        prizeBreakup.push({
          rank:
            missingRankStart === missingRankEnd
              ? missingRankStart
              : `${missingRankStart}-${missingRankEnd}`,
          amount: smallestPrize,
          percentage: Math.round((smallestPrize / totalPrize) * 100),
        });

        missingRankStart = null;
        missingRankEnd = null;
      }
    }

    // Add the last gap if there is one
    if (missingRankStart !== null) {
      prizeBreakup.push({
        rank:
          missingRankStart === missingRankEnd
            ? missingRankStart
            : `${missingRankStart}-${missingRankEnd}`,
        amount: smallestPrize,
        percentage: Math.round((smallestPrize / totalPrize) * 100),
      });
    }
  }

  // Sort the prize breakup by rank
  prizeBreakup.sort((a, b) => {
    const rankA =
      typeof a.rank === 'string' ? parseInt(a.rank.split('-')[0]) : a.rank;
    const rankB =
      typeof b.rank === 'string' ? parseInt(b.rank.split('-')[0]) : b.rank;
    return rankA - rankB;
  });

  return prizeBreakup;
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
