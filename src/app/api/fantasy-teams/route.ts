import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Create a new fantasy team
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Please sign in to create a team',
        },
        { status: 401 }
      );
    }

    // Get user ID from session
    const userId = session.user.id;

    // Get request body
    const data = await request.json();
    const { name, matchId, captainId, viceCaptainId, players } = data;

    // Validate input
    if (
      !name ||
      !matchId ||
      !captainId ||
      !viceCaptainId ||
      !players ||
      !players.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error: Missing required fields',
          requiredFields: {
            name,
            matchId,
            captainId,
            viceCaptainId,
            playersCount: players?.length,
          },
        },
        { status: 400 }
      );
    }

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if match has already started
    const now = new Date();
    const matchStartTime = new Date(match.startTime);
    if (now >= matchStartTime) {
      return NextResponse.json(
        { success: false, error: 'Cannot create team after match has started' },
        { status: 400 }
      );
    }

    // Execute database operations in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create the fantasy team
      const fantasyTeam = await tx.fantasyTeam.create({
        data: {
          name,
          matchId,
          userId,
          captainId,
          viceCaptainId,
          isActive: true,
        },
      });

      // Create team players
      for (const player of players) {
        await tx.fantasyTeamPlayer.create({
          data: {
            fantasyTeamId: fantasyTeam.id,
            playerId: player.playerId,
            isCaptain: player.playerId === captainId,
            isViceCaptain: player.playerId === viceCaptainId,
          },
        });
      }

      return fantasyTeam;
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Team created successfully',
      data: team,
    });
  } catch (error) {
    console.error('Error creating fantasy team:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create team',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
