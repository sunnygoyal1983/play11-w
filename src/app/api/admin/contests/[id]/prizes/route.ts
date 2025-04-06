import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // If no prize breakup exists, generate it
    if (prizeBreakup.length === 0) {
      const generatedPrizeBreakup = generatePrizeBreakup(contest);

      // Store the generated prize breakup
      const createdPrizeBreakup = await Promise.all(
        generatedPrizeBreakup.map(async (prize) => {
          return prisma.prizeBreakup.create({
            data: {
              contestId,
              rank: prize.rank,
              prize: prize.amount,
            },
          });
        })
      );

      return NextResponse.json(
        generatedPrizeBreakup.map((prize, index) => ({
          ...prize,
          id: createdPrizeBreakup[index].id,
        }))
      );
    }

    // Transform the data to include percentage
    const totalPrize = contest.totalPrize;
    const transformedPrizeBreakup = prizeBreakup.map((prize) => ({
      id: prize.id,
      rank: prize.rank,
      amount: prize.prize,
      percentage: Math.round((prize.prize / totalPrize) * 100),
    }));

    return NextResponse.json(transformedPrizeBreakup);
  } catch (error) {
    console.error('Error fetching prize breakup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prize breakup' },
      { status: 500 }
    );
  }
}

// POST - Create or update prize breakup for a contest
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;
    const prizeData = await request.json();

    // Check if the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Delete existing prize breakup
    await prisma.prizeBreakup.deleteMany({
      where: { contestId },
    });

    // Create new prize breakup entries
    const createdPrizeBreakup = await Promise.all(
      prizeData.map((prize: { rank: number; amount: number }) => {
        return prisma.prizeBreakup.create({
          data: {
            contestId,
            rank: prize.rank,
            prize: prize.amount,
          },
        });
      })
    );

    // Update the first prize in the contest
    if (prizeData.length > 0 && prizeData[0].rank === 1) {
      await prisma.contest.update({
        where: { id: contestId },
        data: { firstPrize: prizeData[0].amount },
      });
    }

    return NextResponse.json(createdPrizeBreakup);
  } catch (error) {
    console.error('Error creating prize breakup:', error);
    return NextResponse.json(
      { error: 'Failed to create prize breakup' },
      { status: 500 }
    );
  }
}

