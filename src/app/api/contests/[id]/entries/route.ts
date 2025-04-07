import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FantasyTeamPlayer, PlayerStatistic } from '@prisma/client';

interface ContestEntry {
  id: string;
  rank: number | null;
  winAmount: number | null;
  fantasyTeamId: string;
  userId: string;
  fantasyTeam: {
    id: string;
    name: string;
    captainId: string;
    viceCaptainId: string;
  };
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  points?: number;
}

interface PlayerStat {
  playerId: string;
  points: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestId = params.id;
    console.log(
      `[Contest Entries API] Fetching entries for contest: ${contestId}`
    );

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (userId) {
      console.log(`[Contest Entries API] Filtering by user: ${userId}`);
    }

    // Build the query based on whether we want all entries or just for a specific user
    const whereClause = userId ? { contestId, userId } : { contestId };

    // Fetch contest entries
    const entries = await prisma.contestEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        rank: true,
        winAmount: true,
        fantasyTeamId: true,
        userId: true,
        fantasyTeam: {
          select: {
            id: true,
            name: true,
            captainId: true,
            viceCaptainId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: [{ rank: 'asc' }],
    });

    console.log(
      `[Contest Entries API] Found ${entries.length} entries for contest: ${contestId}`
    );

    // Fetch player statistics to calculate points
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { matchId: true },
    });

    if (!contest) {
      console.log(`[Contest Entries API] Contest not found: ${contestId}`);
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    console.log(
      `[Contest Entries API] Contest found, match ID: ${contest.matchId}`
    );

    // Add calculated points for display purposes
    const entriesWithPoints = await Promise.all(
      entries.map(async (entry: ContestEntry) => {
        console.log(
          `[Contest Entries API] Processing entry ${entry.id} for team ${entry.fantasyTeam.name}`
        );

        try {
          // Get the team players
          const teamPlayers = await prisma.fantasyTeamPlayer.findMany({
            where: { fantasyTeamId: entry.fantasyTeamId },
            include: { player: true },
          });

          console.log(
            `[Contest Entries API] Found ${teamPlayers.length} players for team ${entry.fantasyTeam.name}`
          );

          // Get player statistics
          const playerIds = teamPlayers.map(
            (tp: FantasyTeamPlayer) => tp.playerId
          );
          console.log(
            `[Contest Entries API] Player IDs: ${playerIds.join(', ')}`
          );

          const playerStats = await prisma.playerStatistic.findMany({
            where: {
              matchId: contest.matchId,
              playerId: { in: playerIds },
            },
            select: {
              playerId: true,
              points: true,
            },
          });

          console.log(
            `[Contest Entries API] Found ${playerStats.length} player statistics records`
          );

          // Calculate total points
          let totalPoints = 0;
          const statsMap = new Map<string, PlayerStat>(
            playerStats.map((stat: PlayerStat) => [stat.playerId, stat])
          );

          for (const teamPlayer of teamPlayers) {
            const playerStat = statsMap.get(teamPlayer.playerId);
            if (playerStat) {
              let points = playerStat.points;

              // Apply captain and vice-captain multipliers
              if (teamPlayer.isCaptain) {
                points *= 2;
                console.log(
                  `[Contest Entries API] Captain ${teamPlayer.player.name}: ${points} points (2x)`
                );
              } else if (teamPlayer.isViceCaptain) {
                points *= 1.5;
                console.log(
                  `[Contest Entries API] Vice Captain ${teamPlayer.player.name}: ${points} points (1.5x)`
                );
              } else {
                console.log(
                  `[Contest Entries API] Player ${teamPlayer.player.name}: ${points} points`
                );
              }

              totalPoints += points;
            } else {
              console.log(
                `[Contest Entries API] No stats found for player ${teamPlayer.player.name} (ID: ${teamPlayer.playerId})`
              );
            }
          }

          console.log(
            `[Contest Entries API] Total points for team ${entry.fantasyTeam.name}: ${totalPoints}`
          );

          return {
            ...entry,
            points: parseFloat(totalPoints.toFixed(2)),
          };
        } catch (err) {
          console.error(
            `[Contest Entries API] Error processing entry ${entry.id}:`,
            err
          );
          // Return the entry without points calculation in case of error
          return {
            ...entry,
            points: 0,
          };
        }
      })
    );

    console.log(
      `[Contest Entries API] Processed ${entriesWithPoints.length} entries with points`
    );

    // Sort by points in descending order
    const sortedEntries = entriesWithPoints.sort(
      (a: ContestEntry, b: ContestEntry) => {
        // If ranks are assigned, sort by rank first
        if (a.rank !== null && b.rank !== null) {
          return a.rank - b.rank;
        }

        // If ranks aren't assigned or for entries with same rank, sort by points
        return (b.points || 0) - (a.points || 0);
      }
    );

    console.log(
      `[Contest Entries API] Successfully prepared response for contest ${contestId}`
    );
    return NextResponse.json(sortedEntries);
  } catch (error) {
    console.error(
      '[Contest Entries API] Error fetching contest entries:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch contest entries' },
      { status: 500 }
    );
  }
}
