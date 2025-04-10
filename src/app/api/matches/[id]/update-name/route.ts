import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLiveMatchData } from '@/services/ball-data-service';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Manually updating match name for match: ${params.id}`);

    // Get match from our database
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
        status: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // Get live match data to get team names
    const liveDataResult = await getLiveMatchData(match.id);
    console.log('Live data fetch result:', liveDataResult.success);

    // If we have live data with team names, use those
    if (liveDataResult?.success && liveDataResult.data) {
      const teamAName = liveDataResult.data.teamAName || match.teamAName;
      const teamBName = liveDataResult.data.teamBName || match.teamBName;

      console.log(`Team A Name: ${teamAName}`);
      console.log(`Team B Name: ${teamBName}`);

      // Skip generic names
      if (teamAName === 'Team A' && teamBName === 'Team B') {
        return NextResponse.json({
          success: false,
          error: 'Cannot update with generic team names',
          currentData: {
            name: match.name,
            teamAName,
            teamBName,
          },
        });
      }

      // Update match name
      const newName = `${teamAName} vs ${teamBName}`;
      console.log(`Updating match name from "${match.name}" to "${newName}"`);

      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: { name: newName },
        select: {
          id: true,
          name: true,
          teamAName: true,
          teamBName: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Match name updated successfully',
        data: updatedMatch,
      });
    } else {
      // Use match.teamAName and match.teamBName if they're not generic
      if (
        match.teamAName &&
        match.teamBName &&
        (match.teamAName !== 'Team A' || match.teamBName !== 'Team B')
      ) {
        const newName = `${match.teamAName} vs ${match.teamBName}`;
        console.log(
          `Using database team names: ${match.teamAName} vs ${match.teamBName}`
        );

        const updatedMatch = await prisma.match.update({
          where: { id: match.id },
          data: { name: newName },
          select: {
            id: true,
            name: true,
            teamAName: true,
            teamBName: true,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Match name updated using database team names',
          data: updatedMatch,
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No valid team names found to update match name',
        currentData: {
          name: match.name,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
        },
      });
    }
  } catch (error) {
    console.error('Error updating match name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match name' },
      { status: 500 }
    );
  }
}
