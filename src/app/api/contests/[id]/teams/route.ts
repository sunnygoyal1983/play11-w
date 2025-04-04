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

    // TEMPORARY FIX: Get ALL teams for this match first to debug
    const allTeams = await prisma.fantasyTeam.findMany({
      where: {
        matchId: matchId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    console.log(`Total teams for match ${matchId}: ${allTeams.length}`);
    console.log(
      `Teams by user: ${JSON.stringify(
        allTeams.filter((t) => t.userId === session.user.id).map((t) => t.name)
      )}`
    );

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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${teams.length} teams for user ${session.user.id}`);

    // Return ALL teams for now for debugging
    return NextResponse.json(teams);

    /* Commented out for debugging
    // Filter out teams that are already joined in this contest
    const availableTeams = teams.filter(team => team.contestEntries.length === 0);

    console.log(`${availableTeams.length} teams available to join the contest`);

    return NextResponse.json(availableTeams);
    */
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
