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

  // Add first prize
  prizeBreakup.push({
    rank: 1,
    amount: firstPrize,
    percentage: Math.round((firstPrize / totalPrize) * 100),
  });

  // Calculate remaining prize pool
  let remainingPrize = totalPrize - firstPrize;

  // Determine distribution curve based on winner count
  let distributionRatios: number[];

  if (winnerCount <= 3) {
    // Small contest - simple distribution
    distributionRatios = [0.6, 0.3, 0.1]; // 60/30/10 split for 1st/2nd/3rd
  } else if (winnerCount <= 10) {
    // Medium contest - steeper decay
    distributionRatios = [
      0.35, 0.25, 0.15, 0.1, 0.05, 0.03, 0.03, 0.02, 0.01, 0.01,
    ];
  } else {
    // Large contest - gradual decay
    // Create an exponential decay distribution
    distributionRatios = [];
    let totalRatio = 0;
    for (let i = 2; i <= winnerCount; i++) {
      // Exponential decay formula: base * Math.exp(-decay * (i-2))
      const ratio = 0.5 * Math.exp(-0.3 * (i - 2));
      distributionRatios.push(ratio);
      totalRatio += ratio;
    }

    // Normalize ratios to sum to 1
    distributionRatios = distributionRatios.map((r) => r / totalRatio);
  }

  // Calculate prize amounts for remaining ranks
  for (let i = 2; i <= winnerCount; i++) {
    if (i - 2 < distributionRatios.length) {
      // Use the distribution ratio for this rank
      const rankPrize = Math.floor(remainingPrize * distributionRatios[i - 2]);
      const percentage = Math.round((rankPrize / totalPrize) * 100);

      prizeBreakup.push({
        rank: i,
        amount: rankPrize,
        percentage,
      });
    } else {
      // Equal distribution for any remaining ranks
      const rankPrize = Math.floor(remainingPrize / (winnerCount - i + 1));
      const percentage = Math.round((rankPrize / totalPrize) * 100);

      prizeBreakup.push({
        rank: i,
        amount: rankPrize,
        percentage,
      });
    }
  }

  return prizeBreakup;
}
