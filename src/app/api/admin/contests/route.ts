import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        match: true,
        participants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const contestsWithStatus = contests.map(contest => {
      const now = new Date();
      const matchStartTime = new Date(contest.match.startTime);
      const matchEndTime = new Date(contest.match.endTime);
      
      let status = 'upcoming';
      if (now >= matchStartTime && now <= matchEndTime) {
        status = 'live';
      } else if (now > matchEndTime) {
        status = 'completed';
      }

      return {
        ...contest,
        status,
        filledSpots: contest.participants.length,
        matchName: contest.match.name
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
      'winnerCount'
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
    
    return NextResponse.json(contest, { status: 201 });
  } catch (error) {
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { error: 'Failed to create contest' },
      { status: 500 }
    );
  }
}