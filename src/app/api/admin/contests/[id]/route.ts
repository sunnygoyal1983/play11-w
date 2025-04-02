import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: params.id },
      include: {
        match: true,
        entries: true,
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    return NextResponse.json(contest);
  } catch (error) {
    console.error('Error fetching contest details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      if (data[field] === undefined) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // First check if the contest exists
    const existingContest = await prisma.contest.findUnique({
      where: { id: params.id },
      include: {
        entries: true,
        match: true,
      },
    });

    if (!existingContest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Check if the contest has participants and restrict editing certain fields
    const hasParticipants = existingContest.entries.length > 0;
    const isStarted = existingContest.match.status !== 'upcoming';

    // If contest has participants or has started, restrict editing certain fields
    if (hasParticipants || isStarted) {
      // Allow editing only these fields
      const updatedContest = await prisma.contest.update({
        where: { id: params.id },
        data: {
          name: data.name,
          firstPrize: parseFloat(data.firstPrize.toString()),
          isGuaranteed: data.isGuaranteed,
        },
      });

      return NextResponse.json(updatedContest);
    }

    // If no participants, allow full editing
    const updatedContest = await prisma.contest.update({
      where: { id: params.id },
      data: {
        matchId: data.matchId,
        name: data.name,
        entryFee: parseFloat(data.entryFee.toString()),
        totalSpots: parseInt(data.totalSpots.toString()),
        prizePool: parseFloat(data.prizePool.toString()),
        totalPrize: parseFloat(data.totalPrize.toString()),
        firstPrize: parseFloat(data.firstPrize.toString()),
        winnerPercentage: parseInt(data.winnerPercentage.toString()),
        isGuaranteed: data.isGuaranteed,
        winnerCount: parseInt(data.winnerCount.toString()),
      },
    });

    return NextResponse.json(updatedContest);
  } catch (error) {
    console.error('Error updating contest:', error);
    return NextResponse.json(
      { error: 'Failed to update contest' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.contest.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      { error: 'Failed to delete contest' },
      { status: 500 }
    );
  }
}
