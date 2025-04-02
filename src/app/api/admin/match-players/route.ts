import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/sportmonk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Find match first to get team names
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        name: true,
        teamAId: true,
        teamAName: true,
        teamBId: true,
        teamBName: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Get all players for this match with their details
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            image: true,
            country: true,
            teamId: true,
            teamName: true,
            role: true,
            battingStyle: true,
            bowlingStyle: true,
          },
        },
      },
    });

    // Group players by team
    const teamAPlayers = matchPlayers.filter(
      (mp) => mp.teamId === match.teamAId
    );
    const teamBPlayers = matchPlayers.filter(
      (mp) => mp.teamId === match.teamBId
    );
    const otherPlayers = matchPlayers.filter(
      (mp) => mp.teamId !== match.teamAId && mp.teamId !== match.teamBId
    );

    return NextResponse.json({
      match: {
        id: match.id,
        name: match.name,
        teamA: {
          id: match.teamAId,
          name: match.teamAName,
        },
        teamB: {
          id: match.teamBId,
          name: match.teamBName,
        },
      },
      teamAPlayers,
      teamBPlayers,
      otherPlayers,
      totalPlayers: matchPlayers.length,
    });
  } catch (error) {
    console.error('Error fetching match players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match players' },
      { status: 500 }
    );
  }
}
