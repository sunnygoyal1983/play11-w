import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  updateLiveMatchPlayerStats,
  fetchLiveMatchDetails,
} from '@/services/live-scoring-service';
import { updateLiveContestPoints } from '@/services/live-match-scheduler';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/matches/[id]/update-scores
 * Manually updates player scores for a live match
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const matchId = params.id;
    console.log(`Manual player score update requested for match ${matchId}`);

    // Check if match exists and is in live status
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, name: true, sportMonkId: true },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.status !== 'live') {
      console.log(
        `Match ${matchId} is not live (status: ${match.status}), updating anyway`
      );
    }

    // Get current player stats count before update
    const currentStats = await prisma.playerStatistic.findMany({
      where: { matchId },
      select: { id: true, playerId: true, points: true },
    });

    console.log(
      `Found ${currentStats.length} existing player statistics records`
    );

    // First attempt to update player stats
    console.log(
      `Attempting to update player statistics for match ${matchId}...`
    );
    let success = await updateLiveMatchPlayerStats(matchId);

    // Check if we still have no stats after the first update
    if (success) {
      const statsAfterFirstUpdate = await prisma.playerStatistic.findMany({
        where: { matchId },
        select: { id: true },
      });

      if (statsAfterFirstUpdate.length === 0) {
        console.log(
          'First update reported success but no stats were created, checking API directly...'
        );

        // Directly check API data
        const matchData = await fetchLiveMatchDetails(match.sportMonkId);

        if (!matchData) {
          console.error('No match data returned from SportMonk API');
          return NextResponse.json(
            {
              success: false,
              error: 'No match data available from the API',
              apiStatus: 'No data',
            },
            { status: 500 }
          );
        }

        console.log('API data summary:');
        console.log(`- Match status: ${matchData.status}`);
        console.log(
          `- Has lineup: ${
            matchData.lineup ? matchData.lineup.length > 0 : false
          }`
        );
        console.log(
          `- Has batting: ${
            matchData.batting ? matchData.batting.length > 0 : false
          }`
        );
        console.log(
          `- Has bowling: ${
            matchData.bowling ? matchData.bowling.length > 0 : false
          }`
        );

        // Try update one more time
        console.log('Retrying player stats update with confirmed API data...');
        success = await updateLiveMatchPlayerStats(matchId);
      }
    }

    // If first attempt failed, try once more
    if (!success) {
      console.log('Update attempt failed, retrying...');
      success = await updateLiveMatchPlayerStats(matchId);
    }

    // Check if stats were updated
    if (success) {
      // Get updated stats to verify the update
      const updatedStats = await prisma.playerStatistic.findMany({
        where: { matchId },
        select: { id: true, playerId: true, points: true },
      });

      console.log(`Now have ${updatedStats.length} player statistics records`);

      // Compare points before and after
      const pointChanges = updatedStats.map((newStat) => {
        const oldStat = currentStats.find(
          (s) => s.playerId === newStat.playerId
        );
        return {
          playerId: newStat.playerId,
          oldPoints: oldStat ? oldStat.points : 0,
          newPoints: newStat.points,
          change: oldStat ? newStat.points - oldStat.points : newStat.points,
        };
      });

      // Log point changes
      const changedPlayers = pointChanges.filter((p) => Math.abs(p.change) > 0);
      if (changedPlayers.length > 0) {
        console.log(`Points changed for ${changedPlayers.length} players:`);
        changedPlayers
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .slice(0, 5)
          .forEach((p) => {
            console.log(
              `  Player ${p.playerId}: ${p.oldPoints} → ${p.newPoints} (${
                p.change > 0 ? '+' : ''
              }${p.change.toFixed(1)})`
            );
          });
      } else {
        console.log('No point changes detected');
      }

      // Now update contest points
      console.log(
        'Player stats updated successfully, now updating contest points...'
      );
      const contestPointsUpdated = await updateLiveContestPoints(matchId);

      if (contestPointsUpdated) {
        console.log('Contest points updated successfully');
      } else {
        console.warn('Failed to update contest points');
      }

      return NextResponse.json({
        success: true,
        message: 'Player scores and contest points updated successfully',
        statsCount: updatedStats.length,
        pointChanges: changedPlayers.length > 0,
        contestPointsUpdated,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update player scores after multiple attempts',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error updating match scores for ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while updating player scores',
      },
      { status: 500 }
    );
  }
}
