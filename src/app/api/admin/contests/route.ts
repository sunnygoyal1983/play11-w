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

    // Validate that prize breakup covers all winners
    const totalRanks = prizeBreakup.reduce((count, item) => {
      if (typeof item.rank === 'string' && item.rank.includes('-')) {
        const [start, end] = item.rank.split('-').map(Number);
        return count + (end - start + 1);
      }
      return count + 1;
    }, 0);

    console.log(
      `Generated prize breakup with ${prizeBreakup.length} entries for ${totalRanks} ranks`
    );

    // Store the prize breakup
    await Promise.all(
      prizeBreakup.map(async (prize) => {
        // Convert the rank to string format for database storage
        const rankValue =
          typeof prize.rank === 'number' ? prize.rank.toString() : prize.rank;

        return prisma.prizeBreakup.create({
          data: {
            contestId: contest.id,
            rank: rankValue,
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

  // Validate inputs
  if (
    winnerCount <= 0 ||
    totalPrize <= 0 ||
    firstPrize <= 0 ||
    firstPrize > totalPrize
  ) {
    throw new Error('Invalid inputs for prize breakup');
  }

  let prizeBreakup = [];

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

  // Second tier: Rank 2 (around 2-5% of prize pool)
  const secondPrize = Math.floor(totalPrize * 0.03);
  prizeBreakup.push({
    rank: 2,
    amount: secondPrize,
    percentage: Math.round((secondPrize / totalPrize) * 100),
  });

  // Define tier boundaries based on total winners
  const tierBoundaries: { start: number; end: number }[] = [];

  if (winnerCount < 500) {
    // Medium-sized mega contest
    tierBoundaries.push(
      { start: 3, end: Math.min(50, winnerCount) },
      { start: 51, end: Math.min(100, winnerCount) },
      { start: 101, end: Math.min(200, winnerCount) },
      { start: 201, end: winnerCount }
    );
  } else if (winnerCount < 5000) {
    // Large mega contest
    tierBoundaries.push(
      { start: 3, end: 50 },
      { start: 51, end: 100 },
      { start: 101, end: 200 },
      { start: 201, end: 300 },
      { start: 301, end: 400 },
      { start: 401, end: 500 },
      { start: 501, end: Math.min(1000, winnerCount) },
      { start: 1001, end: winnerCount }
    );
  } else {
    // Very large mega contest (like 5000+ winners)
    tierBoundaries.push(
      { start: 3, end: 100 },
      { start: 101, end: 200 },
      { start: 201, end: 500 },
      { start: 501, end: 1000 },
      { start: 1001, end: 2000 },
      { start: 2001, end: 3000 },
      { start: 3001, end: 4000 },
      { start: 4001, end: winnerCount }
    );
  }

  // Remove tiers with no winners
  const validTiers = tierBoundaries.filter((tier) => tier.start <= winnerCount);

  // Calculate prize amounts for each tier with diminishing returns
  const prizePoolForTiers = totalPrize - firstPrize - secondPrize;
  const totalTiers = validTiers.length;

  // Calculate prize distribution with exponential decay
  for (let i = 0; i < validTiers.length; i++) {
    const tier = validTiers[i];
    // Skip invalid tiers
    if (tier.start > winnerCount) continue;
    // Adjust end rank if it exceeds winner count
    tier.end = Math.min(tier.end, winnerCount);

    const tierSize = tier.end - tier.start + 1;
    if (tierSize <= 0) continue;

    // Calculate prize amount with diminishing returns
    // Earlier tiers get larger prizes
    const tierWeight = Math.pow(0.7, i); // Exponential decay factor
    const tierPrize = Math.floor(
      ((prizePoolForTiers * tierWeight) / (totalTiers * tierWeight)) * 2
    );
    const prizePerRank = Math.floor(tierPrize / tierSize);

    // Ensure prize is reasonable
    const minPrize = 10; // Minimum prize amount
    const finalPrize = Math.max(minPrize, prizePerRank);

    prizeBreakup.push({
      rank: `${tier.start}-${tier.end}`,
      amount: finalPrize,
      percentage: Math.round(((finalPrize * tierSize) / totalPrize) * 100),
    });
  }

  // Validate if we've covered all winners
  const totalRanksCovered = prizeBreakup.reduce((count, item) => {
    if (typeof item.rank === 'string' && item.rank.includes('-')) {
      const [start, end] = item.rank.split('-').map(Number);
      return count + (end - start + 1);
    }
    return count + 1;
  }, 0);

  // If we don't have enough entries for all winners, add entries for remaining winners
  if (totalRanksCovered < winnerCount) {
    const lastEntry = prizeBreakup[prizeBreakup.length - 1];
    const smallestPrize = lastEntry.amount;

    // Find where our current prize breakup ends
    let lastRank = 0;
    prizeBreakup.forEach((item) => {
      if (typeof item.rank === 'string' && item.rank.includes('-')) {
        const end = parseInt(item.rank.split('-')[1]);
        lastRank = Math.max(lastRank, end);
      } else if (typeof item.rank === 'number') {
        lastRank = Math.max(lastRank, item.rank);
      }
    });

    // Add an entry for remaining winners
    if (lastRank < winnerCount) {
      prizeBreakup.push({
        rank: `${lastRank + 1}-${winnerCount}`,
        amount: smallestPrize,
        percentage: Math.round(
          ((smallestPrize * (winnerCount - lastRank)) / totalPrize) * 100
        ),
      });
    }
  }

  return prizeBreakup;
}
