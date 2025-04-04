import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log(`Fetching commentary for match: ${matchId}`);

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        name: true,
        status: true,
        teamAName: true,
        teamBName: true,
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

    // For now, return mock commentary data
    // In a real implementation, you would fetch this from a sports API
    const mockCommentary = [
      {
        id: '1',
        matchId,
        timestamp: new Date(Date.now() - 60000 * 15).toISOString(),
        over: '19.5',
        text: `${match.teamAName} needs 6 runs from 1 ball. Pressure on the bowler!`,
        isWicket: false,
        isBoundary: false,
      },
      {
        id: '2',
        matchId,
        timestamp: new Date(Date.now() - 60000 * 10).toISOString(),
        over: '19.6',
        text: `INCREDIBLE! Dhoni finishes it off with a massive six! ${match.teamAName} wins by 5 wickets!`,
        isWicket: false,
        isBoundary: true,
        runs: 6,
      },
      {
        id: '3',
        matchId,
        timestamp: new Date(Date.now() - 60000 * 20).toISOString(),
        over: '19.4',
        text: `WICKET! Crucial breakthrough as the batsman is caught at deep midwicket.`,
        isWicket: true,
        isBoundary: false,
      },
      {
        id: '4',
        matchId,
        timestamp: new Date(Date.now() - 60000 * 25).toISOString(),
        over: '19.3',
        text: `FOUR! Beautifully timed through the covers.`,
        isWicket: false,
        isBoundary: true,
        runs: 4,
      },
      {
        id: '5',
        matchId,
        timestamp: new Date(Date.now() - 60000 * 30).toISOString(),
        over: '19.2',
        text: `Dot ball! Excellent yorker that the batsman could only dig out.`,
        isWicket: false,
        isBoundary: false,
        runs: 0,
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockCommentary,
    });
  } catch (error) {
    console.error('Error fetching match commentary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch match commentary',
      },
      { status: 500 }
    );
  }
}
