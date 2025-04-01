import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi, prisma } from '@/services/sportmonk';

// GET /api/matches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '10');

    // Different endpoints based on type
    if (type === 'live') {
      const matches = await sportmonkApi.matches.fetchLive(page, perPage);
      return NextResponse.json({
        success: true,
        data: matches,
      });
    } else if (type === 'recent') {
      const matches = await sportmonkApi.matches.fetchRecent(page, perPage);
      return NextResponse.json({
        success: true,
        data: matches,
      });
    } else if (type === 'upcoming') {
      const matches = await sportmonkApi.matches.fetchUpcoming(page, perPage);
      return NextResponse.json({
        success: true,
        data: matches,
      });
    }

    // If no type specified, get matches from database
    const matches = await prisma.match.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    return NextResponse.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch matches',
      },
      { status: 500 }
    );
  }
}

// GET /api/matches/:id
export async function getById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = parseInt(params.id);
    if (isNaN(matchId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid match ID',
        },
        { status: 400 }
      );
    }

    // First check if match exists in database
    const existingMatch = await prisma.match.findUnique({
      where: { sportMonkId: matchId.toString() },
    });

    // Fetch fresh data from API regardless
    const match = await sportmonkApi.matches.fetchDetails(matchId);
    if (!match && !existingMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Match not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: match || existingMatch,
    });
  } catch (error) {
    console.error(`Error fetching match details:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch match details',
      },
      { status: 500 }
    );
  }
}

// This is a handler map for dynamic routes
export { getById as GET_PARAM_ID };

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
      data: { isActive: false },
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
