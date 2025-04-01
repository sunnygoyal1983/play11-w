import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get current date and time
    const now = new Date();
    
    // Fetch upcoming matches that are active and have a future start time
    const matches = await prisma.match.findMany({
      where: {
        status: 'upcoming',
        isActive: true,
        startTime: {
          gt: now // Only include matches with start time greater than current time
        }
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        teamAName: true,
        teamBName: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Format the matches for the dropdown with date and time information
    const formattedMatches = matches.map((match) => {
      // Format the date and time
      const matchDate = match.startTime ? new Date(match.startTime) : null;
      const formattedDateTime = matchDate
        ? `${matchDate.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })} ${matchDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}`
        : 'Date TBD';

      // Create match name with date and time
      const matchName =
        match.name || `${match.teamAName} vs ${match.teamBName}`;
      const nameWithDateTime = `${matchName} - ${formattedDateTime}`;

      return {
        id: match.id,
        name: nameWithDateTime,
        startTime: match.startTime,
      };
    });

    return NextResponse.json(formattedMatches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
