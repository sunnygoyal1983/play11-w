import { NextResponse } from 'next/server';
import { prisma } from '@/services/sportmonk';

export async function GET() {
  try {
    // Get current date
    const currentDate = new Date();

    // Find all matches with startTime in the past but status still 'upcoming'
    const incorrectMatches = await prisma.match.findMany({
      where: {
        startTime: { lt: currentDate },
        status: 'upcoming',
      },
      select: {
        id: true,
        sportMonkId: true,
        name: true,
        startTime: true,
        status: true,
      },
    });

    console.log(
      `Found ${incorrectMatches.length} matches with incorrect status`
    );

    // Update these matches to have status 'completed'
    const updateResults = [];

    for (const match of incorrectMatches) {
      try {
        const updated = await prisma.match.update({
          where: { id: match.id },
          data: {
            status: 'completed',
            endTime: currentDate,
          },
        });

        updateResults.push({
          id: match.id,
          name: match.name,
          startTime: match.startTime,
          statusBefore: match.status,
          statusAfter: 'completed',
          success: true,
        });
      } catch (error) {
        console.error(`Error updating match ${match.id}:`, error);
        updateResults.push({
          id: match.id,
          name: match.name,
          startTime: match.startTime,
          statusBefore: match.status,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    // Also fix any matches with future dates showing as completed
    const futureCompletedMatches = await prisma.match.findMany({
      where: {
        startTime: { gt: currentDate },
        status: 'completed',
      },
      select: {
        id: true,
        sportMonkId: true,
        name: true,
        startTime: true,
        status: true,
      },
    });

    console.log(
      `Found ${futureCompletedMatches.length} future matches with completed status`
    );

    for (const match of futureCompletedMatches) {
      try {
        const updated = await prisma.match.update({
          where: { id: match.id },
          data: {
            status: 'upcoming',
            endTime: null,
          },
        });

        updateResults.push({
          id: match.id,
          name: match.name,
          startTime: match.startTime,
          statusBefore: match.status,
          statusAfter: 'upcoming',
          success: true,
        });
      } catch (error) {
        console.error(`Error updating match ${match.id}:`, error);
        updateResults.push({
          id: match.id,
          name: match.name,
          startTime: match.startTime,
          statusBefore: match.status,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    // Check specific match if ID is provided (like 60688)
    const specificMatch = await prisma.match.findFirst({
      where: { sportMonkId: '60688' },
      select: {
        id: true,
        sportMonkId: true,
        name: true,
        startTime: true,
        status: true,
        endTime: true,
      },
    });

    return NextResponse.json({
      success: true,
      matchesUpdated: updateResults.length,
      updates: updateResults,
      specificMatch,
      message: `Successfully updated ${
        updateResults.filter((r) => r.success).length
      } matches`,
    });
  } catch (error) {
    console.error('Error fixing match statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix match statuses',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
