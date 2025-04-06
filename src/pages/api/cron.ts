import { NextApiRequest, NextApiResponse } from 'next';
import { prisma, sportmonkApi } from '@/services/sportmonk';
import { createMatch } from '@/services/sportmonk/matches';

// Define authorized API keys for cron services
const AUTHORIZED_API_KEYS = [
  process.env.CRON_API_KEY, // From environment variable
  'play11-scheduler-key', // Fallback hardcoded key
];

// Check if a timestamp has passed the specified minutes
function hasExceededMinutes(
  timestamp: string | null,
  minutes: number
): boolean {
  if (!timestamp) return true;

  const lastRun = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastRun.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return diffMinutes >= minutes;
}

// Handle the API request
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify request method
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization
  const apiKey = req.headers['x-api-key'] as string;
  if (!AUTHORIZED_API_KEYS.includes(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get the requested task from query parameters
  const { task = 'all', force = 'false' } = req.query;

  try {
    const results: Record<string, any> = {};
    const forceImport = force === 'true';

    // 1. Import live matches
    if (task === 'all' || task === 'live') {
      try {
        console.log('CRON: Running task - Import live matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_live_matches_update' },
        });

        const shouldRun =
          forceImport ||
          !lastUpdate ||
          hasExceededMinutes(lastUpdate.value, 10);

        if (shouldRun) {
          // Fetch and process live matches
          const liveMatches = await sportmonkApi.matches.fetchLive(1, 25);

          if (liveMatches?.data && Array.isArray(liveMatches.data)) {
            results.liveMatches = {
              count: liveMatches.data.length,
              processed: 0,
              errors: 0,
            };

            for (const match of liveMatches.data) {
              try {
                // Create basic match record
                await createMatch(match);

                // Fetch detailed match data with lineups
                await sportmonkApi.matches.fetchDetails(parseInt(match.id));

                results.liveMatches.processed++;
              } catch (error) {
                console.error(
                  `Error processing live match ${match.id}:`,
                  error
                );
                results.liveMatches.errors++;
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

    // 2. Import upcoming matches
    if (task === 'all' || task === 'upcoming') {
      try {
        console.log('CRON: Running task - Import upcoming matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_upcoming_matches_update' },
        });

        const shouldRun =
          forceImport ||
          !lastUpdate ||
          hasExceededMinutes(lastUpdate.value, 60);

        if (shouldRun) {
          // Fetch upcoming matches (next 7 days, limited to 50)
          const upcomingMatches = await sportmonkApi.matches.fetchUpcoming(
            1,
            50
          );

          if (upcomingMatches?.data && Array.isArray(upcomingMatches.data)) {
            results.upcomingMatches = {
              count: upcomingMatches.data.length,
              processed: 0,
              errors: 0,
            };

            for (const match of upcomingMatches.data) {
              try {
                // Create basic match record
                await createMatch(match);
                results.upcomingMatches.processed++;
              } catch (error) {
                console.error(
                  `Error processing upcoming match ${match.id}:`,
                  error
                );
                results.upcomingMatches.errors++;
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

    // 3. Import players for upcoming matches
    if (task === 'all' || task === 'players') {
      try {
        console.log('CRON: Running task - Import players for upcoming matches');
        const lastUpdate = await prisma.setting.findUnique({
          where: { key: 'last_players_update' },
        });

        const shouldRun =
          forceImport ||
          !lastUpdate ||
          hasExceededMinutes(lastUpdate.value, 240); // 4 hours

        if (shouldRun) {
          // Find upcoming matches without player data
          const upcomingMatches = await prisma.match.findMany({
            where: {
              status: 'upcoming',
              startTime: { gte: new Date() },
            },
            orderBy: { startTime: 'asc' },
            take: 20, // Limit to 20 matches to avoid rate limiting
          });

          results.playerUpdate = {
            matchesProcessed: 0,
            teamsProcessed: 0,
          };

          const processedTeamIds = new Set<string>();

          for (const match of upcomingMatches) {
            results.playerUpdate.matchesProcessed++;

            // Process team A players if needed
            if (match.teamAId && !processedTeamIds.has(match.teamAId)) {
              try {
                await sportmonkApi.teams.fetchPlayers(parseInt(match.teamAId));
                processedTeamIds.add(match.teamAId);
                results.playerUpdate.teamsProcessed++;
              } catch (error) {
                console.error(
                  `Error importing players for team ${match.teamAId}:`,
                  error
                );
              }
            }

            // Process team B players if needed
            if (match.teamBId && !processedTeamIds.has(match.teamBId)) {
              try {
                await sportmonkApi.teams.fetchPlayers(parseInt(match.teamBId));
                processedTeamIds.add(match.teamBId);
                results.playerUpdate.teamsProcessed++;
              } catch (error) {
                console.error(
                  `Error importing players for team ${match.teamBId}:`,
                  error
                );
              }
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

    // Return the results
    return res.status(200).json({
      success: true,
      message: 'CRON scheduler tasks completed',
      task: task,
      results: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in CRON scheduler:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}
