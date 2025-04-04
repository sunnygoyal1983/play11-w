import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/matches
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '10');
    const isAdmin = searchParams.get('admin') === 'true';

    // Base query params for database fetch
    let whereClause: any = { isActive: true };
    const orderByClause = { startTime: 'desc' as Prisma.SortOrder };

    // Apply filters based on match type
    if (type === 'live') {
      whereClause.status = 'live';
    } else if (type === 'recent' || type === 'completed') {
      whereClause.status = 'completed';
    } else if (type === 'upcoming') {
      whereClause.status = 'upcoming';
    }

    // If admin view, fetch all matches without pagination
    if (isAdmin) {
      console.log('Admin view: Fetching all matches without pagination');
      const matches = await prisma.match.findMany({
        where: whereClause,
        orderBy: orderByClause,
        // No take or skip for admin view to fetch all matches
      });

      console.log(`Retrieved ${matches.length} total matches for admin view`);
      return NextResponse.json({
        success: true,
        data: matches,
      });
    }

    // Non-admin view with pagination
    const matches = await prisma.match.findMany({
      where: whereClause,
      orderBy:
        type === 'upcoming'
          ? { startTime: 'asc' as Prisma.SortOrder }
          : orderByClause,
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
    // Check if match exists in database by id
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        contests: {
          select: {
            id: true,
            name: true,
            entryFee: true,
            totalSpots: true,
            filledSpots: true,
            prizePool: true,
            totalPrize: true,
            firstPrize: true,
            winnerPercentage: true,
            isGuaranteed: true,
            winnerCount: true,
          },
        },
      },
    });

    if (!match) {
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
      data: match,
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
