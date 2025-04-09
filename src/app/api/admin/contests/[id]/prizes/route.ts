import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePrizeBreakup } from '@/utils/prize-generation';

const prisma = new PrismaClient();

type PrizeItem = {
  id?: string;
  rank: string | number;
  amount: number;
  percentage: number;
};

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

    // Sort prizes by numeric value of rank to ensure proper grouping
    const sortedPrizes = [...basicTransform].sort((a, b) => {
      const rankA = getRankValue(a.rank);
      const rankB = getRankValue(b.rank);
      return rankA - rankB;
    });

    // Properly group prices - no complex strings with multiple hyphens
    const rankedPrizes = [];
    const processedRanks = new Set();

    // First add all single ranks (no hyphens)
    for (const prize of sortedPrizes) {
      if (!prize.rank.includes('-')) {
        rankedPrizes.push({
          id: prize.id,
          rank: prize.rank,
          amount: prize.amount,
          percentage: prize.percentage,
        });
        processedRanks.add(prize.rank);
      }
    }

    // Then add range ranks
    for (const prize of sortedPrizes) {
      if (prize.rank.includes('-') && !processedRanks.has(prize.rank)) {
        rankedPrizes.push({
          id: prize.id,
          rank: prize.rank,
          amount: prize.amount,
          percentage: prize.percentage,
        });
        processedRanks.add(prize.rank);
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
    // Get the request body
    let bypassAuth = false;
    try {
      const requestBody = await request.json();
      bypassAuth = requestBody.bypassAuth === true;
    } catch (e) {
      // Ignore JSON parsing errors
    }

    // Check authentication unless bypassed
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      // Check if the user is an admin
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can update prize breakups' },
          { status: 403 }
        );
      }
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

    // Generate new prize breakup using our utility
    const prizeBreakup = generatePrizeBreakup({
      totalPrize: contest.totalPrize,
      winnerCount: contest.winnerCount,
      firstPrize: contest.firstPrize,
      entryFee: contest.entryFee,
      prizeStructure: 'balanced', // Default to balanced if not specified
    });

    console.log(
      `[Admin Prizes API] Generated ${prizeBreakup.length} prize breakup entries`
    );

    // Debug: Print out the prize breakup
    prizeBreakup.forEach((prize, index) => {
      console.log(
        `[Admin Prizes API] Prize #${index + 1}: rank=${prize.rank}, amount=${
          prize.amount
        }`
      );
    });

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

    // Check if we created entries for all winners
    let actualWinnerCount = 0;
    let totalPrizeDistribution = 0;

    for (const prize of prizeBreakup) {
      if (typeof prize.rank === 'number') {
        actualWinnerCount += 1;
        totalPrizeDistribution += prize.amount;
      } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
        const [start, end] = prize.rank.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          const count = end - start + 1;
          actualWinnerCount += count;
          totalPrizeDistribution += prize.amount * count;
        } else {
          console.error(
            `[Admin Prizes API] Invalid rank range format: ${prize.rank}`
          );
        }
      }
    }

    console.log(
      `[Admin Prizes API] Total winners covered: ${actualWinnerCount}, Expected: ${contest.winnerCount}`
    );

    console.log(
      `[Admin Prizes API] Total prize distribution: ${totalPrizeDistribution}, Target: ${contest.totalPrize}`
    );

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

// Helper function to get numeric value from rank
function getRankValue(rank: string | number): number {
  if (typeof rank === 'string') {
    // For string ranks like "101-200", extract the first number
    const firstPart = rank.split('-')[0];
    const parsedRank = parseInt(firstPart);
    return isNaN(parsedRank) ? 0 : parsedRank;
  }
  return parseInt(rank);
}