// Helper function to generate prize breakup
function generatePrizeBreakup(contest: any) {
  const { totalPrize, winnerCount, firstPrize } = contest;
  const prizeBreakup = [];

  // If only one winner, they get the full prize
  if (winnerCount === 1) {
    prizeBreakup.push({ rank: 1, amount: totalPrize, percentage: 100 });
    return prizeBreakup;
  }

  // Dream11 style prize distribution
  // Define the percentage of total prize for each rank based on contest size
  let percentageDistribution: number[] = [];

  if (winnerCount <= 3) {
    // For small contests (≤3 winners)
    // Dream11 typically uses a 50/30/20 distribution
    percentageDistribution = [50, 30, 20];
  } else if (winnerCount <= 10) {
    // For medium contests (4-10 winners)
    // First place gets ~40%, second ~25%, third ~15%, rest distributed with gradual decrease
    percentageDistribution = [40, 25, 15];

    // Distribute remaining 20% among 4th to 10th place with decreasing values
    let remainingPercentage = 20;
    for (let i = 4; i <= winnerCount; i++) {
      // Calculate based on position - lower positions get exponentially less
      const position = i - 3; // 4th place is position 1, 5th is 2, etc.
      const rankPercentage =
        Math.round((remainingPercentage / 2 ** position) * 2) / 2;
      percentageDistribution.push(rankPercentage);
      remainingPercentage -= rankPercentage;
    }
  } else if (winnerCount <= 100) {
    // For large contests (11-100 winners)
    // Top heavy distribution like Dream11's large contests
    percentageDistribution = [30, 20, 10, 7.5, 5];

    let remainingPercentage = 27.5; // 100 - 30 - 20 - 10 - 7.5 - 5

    // Positions 6-10 get 2.5% to 1.5% each
    const midTierPositions = Math.min(5, winnerCount - 5);
    const midTierTotal = 10; // Approximately 10% for positions 6-10
    for (let i = 0; i < midTierPositions; i++) {
      const rankPercentage = Math.max(
        1.5,
        (midTierTotal / midTierPositions) * (1 - i * 0.1)
      );
      percentageDistribution.push(rankPercentage);
      remainingPercentage -= rankPercentage;
    }

    // Remaining positions split the rest with a logarithmic decay
    if (winnerCount > 10) {
      const remainingPositions = winnerCount - 10;

      // Use logarithmic distribution to ensure fair distribution among many winners
      let logDistribution = [];
      let totalLogValue = 0;

      for (let i = 1; i <= remainingPositions; i++) {
        // Use log formula to create diminishing returns
        const logValue = 1 / Math.log(i + 10);
        logDistribution.push(logValue);
        totalLogValue += logValue;
      }

      // Normalize to distribute remaining percentage
      for (let i = 0; i < remainingPositions; i++) {
        const normalizedValue =
          (logDistribution[i] / totalLogValue) * remainingPercentage;
        percentageDistribution.push(normalizedValue);
      }
    }
  } else {
    // For mega contests (>100 winners)
    // For very large contests, Dream11 typically gives top 5-10% of winners a significant prize
    // and distributes smaller amounts to lower ranks

    // Top 5 places
    percentageDistribution = [20, 15, 10, 7, 5];

    // Next 15 places (ranks 6-20) share 20%
    const tierTwoShare = 20;
    const tierTwoCount = Math.min(15, winnerCount - 5);
    const tierTwoBase = (tierTwoShare / tierTwoCount) * 1.5; // Base value, will be decreased

    for (let i = 0; i < tierTwoCount; i++) {
      // Progressive reduction factor
      const reduction = i / tierTwoCount;
      const rankPercentage = tierTwoBase * (1 - reduction * 0.5);
      percentageDistribution.push(rankPercentage);
    }

    // Remaining positions - for large contests, create fewer tiers with grouped ranks
    const remainingTotal =
      100 - percentageDistribution.reduce((a, b) => a + b, 0);
    const remainingPositions = winnerCount - percentageDistribution.length;

    if (remainingPositions > 0) {
      // For mega contests, create tiers instead of individual prizes
      // This helps performance and displays prizes in a more readable format

      // Determine number of tiers based on remaining winners
      let numberOfTiers: number;
      if (remainingPositions > 5000) {
        numberOfTiers = 7; // For extremely large contests
      } else if (remainingPositions > 1000) {
        numberOfTiers = 6;
      } else if (remainingPositions > 500) {
        numberOfTiers = 5;
      } else {
        numberOfTiers = 4;
      }

      // Create tiers with exponentially decreasing prize amounts
      const tiers = [];
      let totalRatio = 0;

      for (let i = 0; i < numberOfTiers; i++) {
        // Use exponential decay for tier ratios
        const ratio = Math.exp(-0.5 * i);
        tiers.push(ratio);
        totalRatio += ratio;
      }

      // Normalize tier ratios
      const normalizedTiers = tiers.map(
        (t) => (t / totalRatio) * remainingTotal
      );

      // Determine winners per tier (larger tiers for lower prizes)
      let remainingWinners = remainingPositions;
      for (let i = 0; i < numberOfTiers; i++) {
        // Last tier gets all remaining winners
        if (i === numberOfTiers - 1) {
          percentageDistribution.push(normalizedTiers[i]);
          break;
        }

        // Calculate winners for this tier, with smaller tiers at the top
        let tierSize: number;
        if (i === 0) {
          // First tier is smallest
          tierSize = Math.ceil(remainingWinners * 0.05);
        } else if (i === 1) {
          tierSize = Math.ceil(remainingWinners * 0.1);
        } else if (i === 2) {
          tierSize = Math.ceil(remainingWinners * 0.15);
        } else {
          // Lower tiers get progressively larger
          const remainingTiers = numberOfTiers - i;
          tierSize = Math.ceil((remainingWinners / remainingTiers) * 1.2);
        }

        // Ensure tier size doesn't exceed remaining winners
        tierSize = Math.min(tierSize, remainingWinners);

        // Each winner in this tier gets the same percentage
        const percentPerWinner = normalizedTiers[i] / tierSize;

        // Add the same percentage for each winner in this tier
        for (let j = 0; j < tierSize; j++) {
          percentageDistribution.push(percentPerWinner);
        }

        remainingWinners -= tierSize;

        // If we've allocated all winners, break
        if (remainingWinners <= 0) {
          break;
        }
      }
    }
  }

  // Calculate prize amounts based on percentages
  // Ensure we don't exceed 100% total
  let totalPercentage = percentageDistribution.reduce((a, b) => a + b, 0);
  if (totalPercentage > 100) {
    // Normalize to 100%
    percentageDistribution = percentageDistribution.map(
      (p) => (p / totalPercentage) * 100
    );
  }

  // Calculate actual prize amounts
  const rawPrizes: { rank: number; amount: number; percentage: number }[] = [];
  for (
    let i = 0;
    i < Math.min(winnerCount, percentageDistribution.length);
    i++
  ) {
    const rank = i + 1;
    const percentage = percentageDistribution[i];
    const amount = Math.floor((percentage / 100) * totalPrize);

    rawPrizes.push({
      rank,
      amount,
      percentage,
    });
  }

  // Handle edge case - if we have more winners than defined percentages
  if (winnerCount > percentageDistribution.length) {
    const lastPercentage =
      percentageDistribution[percentageDistribution.length - 1];
    const lastAmount = rawPrizes[rawPrizes.length - 1].amount;

    for (let i = percentageDistribution.length + 1; i <= winnerCount; i++) {
      rawPrizes.push({
        rank: i,
        amount: lastAmount,
        percentage: lastPercentage,
      });
    }
  }

  // Ensure prizes are in strictly descending order
  let lastAmount = rawPrizes[0].amount;
  for (let i = 1; i < rawPrizes.length; i++) {
    if (rawPrizes[i].amount >= lastAmount) {
      // Reduce this prize to be slightly less than the previous one
      rawPrizes[i].amount = Math.floor(lastAmount * 0.95);
      rawPrizes[i].percentage = Math.round(
        (rawPrizes[i].amount / totalPrize) * 100
      );
    }
    lastAmount = rawPrizes[i].amount;
  }

  // Adjust first prize to match the specified firstPrize
  if (rawPrizes[0].amount !== firstPrize) {
    const difference = firstPrize - rawPrizes[0].amount;
    rawPrizes[0].amount = firstPrize;
    rawPrizes[0].percentage = Math.round((firstPrize / totalPrize) * 100);

    // If we had to increase the first prize, decrease other prizes proportionally
    if (difference > 0) {
      // Reduce other prizes to maintain total
      const totalOtherPrizes = rawPrizes.reduce(
        (sum, prize, index) => (index === 0 ? sum : sum + prize.amount),
        0
      );
      const reductionFactor =
        (totalOtherPrizes - difference) / totalOtherPrizes;

      // Apply reduction to all other prizes
      for (let i = 1; i < rawPrizes.length; i++) {
        rawPrizes[i].amount = Math.floor(rawPrizes[i].amount * reductionFactor);
        rawPrizes[i].percentage = Math.round(
          (rawPrizes[i].amount / totalPrize) * 100
        );
      }
    }
  }

  // Final check - make sure total prize amount matches totalPrize
  const distributedTotal = rawPrizes.reduce(
    (sum, prize) => sum + prize.amount,
    0
  );
  let difference = totalPrize - distributedTotal;

  if (difference !== 0) {
    // Add/subtract the difference from the first prize
    rawPrizes[0].amount += difference;
    rawPrizes[0].percentage = Math.round(
      (rawPrizes[0].amount / totalPrize) * 100
    );
  }

  // Group prizes with the same amount to reduce the number of entries for mega contests
  if (winnerCount > 100) {
    let currentAmount = -1;
    let startRank = 0;

    // Create a new array for grouped prizes with string rank
    const groupedPrizes: {
      rank: string;
      amount: number;
      percentage: number;
    }[] = [];

    for (let i = 0; i < rawPrizes.length; i++) {
      if (rawPrizes[i].amount !== currentAmount) {
        // New amount found, add the previous group if any
        if (currentAmount !== -1) {
          const endRank = rawPrizes[i - 1].rank;
          const rankRange =
            startRank === endRank ? `${startRank}` : `${startRank}-${endRank}`;

          groupedPrizes.push({
            rank: rankRange,
            amount: currentAmount,
            percentage: Math.round((currentAmount / totalPrize) * 100),
          });
        }

        // Start a new group
        currentAmount = rawPrizes[i].amount;
        startRank = rawPrizes[i].rank;
      }
    }

    // Add the last group
    if (currentAmount !== -1) {
      const endRank = rawPrizes[rawPrizes.length - 1].rank;
      const rankRange =
        startRank === endRank ? `${startRank}` : `${startRank}-${endRank}`;

      groupedPrizes.push({
        rank: rankRange,
        amount: currentAmount,
        percentage: Math.round((currentAmount / totalPrize) * 100),
      });
    }

    // Return the grouped prizes
    return groupedPrizes;
  } else {
    // For smaller contests, keep individual prizes
    return rawPrizes;
  }
}
