import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Endpoint to clean up and renumber ball data for a specific match
 * THIS IS FOR DEVELOPMENT/TESTING ONLY
 */
export async function GET(request: Request) {
  try {
    // Get match ID and action from query params
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('match_id');
    const action = searchParams.get('action') || 'status';

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check ball count
    const ballCount = await prisma.ballData.count({
      where: { matchId },
    });

    console.log(`Found ${ballCount} balls for match ${matchId}`);

    // Just return status if that's the requested action
    if (action === 'status') {
      return NextResponse.json({
        success: true,
        match_id: matchId,
        ball_count: ballCount,
      });
    }

    // Delete all balls for the match if requested
    if (action === 'delete_all') {
      const deleted = await prisma.ballData.deleteMany({
        where: { matchId },
      });

      return NextResponse.json({
        success: true,
        match_id: matchId,
        deleted_count: deleted.count,
      });
    }

    // Renumber all balls sequentially if requested
    if (action === 'renumber') {
      // Get all balls, sorted by timestamp
      const balls = await prisma.ballData.findMany({
        where: { matchId },
        orderBy: { timestamp: 'asc' },
      });

      let renumberedCount = 0;

      // Update each ball with a sequential number
      for (let i = 0; i < balls.length; i++) {
        const ball = balls[i];
        const newBallNumber = i + 1;
        const overNumber = Math.floor((newBallNumber - 1) / 6);
        const ballInOver = ((newBallNumber - 1) % 6) + 1; // 1-6 instead of 0-5
        const overString = `${overNumber}.${ballInOver}`;
        const over = parseFloat(overString);

        await prisma.ballData.update({
          where: { id: ball.id },
          data: {
            ballNumber: newBallNumber,
            over,
          },
        });

        renumberedCount++;
      }

      return NextResponse.json({
        success: true,
        match_id: matchId,
        renumbered_count: renumberedCount,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error cleaning ball data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clean ball data' },
      { status: 500 }
    );
  }
}
