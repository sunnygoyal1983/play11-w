import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        match: true,
        entries: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('Contests', contests);

    const contestsWithStatus = contests.map((contest) => {
      const now = new Date();
      const matchStartTime = new Date(contest.match.startTime);
      const matchEndTime = contest.match.endTime
        ? new Date(contest.match.endTime)
        : null;

      let status = 'upcoming';
      if (now >= matchStartTime && matchEndTime && now <= matchEndTime) {
        status = 'live';
      } else if (matchEndTime && now > matchEndTime) {
        status = 'completed';
      }

      return {
        ...contest,
        status,
        filledSpots: contest.entries.length,
        matchName: contest.match.name,
      };
    });

    return NextResponse.json(contestsWithStatus);
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      'matchId',
      'name',
      'entryFee',
      'totalSpots',
      'prizePool',
      'totalPrize',
      'firstPrize',
      'winnerPercentage',
      'winnerCount',
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create the contest
    const contest = await prisma.contest.create({
      data: {
        matchId: data.matchId,
        name: data.name,
        entryFee: parseFloat(data.entryFee),
        totalSpots: parseInt(data.totalSpots),
        filledSpots: 0,
        prizePool: parseFloat(data.prizePool),
        totalPrize: parseFloat(data.totalPrize),
        firstPrize: parseFloat(data.firstPrize),
        winnerPercentage: parseInt(data.winnerPercentage),
        isGuaranteed: data.isGuaranteed || false,
        winnerCount: parseInt(data.winnerCount),
        isActive: true,
      },
    });

    // Generate prize breakup
    const prizeBreakup = generatePrizeBreakup(contest);

    // Store the prize breakup
    await Promise.all(
      prizeBreakup.map(async (prize) => {
        return prisma.prizeBreakup.create({
          data: {
            contestId: contest.id,
            rank: prize.rank,
            prize: prize.amount,
          },
        });
      })
    );

    return NextResponse.json(contest, { status: 201 });
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { error: 'Failed to create contest' },
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
