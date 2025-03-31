import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all teams from matches (team A and team B)
    const matches = await prisma.match.findMany({
      select: {
        id: true,
        name: true,
        teamAId: true,
        teamAName: true,
        teamALogo: true,
        teamBId: true,
        teamBName: true,
        teamBLogo: true,
        format: true,
        status: true,
        startTime: true,
        isActive: true
      },
      where: {
        isActive: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Extract teams from matches
    const teams = matches.flatMap(match => [
      {
        id: match.teamAId,
        name: match.teamAName,
        logo: match.teamALogo,
        matchId: match.id,
        matchName: match.name,
        format: match.format,
        status: match.status,
        startTime: match.startTime,
        isActive: match.isActive
      },
      {
        id: match.teamBId,
        name: match.teamBName,
        logo: match.teamBLogo,
        matchId: match.id,
        matchName: match.name,
        format: match.format,
        status: match.status,
        startTime: match.startTime,
        isActive: match.isActive
      }
    ]);

    // Get unique teams by ID
    const uniqueTeams = Array.from(
      new Map(teams.map(team => [team.id, team])).values()
    );

    return NextResponse.json({ teams: uniqueTeams });
  } catch (error) {
    console.error('Error fetching match teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch match teams' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { teamId, name, logo } = await request.json();
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Update team name and logo in all matches
    await prisma.match.updateMany({
      where: {
        OR: [
          { teamAId: teamId },
          { teamBId: teamId }
        ]
      },
      data: {
        ...(name && { 
          teamAName: {
            set: prisma.match.findFirst({
              where: { teamAId: teamId }
            }).then(match => match ? name : undefined)
          },
          teamBName: {
            set: prisma.match.findFirst({
              where: { teamBId: teamId }
            }).then(match => match ? name : undefined)
          }
        }),
        ...(logo && {
          teamALogo: {
            set: prisma.match.findFirst({
              where: { teamAId: teamId }
            }).then(match => match ? logo : undefined)
          },
          teamBLogo: {
            set: prisma.match.findFirst({
              where: { teamBId: teamId }
            }).then(match => match ? logo : undefined)
          }
        })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}
