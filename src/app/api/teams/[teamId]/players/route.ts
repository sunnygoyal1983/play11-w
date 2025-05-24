import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  try {
    const teamId = parseInt(params.teamId);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    // First check if the team exists
    const team = await prisma.player.findMany({
      where: {
        teamId: teamId.toString(),
        isActive: true
      },
      select: {
        id: true,
        name: true,
        role: true,
        image: true,
        imageUrl: true,
        country: true,
        teamName: true,
        battingStyle: true,
        bowlingStyle: true,
        credits: true
      },
    });

    if (!team || team.length === 0) {
      return NextResponse.json({ players: [] });
    }

    return NextResponse.json({ players: team });
  } catch (error) {
    console.error('Error fetching team players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team players' },
      { status: 500 }
    );
  }
}