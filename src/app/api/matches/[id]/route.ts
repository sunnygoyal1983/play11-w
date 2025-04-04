import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log(`Fetching match with ID: ${matchId}`);

    // Check if match exists in database by id
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        contests: {
          select: {
            id: true,
            name: true,
            entryFee: true,
            totalSpots: true,
            filledSpots: true,
            prizePool: true,
            totalPrize: true,
            firstPrize: true,
            winnerPercentage: true,
            isGuaranteed: true,
            winnerCount: true,
          },
        },
      },
    });

    if (!match) {
      console.error(`Match not found: ${matchId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Match not found',
        },
        { status: 404 }
      );
    }

    console.log(
      `Match found: ${match.name} with ${match.contests?.length || 0} contests`
    );
    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch match details',
      },
      { status: 500 }
    );
  }
}
