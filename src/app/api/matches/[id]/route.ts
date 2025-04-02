import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const match = await prisma.match.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        name: true,
        format: true,
        venue: true,
        startTime: true,
        status: true,
        teamAId: true,
        teamAName: true,
        teamALogo: true,
        teamBId: true,
        teamBName: true,
        teamBLogo: true,
        isActive: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updatedMatch = await prisma.match.update({
      where: {
        id: params.id,
      },
      data: {
        name: body.name,
        format: body.format,
        venue: body.venue,
        startTime: body.startTime,
        status: body.status,
        teamAName: body.teamAName,
        teamBName: body.teamBName,
      },
    });

    return NextResponse.json({ match: updatedMatch });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    );
  }
}
