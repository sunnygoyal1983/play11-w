import { NextRequest, NextResponse } from 'next/server';

// Define prize distribution type
interface PrizeDistribution {
  rank: number | string; // Can be a number or a string like "101-200"
  amount: number;
  percentage: number;
}

// Debug endpoint to test prize distribution logic without affecting the database
export async function POST(req: NextRequest) {
  try {
    const { totalPrize, winnerCount, firstPrize } = await req.json();

    // Validate inputs
    if (!totalPrize || !winnerCount || !firstPrize) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Generate prize breakup based on the input parameters
    const prizeBreakup = generatePrizeBreakup(
      totalPrize,
      winnerCount,
      firstPrize
    );

    return NextResponse.json({ prizeBreakup });
  } catch (error) {
    console.error('Error generating prize breakup:', error);
    return NextResponse.json(
      { error: 'Failed to generate prize breakup' },
      { status: 500 }
    );
  }
}

function generatePrizeBreakup(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number
): PrizeDistribution[] {
  // Validate inputs
  if (
    winnerCount <= 0 ||
    totalPrize <= 0 ||
    firstPrize <= 0 ||
    firstPrize > totalPrize
  ) {
    throw new Error('Invalid inputs for prize breakup');
  }

  // Calculate remaining prize pool after first prize
  const remainingPrize = totalPrize - firstPrize;

  // For mega contests with many winners, we'll use a tiered approach
  const isMegaContest = winnerCount >= 100;

  let prizeBreakup: PrizeDistribution[] = [];

  // First prize is always fixed
  prizeBreakup.push({
    rank: 1,
    amount: firstPrize,
    percentage: Math.round((firstPrize / totalPrize) * 100),
  });

  // If there's only one winner, return just the first prize
  if (winnerCount === 1) {
    return prizeBreakup;
  }

  // For small contests with 2 or 3 winners, use simple percentage distribution
  if (winnerCount <= 3) {
    const secondPrize = Math.floor(remainingPrize * 0.6);
    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });

    if (winnerCount === 3) {
      const thirdPrize = remainingPrize - secondPrize;
      prizeBreakup.push({
        rank: 3,
        amount: thirdPrize,
        percentage: Math.round((thirdPrize / totalPrize) * 100),
      });
    }

    return prizeBreakup;
  }

  // For medium contests with 4-99 winners, use a decreasing prize distribution
  if (winnerCount < 100) {
    // Distribute 70% of remaining for ranks 2-10 (or less if fewer winners)
    const topTierCount = Math.min(9, winnerCount - 1);
    const topTierAmount = Math.floor(remainingPrize * 0.7);

    // Calculate individual prizes for top tier (ranks 2-10)
    for (let i = 0; i < topTierCount; i++) {
      const rank = i + 2;
      // Decreasing distribution for top ranks
      const weight =
        (topTierCount - i) / ((topTierCount * (topTierCount + 1)) / 2);
      const prize = Math.floor(topTierAmount * weight);

      prizeBreakup.push({
        rank,
        amount: prize,
        percentage: Math.round((prize / totalPrize) * 100),
      });
    }

    // Distribute remaining 30% evenly among lower ranks
    if (winnerCount > 10) {
      const lowerTierCount = winnerCount - 10;
      const lowerTierAmount = remainingPrize - topTierAmount;
      const baseAmount = Math.floor(lowerTierAmount / lowerTierCount);

      for (let i = 0; i < lowerTierCount; i++) {
        const rank = i + 11;
        prizeBreakup.push({
          rank,
          amount: baseAmount,
          percentage: Math.round((baseAmount / totalPrize) * 100),
        });
      }
    }

    return prizeBreakup;
  }

  // For mega contests (100+ winners), use a tiered approach with grouping
  // This follows the specified distribution strategy in the example

  // Define tier ranges and percentages
  const tiers = [
    { start: 2, end: 10, percentage: 0.25 }, // 25% for ranks 2-10
    { start: 11, end: 100, percentage: 0.35 }, // 35% for ranks 11-100
    { start: 101, end: winnerCount, percentage: 0.4 }, // 40% for ranks 101-winnerCount
  ];

  // Calculate tier prizes
  for (const tier of tiers) {
    const tierCount = tier.end - tier.start + 1;
    const tierAmount = Math.floor(remainingPrize * tier.percentage);

    // Verify tier is valid for this contest
    if (tier.start > winnerCount) continue;

    // Adjust end rank if necessary
    const actualEnd = Math.min(tier.end, winnerCount);
    const actualTierCount = actualEnd - tier.start + 1;

    if (actualTierCount <= 9) {
      // For small tiers, distribute individually with decreasing weights
      let tierTotal = 0;
      const weights = [];

      // Calculate decreasing weights
      for (let i = 0; i < actualTierCount; i++) {
        weights.push(actualTierCount - i);
        tierTotal += actualTierCount - i;
      }

      // Distribute based on weights
      for (let i = 0; i < actualTierCount; i++) {
        const rank = tier.start + i;
        const prize = Math.floor(tierAmount * (weights[i] / tierTotal));

        prizeBreakup.push({
          rank,
          amount: prize,
          percentage: Math.round((prize / totalPrize) * 100),
        });
      }
    } else {
      // For larger tiers, group prizes by amount
      const basePrize = Math.floor(tierAmount / actualTierCount);
      if (basePrize <= 0) continue; // Skip if prize is too small

      // Distribute top positions in tier individually
      const individualCount = Math.min(9, actualTierCount);
      let usedAmount = 0;

      for (let i = 0; i < individualCount; i++) {
        const rank = tier.start + i;
        // Higher prize for top positions in tier (linearly decreasing)
        const factor = 1 + (individualCount - i) / individualCount;
        const prize = Math.floor(basePrize * factor);
        usedAmount += prize;

        prizeBreakup.push({
          rank,
          amount: prize,
          percentage: Math.round((prize / totalPrize) * 100),
        });
      }

      // Group remaining ranks by prize amount
      const remainingCount = actualTierCount - individualCount;
      const remainingAmount = tierAmount - usedAmount;

      if (remainingCount > 0 && remainingAmount > 0) {
        // Create prize groups (larger groups for lower positions)
        const groupCount = Math.min(5, Math.ceil(Math.log2(remainingCount)));

        // Calculate group sizes with exponential growth
        const groupSizes = [];
        let totalSize = 0;

        for (let i = 0; i < groupCount; i++) {
          // Each group is roughly twice as large as the previous one
          const size = Math.floor(
            (remainingCount * Math.pow(2, i)) / (Math.pow(2, groupCount) - 1)
          );
          groupSizes.push(size);
          totalSize += size;
        }

        // Adjust last group size to ensure all winners are accounted for
        groupSizes[groupCount - 1] += remainingCount - totalSize;

        // Distribute prizes to groups
        let currentRank = tier.start + individualCount;

        for (let i = 0; i < groupCount; i++) {
          if (groupSizes[i] <= 0) continue;

          // Calculate prize amount (decreasing for later groups)
          const factor = 1 - (i / groupCount) * 0.5; // Gradual decrease
          const prizePerUser = Math.floor(
            (remainingAmount / remainingCount) * factor
          );

          if (prizePerUser <= 0) continue;

          const endRank = currentRank + groupSizes[i] - 1;

          // Use range format for rank (e.g., "101-200")
          const rankDisplay =
            currentRank === endRank
              ? `${currentRank}`
              : `${currentRank}-${endRank}`;

          prizeBreakup.push({
            rank: rankDisplay,
            amount: prizePerUser,
            percentage: Math.round(
              ((prizePerUser * groupSizes[i]) / totalPrize) * 100
            ),
          });

          currentRank = endRank + 1;
        }
      }
    }
  }

  // Ensure total percentage is 100%
  const totalPercentage = prizeBreakup.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  // Adjust if necessary (might be slightly off due to rounding)
  if (totalPercentage !== 100) {
    const diff = 100 - totalPercentage;
    // Add or subtract from first prize percentage
    prizeBreakup[0].percentage += diff;
  }

  return prizeBreakup;
}
