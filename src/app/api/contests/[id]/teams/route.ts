import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/contests/[id]/teams
 * Fetch teams available for a user to join a contest
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Log headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', headers);

    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    console.log(
      'Session data:',
      session
        ? {
            userId: session.user?.id,
            email: session.user?.email,
            isAuth: !!session.user,
          }
        : 'No session'
    );

    if (!session?.user?.id) {
      console.log('Unauthorized request - no valid session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - no valid user session' },
        { status: 401 }
      );
    }

    // Get the contest ID from params
    const contestId = params.id;

    // Get the search params
    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      console.log('Missing matchId parameter');
      return NextResponse.json(
        { success: false, error: 'Match ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching teams for contest ${contestId} and match ${matchId}`);

    // Find the contest to verify match ID
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { matchId: true },
    });

    if (!contest) {
      console.log(`Contest not found: ${contestId}`);
      return NextResponse.json(
        { success: false, error: 'Contest not found' },
        { status: 404 }
      );
    }

    // Verify that the match ID in the query matches the contest match ID
    if (contest.matchId !== matchId) {
      console.log(
        `Match ID mismatch: contest has ${contest.matchId}, requested ${matchId}`
      );
      return NextResponse.json(
        { success: false, error: 'Match ID does not match contest match ID' },
        { status: 400 }
      );
    }

    // Fetch all teams created by the user for this match
    const teams = await prisma.fantasyTeam.findMany({
      where: {
        userId: session.user.id,
        matchId: matchId,
        isActive: true,
      },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        contestEntries: {
          where: {
            contestId: contestId,
          },
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Extra verification to ensure teams belong to the current user
    const verifiedTeams = teams.filter(
      (team) => team.user.id === session.user.id
    );

    if (teams.length !== verifiedTeams.length) {
      console.error(
        `SECURITY ISSUE: Found ${
          teams.length - verifiedTeams.length
        } teams that don't belong to user ${session.user.id}`
      );
    }

    console.log(
      `Verified ${verifiedTeams.length} teams belonging to user ${session.user.id}`
    );

    // Filter out teams that are already joined in this contest
    const availableTeams = verifiedTeams.filter(
      (team) => team.contestEntries.length === 0
    );

    console.log(`${availableTeams.length} teams available to join the contest`);

    // Clean up the team objects before returning them to remove any sensitive data
    const sanitizedTeams = availableTeams.map((team) => {
      // Create a clean copy without the user data and other sensitive information
      const { user, ...cleanTeam } = team;
      return cleanTeam;
    });

    return NextResponse.json(sanitizedTeams);
  } catch (error) {
    console.error('Error fetching teams for contest:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch teams: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}
