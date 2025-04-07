import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;
    console.log(
      `[Contest Prizes API] Fetching prizes for contest: ${contestId}`
    );

    // Check if the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      console.log(`[Contest Prizes API] Contest not found: ${contestId}`);
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Fetch existing prize breakup
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    if (prizeBreakup.length === 0) {
      console.log(
        `[Contest Prizes API] No prize breakup found for contest: ${contestId}`
      );
      return NextResponse.json([]);
    }

    console.log(
      `[Contest Prizes API] Found ${prizeBreakup.length} prize entries for contest: ${contestId}`
    );

    // Transform the data to include percentage and group similar ranks
    const totalPrize = contest.totalPrize;

    // First pass - create initial transformed objects with percentage
    const basicTransform = prizeBreakup.map((prize) => ({
      id: prize.id,
      rank: prize.rank,
      amount: prize.prize,
      percentage: Math.round((prize.prize / totalPrize) * 100),
    }));

    // Sort prizes by rank to ensure proper grouping
    const sortedPrizes = [...basicTransform].sort((a, b) => {
      const rankA =
        typeof a.rank === 'string' ? parseInt(a.rank.split('-')[0]) : a.rank;
      const rankB =
        typeof b.rank === 'string' ? parseInt(b.rank.split('-')[0]) : b.rank;
      return rankA - rankB;
    });

    // Second pass - group by amounts and create rank ranges
    const rankedPrizes = [];
    let currentGroup = null;

    for (const prize of sortedPrizes) {
      if (
        currentGroup &&
        currentGroup.amount === prize.amount &&
        // For numeric ranks, check if they're consecutive
        ((typeof currentGroup.endRank === 'number' &&
          typeof prize.rank === 'number' &&
          currentGroup.endRank === prize.rank - 1) ||
          // For string ranks that are ranges, we don't group them
          (typeof currentGroup.rank === 'string' &&
            typeof prize.rank === 'string'))
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

    console.log(
      `[Contest Prizes API] Successfully grouped prizes into ${rankedPrizes.length} tiers`
    );
    return NextResponse.json(rankedPrizes);
  } catch (error) {
    console.error('[Contest Prizes API] Error fetching prize breakup:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prize breakup' },
      { status: 500 }
    );
  }
}
