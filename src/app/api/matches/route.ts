import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: {
        startTime: 'desc'
      },
      select: {
        id: true,
        name: true,
        format: true,
        venue: true,
        startTime: true,
        status: true,
        teamAName: true,
        teamBName: true,
        isActive: true,
        contests: {
          select: {
            id: true
          }
        }
      },
      where: {
        isActive: true
      }
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    await prisma.match.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    );
  }
}
