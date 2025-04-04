import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRecentBalls } from '@/services/ball-data-service';

/**
 * API endpoint to get recent balls data for a match
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');

    // Validate match exists
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Get recent balls
    const result = await getRecentBalls(match.id, count);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error retrieving ball data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve ball data' },
      { status: 500 }
    );
  }
}
