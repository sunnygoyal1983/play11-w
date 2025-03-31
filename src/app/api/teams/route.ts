import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch fantasy teams with related data
    const fantasyTeams = await prisma.fantasyTeam.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        match: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        players: {
          include: {
            player: true
          }
        },
        contestEntries: true
      },
      orderBy: {
        match: {
          startTime: 'desc'
        }
      }
    });

    // Format the data for the frontend
    const formattedTeams = fantasyTeams.map(team => {
      // Find captain and vice-captain
      const captainPlayer = team.players.find(p => p.isCaptain)?.player;
      const viceCaptainPlayer = team.players.find(p => p.isViceCaptain)?.player;

      return {
        id: team.id,
        name: team.name,
        userName: team.user.name,
        userId: team.user.id,
        userEmail: team.user.email,
        matchId: team.matchId,
        matchName: team.match.name,
        captainId: captainPlayer?.id || team.captainId,
        captainName: captainPlayer?.name || 'Unknown',
        viceCaptainId: viceCaptainPlayer?.id || team.viceCaptainId,
        viceCaptainName: viceCaptainPlayer?.name || 'Unknown',
        createdAt: team.players[0]?.player.createdAt || new Date(),
        contestsJoined: team.contestEntries.length,
        points: team.totalPoints,
        rank: team.contestEntries[0]?.rank?.toString() || '-',
        status: team.match.status
      };
    });

    // Fetch all matches for the filter dropdown
    const matches = await prisma.match.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        startTime: 'desc'
      },
      where: {
        isActive: true
      }
    });

    return NextResponse.json({ teams: formattedTeams, matches });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
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
      where: { id }
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
