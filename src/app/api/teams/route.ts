import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi, prisma } from '@/services/sportmonk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchTeamPlayers } from '@/services/sportmonk-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tournamentId = searchParams.get('tournament_id');

    if (tournamentId) {
      const teams = await sportmonkApi.teams.fetchByTournament(
        parseInt(tournamentId)
      );
      return NextResponse.json({
        success: true,
        data: teams,
      });
    }

    // If no tournament_id, get teams from database
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
      },
      { status: 500 }
    );
  }
}

export async function getById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid team ID',
        },
        { status: 400 }
      );
    }

    const team = await sportmonkApi.teams.fetchDetails(teamId);
    if (!team) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error(`Error fetching team details:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team details',
      },
      { status: 500 }
    );
  }
}

export async function getPlayers(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid team ID',
        },
        { status: 400 }
      );
    }

    const players = await sportmonkApi.teams.fetchPlayers(teamId);
    if (!players) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch team players',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: players,
    });
  } catch (error) {
    console.error(`Error fetching team players:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team players',
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Import teams from SportMonk API
    const data = await fetchTeamPlayers(1);
    return NextResponse.json({
      success: true,
      message: 'Teams imported successfully',
      data,
    });
  } catch (error) {
    console.error('Error importing teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import teams' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Delete the fantasy team
    await prisma.fantasyTeam.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}

// This is a handler map for dynamic routes
export { getById as GET_PARAM_ID, getPlayers as GET_PARAM_ID_PLAYERS };
