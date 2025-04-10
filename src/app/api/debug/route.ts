import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Extract match ID from the URL if provided
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    const showRaw = url.searchParams.get('showRaw') === 'true';

    if (matchId) {
      // Get specific match data
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          name: true,
          teamAName: true,
          teamBName: true,
          status: true,
          sportMonkId: true,
        },
      });

      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Match not found' },
          { status: 404 }
        );
      }

      // If showRaw parameter is true, include raw data from MatchSummary
      let rawData = null;
      if (showRaw) {
        const matchSummary = await prisma.matchSummary.findUnique({
          where: { matchId },
          select: { rawData: true },
        });

        if (matchSummary?.rawData) {
          // Extract just the team data for clarity
          const fullRawData = matchSummary.rawData as any;
          rawData = {
            localteam: fullRawData.localteam || null,
            visitorteam: fullRawData.visitorteam || null,
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: match,
        rawData: rawData,
      });
    } else {
      // Get recent matches
      const matches = await prisma.match.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          name: true,
          teamAName: true,
          teamBName: true,
          status: true,
        },
      });

      return NextResponse.json({ success: true, data: matches });
    }
  } catch (error) {
    console.error('Error fetching debug data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
