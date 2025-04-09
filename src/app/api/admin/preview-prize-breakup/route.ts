import { NextRequest, NextResponse } from 'next/server';
import { generatePrizeBreakup } from '@/utils/prize-generation';

/**
 * POST - Preview prize breakup without saving to database
 * This endpoint is used by the contest creation form to show a live preview
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Preview prize breakup request:', data);

    // Validate required fields
    const requiredFields = [
      'totalPrize',
      'winnerCount',
      'firstPrize',
      'entryFee',
    ];

    for (const field of requiredFields) {
      if (data[field] === undefined) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Parse numeric values
    const contestParams = {
      totalPrize: parseFloat(data.totalPrize.toString()),
      winnerCount: parseInt(data.winnerCount.toString()),
      firstPrize: parseFloat(data.firstPrize.toString()),
      entryFee: parseFloat(data.entryFee.toString()),
      prizeStructure: data.prizeStructure || 'balanced',
    };

    console.log('Parsed contest params:', contestParams);

    // Validate inputs
    if (contestParams.totalPrize <= 0) {
      return NextResponse.json(
        { error: 'Total prize must be greater than 0' },
        { status: 400 }
      );
    }

    if (contestParams.winnerCount <= 0) {
      return NextResponse.json(
        { error: 'Winner count must be greater than 0' },
        { status: 400 }
      );
    }

    if (contestParams.firstPrize <= 0) {
      return NextResponse.json(
        { error: 'First prize must be greater than 0' },
        { status: 400 }
      );
    }

    if (contestParams.firstPrize > contestParams.totalPrize) {
      return NextResponse.json(
        { error: 'First prize cannot exceed total prize' },
        { status: 400 }
      );
    }

    // Generate prize breakup
    const prizeBreakup = generatePrizeBreakup(contestParams);
    console.log('Generated prize breakup:', prizeBreakup);

    // Verify the prize breakup by calculating total distribution
    let totalPrizeDistribution = 0;
    let totalWinnersCovered = 0;

    for (const prize of prizeBreakup) {
      if (typeof prize.rank === 'number') {
        totalPrizeDistribution += prize.amount;
        totalWinnersCovered += 1;
      } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
        const parts = prize.rank.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0]);
          const end = parseInt(parts[1]);
          const count = end - start + 1;
          totalPrizeDistribution += prize.amount * count;
          totalWinnersCovered += count;
        }
      }
    }

    // Check for discrepancies
    const prizeDiscrepancy = Math.abs(
      totalPrizeDistribution - contestParams.totalPrize
    );
    const hasDiscrepancy = prizeDiscrepancy > 5; // Allow for small rounding differences

    const winnerCountDiscrepancy = Math.abs(
      totalWinnersCovered - contestParams.winnerCount
    );
    const hasWinnerCountDiscrepancy = winnerCountDiscrepancy > 0;

    const response = {
      prizeBreakup,
      meta: {
        totalPrizeDistribution,
        totalWinnersCovered,
        prizeDiscrepancy,
        hasDiscrepancy,
        winnerCountDiscrepancy,
        hasWinnerCountDiscrepancy,
      },
    };

    console.log('Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating prize breakup preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate prize breakup' },
      { status: 500 }
    );
  }
}
