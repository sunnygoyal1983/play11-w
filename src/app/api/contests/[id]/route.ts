import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const now = new Date();
    const matchStartTime = new Date(contest.match.startTime);
    const matchEndTime = new Date(contest.match.endTime);

    let status = 'upcoming';
    if (now >= matchStartTime && now <= matchEndTime) {
      status = 'live';
    } else if (now > matchEndTime) {
      status = 'completed';
    }

    const contestWithStatus = {
      ...contest,
      status,
      filledSpots: contest.entries.length,
      matchName: contest.match.name,
    };

    return NextResponse.json(contestWithStatus);
  } catch (error) {
    console.error('Error fetching contest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest' },
      { status: 500 }
    );
  }
}