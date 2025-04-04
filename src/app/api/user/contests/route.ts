import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get all contest entries for the user
    const contestEntries = await prisma.contestEntry.findMany({
      where: { userId },
      include: {
        contest: {
          include: {
            match: {
              select: {
                id: true,
                name: true,
                teamAName: true,
                teamBName: true,
                startTime: true,
                status: true,
              },
            },
          },
        },
        fantasyTeam: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          contest: {
            match: {
              startTime: 'desc',
            },
          },
        },
      ],
    });

    // Get team points for live matches
    const enhancedEntries = await Promise.all(
      contestEntries.map(async (entry) => {
        let teamPoints = 0;

        // For live/completed matches, load points from entry or calculate
        if (
          entry.contest.match.status === 'live' ||
          entry.contest.match.status === 'completed'
        ) {
          // Get entry points directly from the contest entry (if available)
          // This comes from the updateContestEntryPoints function that runs periodically
          if (entry.points && entry.points > 0) {
            // Entry already has points, use them
            teamPoints = entry.points;
            console.log(`Entry ${entry.id} already has points: ${teamPoints}`);
          } else {
            // Calculate points manually if entry doesn't have them yet
            console.log(`Calculating points for entry ${entry.id}`);

            // Get all players in the team
            const teamPlayers = await prisma.fantasyTeamPlayer.findMany({
              where: { fantasyTeamId: entry.fantasyTeamId },
              include: {
                player: true,
              },
            });

            // Sum up points for all players
            for (const teamPlayer of teamPlayers) {
              const playerStats = await prisma.playerStatistic.findUnique({
                where: {
                  matchId_playerId: {
                    matchId: entry.contest.matchId,
                    playerId: teamPlayer.playerId,
                  },
                },
              });

              if (playerStats) {
                // Apply captain/vice-captain multiplier
                let points = playerStats.points;
                if (teamPlayer.isCaptain) {
                  points *= 2; // 2x for captain
                } else if (teamPlayer.isViceCaptain) {
                  points *= 1.5; // 1.5x for vice-captain
                }
                teamPoints += points;
              }
            }

            // Update the entry points in the database for future requests
            if (teamPoints > 0) {
              try {
                await prisma.contestEntry.update({
                  where: { id: entry.id },
                  data: { points: teamPoints },
                });
                console.log(
                  `Updated entry ${entry.id} with points: ${teamPoints}`
                );
              } catch (updateError) {
                console.error(
                  `Failed to update entry ${entry.id} points:`,
                  updateError
                );
              }
            }
          }
        }

        return {
          ...entry,
          // Keep both values for compatibility
          points: entry.points || teamPoints,
          fantasyTeam: {
            ...entry.fantasyTeam,
            points: teamPoints,
          },
        };
      })
    );

    return NextResponse.json(enhancedEntries);
  } catch (error) {
    console.error('Error fetching user contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}
