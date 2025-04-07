import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const prismaClient = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;
    console.log(`[Contest API] Fetching contest with ID: ${contestId}`);

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
      console.log(`[Contest API] Contest not found with ID: ${contestId}`);
      return new NextResponse(JSON.stringify({ error: 'Contest not found' }), {
        status: 404,
      });
    }

    console.log(`[Contest API] Successfully fetched contest: ${contest.name}`);
    console.log(`[Contest API] Contest details:`, {
      id: contest.id,
      name: contest.name,
      matchId: contest.matchId,
      entryFee: contest.entryFee,
      totalSpots: contest.totalSpots,
      entriesCount: contest.entries.length,
    });

    // Add the filled spots to the response
    const filledSpots = contest.entries.length;

    // Format the response
    const response = {
      ...contest,
      filledSpots,
    };

    console.log(
      `[Contest API] Sending response with ${filledSpots} filled spots`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Contest API] Error fetching contest:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch contest details',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
