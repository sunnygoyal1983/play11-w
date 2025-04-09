import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generatePrizeBreakup } from '@/utils/prize-generation';
import {
  MAX_WINNER_COUNT,
  MAX_TOTAL_SPOTS,
  validateContestForm,
  ContestFormData,
} from '@/utils/contest-validation';

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

    // Validate required fields using our validation utility
    const validationErrors = validateContestForm(data as ContestFormData);
    const criticalErrors = validationErrors.filter(
      (error) => error.severity === 'error'
    );

    if (criticalErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Validation failed: ${criticalErrors[0].message}`,
          errors: criticalErrors,
        },
        { status: 400 }
      );
    }

    // Additional server-side validations
    if (data.winnerCount > MAX_WINNER_COUNT) {
      return NextResponse.json(
        { error: `Winner count cannot exceed ${MAX_WINNER_COUNT}` },
        { status: 400 }
      );
    }

    if (data.totalSpots > MAX_TOTAL_SPOTS) {
      return NextResponse.json(
        { error: `Total spots cannot exceed ${MAX_TOTAL_SPOTS}` },
        { status: 400 }
      );
    }

    // Create the contest
    const contest = await prisma.contest.create({
      data: {
        matchId: data.matchId,
        name: data.name,
        entryFee: parseFloat(data.entryFee.toString()),
        totalSpots: parseInt(data.totalSpots.toString()),
        filledSpots: 0,
        prizePool: parseFloat(data.prizePool.toString()),
        totalPrize: parseFloat(data.totalPrize.toString()),
        firstPrize: parseFloat(data.firstPrize.toString()),
        winnerPercentage: parseInt(data.winnerPercentage.toString()),
        isGuaranteed: data.isGuaranteed || false,
        winnerCount: parseInt(data.winnerCount.toString()),
        isActive: true,
      },
    });

    // Generate prize breakup using our utility
    const prizeBreakup = generatePrizeBreakup({
      totalPrize: contest.totalPrize,
      winnerCount: contest.winnerCount,
      firstPrize: contest.firstPrize,
      entryFee: contest.entryFee,
      prizeStructure: data.prizeStructure || 'balanced',
    });

    // Validate that prize breakup covers all winners
    let totalRanks = 0;
    let totalPrizeAmount = 0;

    for (const prize of prizeBreakup) {
      if (typeof prize.rank === 'number') {
        totalRanks += 1;
        totalPrizeAmount += prize.amount;
      } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
        const [start, end] = prize.rank.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          totalRanks += end - start + 1;
          totalPrizeAmount += prize.amount * (end - start + 1);
        }
      }
    }

    // Check if prize breakup is valid
    if (totalRanks < contest.winnerCount) {
      console.warn(
        `Prize breakup only covers ${totalRanks} ranks, but contest has ${contest.winnerCount} winners`
      );
    }

    // Check if total prize amount matches
    const prizeDiscrepancy = Math.abs(totalPrizeAmount - contest.totalPrize);
    if (prizeDiscrepancy > 5) {
      // Allow small rounding differences
      console.warn(
        `Prize amount discrepancy: ${prizeDiscrepancy}. Generated: ${totalPrizeAmount}, Expected: ${contest.totalPrize}`
      );
    }

    console.log(
      `Generated prize breakup with ${prizeBreakup.length} entries covering ${totalRanks} ranks`
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

    return NextResponse.json(
      {
        ...contest,
        prizeBreakupSummary: {
          tiers: prizeBreakup.length,
          ranksCount: totalRanks,
          totalAmount: totalPrizeAmount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { error: 'Failed to create contest' },
      { status: 500 }
    );
  }
}
