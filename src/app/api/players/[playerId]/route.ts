import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const playerId = parseInt(params.playerId);

    if (isNaN(playerId)) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: {
        id: playerId,
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
        credits: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { playerId: string } }
) {
  try {
    const playerId = parseInt(params.playerId);
    const data = await request.json();

    if (isNaN(playerId)) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
    }

    const player = await prisma.player.update({
      where: {
        id: playerId,
      },
      data: {
        name: data.name,
        role: data.role,
        country: data.country,
        teamName: data.teamName,
        battingStyle: data.battingStyle,
        bowlingStyle: data.bowlingStyle,
        credits: data.credits,
      },
    });

    return NextResponse.json({ player });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}