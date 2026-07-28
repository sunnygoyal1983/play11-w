import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/matches/upcoming
 * Fetches upcoming matches from the database.
 */
export async function GET(request: Request) {
  try {
    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: 'upcoming',
        startTime: { gt: new Date() }, // Fetch matches whose start time is in the future
      },
      orderBy: {
        startTime: 'asc', // Order by start time, soonest first
      },
      take: 3, // Limit to 3 matches for the homepage preview, adjust as needed
      select: {
        id: true,
        name: true,
        format: true,
        startTime: true,
        teamAName: true,
        teamBName: true,
        teamALogo: true,
        teamBLogo: true,
        contests: {
          select: {
            prizePool: true,
          },
          orderBy: {
            prizePool: 'desc', // Order by prize pool to easily get the largest
          },
        },
      },
    });

    const formattedMatches = upcomingMatches.map((match) => {
      let prizeDisplay = 'Prizes to be announced';
      if (match.contests && match.contests.length > 0) {
        // Find the contest with the largest prize pool for this match
        const largestPrizePool = match.contests.reduce(
          (max, contest) => (contest.prizePool > max ? contest.prizePool : max),
          0
        );
        if (largestPrizePool > 0) {
          prizeDisplay = `₹${(largestPrizePool / 100000).toFixed(
            0
          )} Lakhs Prize`; // Example formatting
          // Or more generically: `₹${largestPrizePool.toLocaleString()} Prize Pool`
        }
      }

      return {
        id: match.id,
        title: `${match.teamAName} vs ${match.teamBName}`,
        matchName: match.name,
        teamA: match.teamAName,
        teamB: match.teamBName,
        teamALogo: match.teamALogo,
        teamBLogo: match.teamBLogo,
        startTime: match.startTime.toISOString(),
        format: match.format,
        prize: prizeDisplay,
      };
    });

    return NextResponse.json({ success: true, data: formattedMatches });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch upcoming matches',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
