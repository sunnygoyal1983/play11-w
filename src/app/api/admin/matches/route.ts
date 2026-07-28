import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all matches with their contest counts
    const matches = await prisma.match.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        teamAName: true,
        teamBName: true,
        venue: true,
        format: true,
        status: true,
        _count: {
          select: {
            contests: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Format the matches for the admin page
    const formattedMatches = matches.map((match) => ({
      id: match.id,
      name: match.name || `${match.teamAName} vs ${match.teamBName}`,
      venue: match.venue || 'TBD',
      format: match.format || 'T20',
      status: match.status,
      startTime: match.startTime,
      contestCount: match._count.contests,
    }));

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
