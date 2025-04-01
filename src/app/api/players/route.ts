import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi, prisma } from '@/services/sportmonk';

// GET /api/players
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('team_id');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');

    // If team_id is provided, fetch players for that team
    if (teamId) {
      const teamIdNumber = parseInt(teamId);
      if (isNaN(teamIdNumber)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid team ID',
          },
          { status: 400 }
        );
      }

      // Try to fetch from API
      const players = await sportmonkApi.teams.fetchPlayers(teamIdNumber);

      // If API fetch fails, get from database
      if (!players) {
        const dbPlayers = await prisma.player.findMany({
          where: {
            teamId: teamId,
            isActive: true,
          },
          orderBy: { name: 'asc' },
          take: perPage,
          skip: (page - 1) * perPage,
        });

        return NextResponse.json({
          success: true,
          data: dbPlayers,
        });
      }

      return NextResponse.json({
        success: true,
        data: players,
      });
    }

    // If no team_id, get players from database
    const players = await prisma.player.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    return NextResponse.json({
      success: true,
      data: players,
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch players',
      },
      { status: 500 }
    );
  }
}

// GET /api/players/:id
export async function getById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = parseInt(params.id);
    if (isNaN(playerId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid player ID',
        },
        { status: 400 }
      );
    }

    // First check if player exists in database
    const existingPlayer = await prisma.player.findUnique({
      where: { sportMonkId: playerId.toString() },
    });

    // Fetch fresh data from API
    const player = await sportmonkApi.players.fetchDetails(playerId);
    if (!player && !existingPlayer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Player not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: player || existingPlayer,
    });
  } catch (error) {
    console.error(`Error fetching player details:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch player details',
      },
      { status: 500 }
    );
  }
}

// This is a handler map for dynamic routes
export { getById as GET_PARAM_ID };
