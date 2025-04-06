import { NextRequest, NextResponse } from 'next/server';
import { prisma, sportmonkApi } from '@/services/sportmonk';
import { createMatch } from '@/services/sportmonk/matches';

// Define schedule intervals (in milliseconds)
const INTERVALS = {
  LIVE_MATCHES: 10 * 60 * 1000, // 10 minutes
  UPCOMING_MATCHES: 60 * 60 * 1000, // 1 hour
  TEAM_PLAYERS: 24 * 60 * 60 * 1000, // 24 hours
};

// Helper to get a timestamp from minutes ago
const getTimeAgo = (minutes: number): Date => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
};

// Check if a match needs player data
const matchNeedsPlayers = async (matchId: string): Promise<boolean> => {
  const playerCount = await prisma.matchPlayer.count({
    where: { matchId },
  });
  return playerCount < 11; // Assuming we need at least 11 players per match
};

/**
 * Main scheduler function that runs our data import tasks
 */
export async function GET(request: NextRequest) {
  try {
    const tasks = [];
    const results: Record<string, any> = {};

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const taskParam = searchParams.get('task');
    const forceParam = searchParams.get('force') === 'true';

    // 1. Import live matches (always, unless specific task requested)
    if (!taskParam || taskParam === 'live') {
      try {
        console.log('Running task: Import live matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_live_matches_update' },
        });

        const runImport =
          forceParam ||
          !lastUpdate ||
          new Date(lastUpdate.value) < getTimeAgo(10);

        if (runImport) {
          // Fetch latest live matches
          const liveMatches = await sportmonkApi.matches.fetchLive(1, 25);

          // Process each match
          if (
            liveMatches &&
            liveMatches.data &&
            Array.isArray(liveMatches.data)
          ) {
            results.liveMatches = {
              count: liveMatches.data.length,
              processed: [],
            };

            for (const match of liveMatches.data) {
              try {
                // Create basic match record
                const dbMatch = await createMatch(match);

                // Fetch detailed match data with lineups
                await sportmonkApi.matches.fetchDetails(parseInt(match.id));

                results.liveMatches.processed.push({
                  id: match.id,
                  name:
                    match.name ||
                    `${match.localteam?.name} vs ${match.visitorteam?.name}`,
                  status: 'success',
                });
              } catch (error) {
                console.error(
                  `Error processing live match ${match.id}:`,
                  error
                );
                results.liveMatches.processed.push({
                  id: match.id,
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }

          // Update last run timestamp
          await prisma.setting.upsert({
            where: { key: 'last_live_matches_update' },
            update: { value: new Date().toISOString(), updatedAt: new Date() },
            create: {
              key: 'last_live_matches_update',
              value: new Date().toISOString(),
              description: 'Timestamp of last live matches import',
              type: 'string',
              category: 'scheduler',
            },
          });
        } else {
          results.liveMatches = {
            status: 'skipped',
            reason: 'Last update was recent',
            lastUpdate: lastUpdate?.value,
          };
        }
      } catch (error) {
        console.error('Error in live matches task:', error);
        results.liveMatches = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // 2. Import upcoming matches (unless specific different task requested)
    if (!taskParam || taskParam === 'upcoming') {
      try {
        console.log('Running task: Import upcoming matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_upcoming_matches_update' },
        });

        const runImport =
          forceParam ||
          !lastUpdate ||
          new Date(lastUpdate.value) < getTimeAgo(60);

        if (runImport) {
          // Fetch upcoming matches (next 7 days, limited to 50)
          const upcomingMatches = await sportmonkApi.matches.fetchUpcoming(
            1,
            50
          );

          // Process each match
          if (
            upcomingMatches &&
            upcomingMatches.data &&
            Array.isArray(upcomingMatches.data)
          ) {
            results.upcomingMatches = {
              count: upcomingMatches.data.length,
              processed: [],
            };

            for (const match of upcomingMatches.data) {
              try {
                // Create basic match record
                const dbMatch = await createMatch(match);

                // Check if we need to import players for this match
                const needsPlayers = await matchNeedsPlayers(
                  match.id.toString()
                );

                if (needsPlayers) {
                  // Try to get players for this match using squad data
                  const localTeamId = match.localteam?.id;
                  const visitorTeamId = match.visitorteam?.id;

                  if (localTeamId) {
                    await sportmonkApi.teams.fetchPlayers(
                      parseInt(localTeamId)
                    );
                  }

                  if (visitorTeamId) {
                    await sportmonkApi.teams.fetchPlayers(
                      parseInt(visitorTeamId)
                    );
                  }
                }

                results.upcomingMatches.processed.push({
                  id: match.id,
                  name:
                    match.name ||
                    `${match.localteam?.name} vs ${match.visitorteam?.name}`,
                  players: needsPlayers ? 'imported' : 'skipped',
                  status: 'success',
                });
              } catch (error) {
                console.error(
                  `Error processing upcoming match ${match.id}:`,
                  error
                );
                results.upcomingMatches.processed.push({
                  id: match.id,
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }

          // Update last run timestamp
          await prisma.setting.upsert({
            where: { key: 'last_upcoming_matches_update' },
            update: { value: new Date().toISOString(), updatedAt: new Date() },
            create: {
              key: 'last_upcoming_matches_update',
              value: new Date().toISOString(),
              description: 'Timestamp of last upcoming matches import',
              type: 'string',
              category: 'scheduler',
            },
          });
        } else {
          results.upcomingMatches = {
            status: 'skipped',
            reason: 'Last update was recent',
            lastUpdate: lastUpdate?.value,
          };
        }
      } catch (error) {
        console.error('Error in upcoming matches task:', error);
        results.upcomingMatches = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // 3. Update players for upcoming matches missing player data
    if (!taskParam || taskParam === 'players') {
      try {
        console.log('Running task: Import players for upcoming matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_players_update' },
        });

        const runImport =
          forceParam ||
          !lastUpdate ||
          new Date(lastUpdate.value) < getTimeAgo(240); // 4 hours

        if (runImport) {
          // Find upcoming matches without player data
          const upcomingMatches = await prisma.match.findMany({
            where: {
              status: 'upcoming',
              startTime: { gte: new Date() }, // Future matches only
            },
            orderBy: { startTime: 'asc' },
            take: 20, // Limit to 20 matches to avoid rate limiting
          });

          results.playerUpdate = {
            matchesProcessed: 0,
            matchesWithPlayers: 0,
          };

          for (const match of upcomingMatches) {
            try {
              results.playerUpdate.matchesProcessed++;

              // Check if match needs players
              const needsPlayers = await matchNeedsPlayers(match.id);

              if (needsPlayers) {
                // Try to get team players for both teams
                if (match.teamAId) {
                  await sportmonkApi.teams.fetchPlayers(
                    parseInt(match.teamAId)
                  );
                }

                if (match.teamBId) {
                  await sportmonkApi.teams.fetchPlayers(
                    parseInt(match.teamBId)
                  );
                }

                results.playerUpdate.matchesWithPlayers++;
              }
            } catch (error) {
              console.error(
                `Error updating players for match ${match.id}:`,
                error
              );
            }
          }

          // Update last run timestamp
          await prisma.setting.upsert({
            where: { key: 'last_players_update' },
            update: { value: new Date().toISOString(), updatedAt: new Date() },
            create: {
              key: 'last_players_update',
              value: new Date().toISOString(),
              description:
                'Timestamp of last player data update for upcoming matches',
              type: 'string',
              category: 'scheduler',
            },
          });
        } else {
          results.playerUpdate = {
            status: 'skipped',
            reason: 'Last update was recent',
            lastUpdate: lastUpdate?.value,
          };
        }
      } catch (error) {
        console.error('Error in player update task:', error);
        results.playerUpdate = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduler tasks completed',
      tasks: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
