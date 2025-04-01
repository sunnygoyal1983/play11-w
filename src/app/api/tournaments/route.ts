import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi } from '@/services/sportmonk';

// GET /api/tournaments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    const tournaments = await sportmonkApi.tournaments.fetchAll(page, perPage);

    return NextResponse.json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournaments',
      },
      { status: 500 }
    );
  }
}

// GET /api/tournaments/:id
export async function getById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = parseInt(params.id);
    if (isNaN(tournamentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tournament ID',
        },
        { status: 400 }
      );
    }

    const tournament = await sportmonkApi.tournaments.fetchDetails(
      tournamentId
    );
    if (!tournament) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tournament not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    console.error(`Error fetching tournament details:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournament details',
      },
      { status: 500 }
    );
  }
}

// GET /api/tournaments/:id/matches
export async function getMatches(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = parseInt(params.id);
    if (isNaN(tournamentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tournament ID',
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    const matches = await sportmonkApi.tournaments.fetchMatches(
      tournamentId,
      page,
      perPage
    );
    if (!matches) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch tournament matches',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error(`Error fetching tournament matches:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tournament matches',
      },
      { status: 500 }
    );
  }
}

// This is a handler map for dynamic routes
export { getById as GET_PARAM_ID, getMatches as GET_PARAM_ID_MATCHES };
