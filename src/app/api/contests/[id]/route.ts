import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

const prismaClient = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;

    // Fetch contest with all relevant data
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        match: true,
        entries: {
          select: {
            id: true,
            rank: true,
            fantasyTeamId: true,
            fantasyTeam: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return new NextResponse(JSON.stringify({ error: 'Contest not found' }), {
        status: 404,
      });
    }

    // Add the filled spots to the response
    const filledSpots = contest.entries.length;

    // Format the response
    return NextResponse.json({
      ...contest,
      filledSpots,
    });
  } catch (error) {
    console.error('Error fetching contest:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch contest details' }),
      { status: 500 }
    );
  }
}
