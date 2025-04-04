import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi, prisma } from '@/services/sportmonk';
import { createMatch } from '@/services/sportmonk/matches';

// Helper function to check if tournament already has teams
async function tournamentHasTeams(tournamentId: string): Promise<boolean> {
  const teamsCount = await prisma.team.count({
    where: {
      OR: [{ id: { in: await getTeamIdsFromMatches(tournamentId) } }],
    },
  });
  return teamsCount > 0;
}

// Helper function to check if tournament already has matches
async function tournamentHasMatches(tournamentId: string): Promise<boolean> {
  const matchesCount = await prisma.match.count({
    where: {
      leagueId: tournamentId,
    },
  });
  return matchesCount > 0;
}

// Helper function to check if tournament already has players
async function tournamentHasPlayers(tournamentId: string): Promise<boolean> {
  const teamIds = await getTeamIdsFromMatches(tournamentId);
  const playersCount = await prisma.player.count({
    where: {
      teamId: { in: teamIds },
    },
  });
  return playersCount > 0;
}

// Helper function to get team IDs from matches for a tournament
async function getTeamIdsFromMatches(tournamentId: string): Promise<string[]> {
  const matches = await prisma.match.findMany({
    where: {
      leagueId: tournamentId,
    },
    select: {
      teamAId: true,
      teamBId: true,
    },
  });

  const teamIds = new Set<string>();
  matches.forEach((match) => {
    if (match.teamAId) teamIds.add(match.teamAId);
    if (match.teamBId) teamIds.add(match.teamBId);
  });

  return Array.from(teamIds);
}

// GET /api/import - For direct browser requests
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') || 'all';
    const tournamentId = searchParams.get('tournamentId');
    const forceImport = searchParams.get('force') === 'true';

    // Check if the user is just checking info or actually importing
    const actionParam = searchParams.get('action');

    // If no action parameter provided, just show usage info
    if (!actionParam) {
      return NextResponse.json({
        message:
          'Import API is running. Add action=import to actually import data.',
        usage: {
          withQueryParams:
            'GET /api/import?action=import&entityType=tournaments&tournamentId=214',
          availableEntityTypes: 'all, tournaments, teams, matches, players',
          examples: [
            '/api/import?action=import&entityType=tournaments',
            '/api/import?action=import&entityType=all&tournamentId=214',
            '/api/import?action=import&entityType=players&tournamentId=214',
            '/api/import?action=import&entityType=all&tournamentId=214&force=true',
          ],
        },
      });
    }

    // If action is not "import", show error
    if (actionParam !== 'import') {
      return NextResponse.json(
        {
          error: true,
          message: `Invalid action '${actionParam}'. Use action=import to perform import operation.`,
        },
        { status: 400 }
      );
    }

    console.log(
      `Starting import operation via GET request: entityType=${entityType}, tournamentId=${
        tournamentId || 'not specified'
      }, forceImport=${forceImport}`
    );

    // Process the import request - reuse the same logic as POST
    const result: Record<string, any> = {};
    const includePlayers = searchParams.get('includePlayers') === 'true';

    // Log the import parameters
    console.log(`Starting import with parameters:
      - entityType: ${entityType}
      - tournamentId: ${tournamentId || 'not specified'}
      - includePlayers: ${includePlayers}
      - forceImport: ${forceImport}
    `);

    // Step 1: Import tournaments
    if (entityType === 'all' || entityType === 'tournaments') {
      if (tournamentId) {
        // Import specific tournament
        const tournament = await sportmonkApi.tournaments.fetchDetails(
          parseInt(tournamentId)
        );
        result.tournament = tournament;
      } else {
        // Import all tournaments
        const tournaments = await sportmonkApi.tournaments.fetchAll();
        result.tournaments = tournaments;
      }
    }

    // Step 2: Import teams for tournaments
    if ((entityType === 'all' || entityType === 'teams') && tournamentId) {
      // Check if teams already exist for this tournament
      const hasTeams = await tournamentHasTeams(tournamentId);

      if (!hasTeams || forceImport) {
        // Import teams for a specific tournament
        const teams = await sportmonkApi.teams.fetchByTournament(
          parseInt(tournamentId)
        );
        result.teams = teams;
      } else {
        result.teams = {
          message: `Teams for tournament ${tournamentId} already exist. Use force=true to re-import.`,
          skipped: true,
        };
      }
    }

    // Step 3: Import matches for tournaments
    if ((entityType === 'all' || entityType === 'matches') && tournamentId) {
      // Check if matches already exist for this tournament
      const hasMatches = await tournamentHasMatches(tournamentId);

      if (!hasMatches || forceImport) {
        // Import matches for a specific tournament
        const matches = await sportmonkApi.tournaments.fetchMatches(
          parseInt(tournamentId)
        );

        // Process each match to create proper database records
        const createdMatches = [];
        if (matches && matches.data && Array.isArray(matches.data)) {
          for (const match of matches.data) {
            try {
              const createdMatch = await createMatch(match);
              createdMatches.push(createdMatch);

              // If includePlayers flag is set, fetch detailed match data including lineup
              if (includePlayers) {
                console.log(
                  `Fetching detailed data with players for match ${match.id}`
                );
                await sportmonkApi.matches.fetchDetails(parseInt(match.id));
              }
            } catch (error) {
              console.error(`Error creating match ${match.id}:`, error);
            }
          }
        }

        result.matches = {
          ...matches,
          createdMatches,
        };
      } else {
        result.matches = {
          message: `Matches for tournament ${tournamentId} already exist. Use force=true to re-import.`,
          skipped: true,
        };
      }
    }

    // Step 4: Import players for teams
    if (entityType === 'all' || entityType === 'players') {
      if (tournamentId) {
        // Check if players already exist for this tournament
        const hasPlayers = await tournamentHasPlayers(tournamentId);

        if (!hasPlayers || forceImport) {
          // First try to get players using season data if available
          let playerResults = [];

          try {
            console.log('Trying to fetch players using season data...');
            const seasonPlayersResult =
              await sportmonkApi.teams.fetchPlayersBySeason(tournamentId);

            if (seasonPlayersResult.success) {
              playerResults.push({
                method: 'season',
                success: true,
                message: seasonPlayersResult.message,
              });

              // If season player fetch was successful, we can return
              result.players = playerResults;
              console.log('Successfully imported players using season data');
            } else {
              console.log(
                'Season player fetch was not successful, falling back to team-by-team player fetch'
              );
              playerResults.push({
                method: 'season',
                success: false,
                message: seasonPlayersResult.message,
              });

              // Fall back to getting players team by team
              // Get teams for this tournament using raw matches table query
              const teams = await prisma.match.findMany({
                where: {
                  leagueId: tournamentId.toString(),
                },
                select: {
                  teamAId: true,
                  teamBId: true,
                },
                distinct: ['teamAId', 'teamBId'],
              });

              // Extract unique team IDs
              const teamIds = new Set<string>();
              teams.forEach((match) => {
                if (match.teamAId) teamIds.add(match.teamAId);
                if (match.teamBId) teamIds.add(match.teamBId);
              });

              // Fetch players for each team
              for (const teamId of Array.from(teamIds)) {
                try {
                  const players = await sportmonkApi.teams.fetchPlayers(
                    parseInt(teamId)
                  );
                  if (players) {
                    playerResults.push({
                      method: 'team',
                      teamId,
                      success: true,
                    });
                  } else {
                    playerResults.push({
                      method: 'team',
                      teamId,
                      success: false,
                      error: 'Failed to fetch players',
                    });
                  }
                } catch (error) {
                  playerResults.push({
                    method: 'team',
                    teamId,
                    success: false,
                    error: String(error),
                  });
                }
              }

              result.players = playerResults;
            }
          } catch (error) {
            console.error('Error during player import:', error);
            result.players = {
              error: true,
              message: error instanceof Error ? error.message : String(error),
            };
          }
        } else {
          result.players = {
            message: `Players for tournament ${tournamentId} already exist. Use force=true to re-import.`,
            skipped: true,
          };
        }
      } else {
        // If no tournament specified, just get the timestamp
        result.players = {
          message: 'No specific tournament ID provided for player import',
        };
      }
    }

    // After import, get summary counts
    const summary = {
      tournaments: await prisma.tournament.count(),
      teams: await prisma.team.count(),
      matches: await prisma.match.count(),
      players: await prisma.player.count(),
    };

    return NextResponse.json({
      success: true,
      message: 'Import completed via GET request',
      timestamp: new Date().toISOString(),
      importParams: {
        entityType,
        tournamentId: tournamentId || 'not specified',
        forceImport,
      },
      summary,
      result,
    });
  } catch (error) {
    console.error('Error during import (GET method):', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Import failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/import
export async function POST(request: NextRequest) {
  try {
    // Parse the request body for custom import options
    const body = await request.json().catch(() => ({}));
    const entityType = body.entityType || 'all'; // all, tournaments, teams, matches, players
    const tournamentId = body.tournamentId; // Optional specific tournament ID
    const includePlayers = body.includePlayers || false;
    const forceImport = body.force || false;

    const result: Record<string, any> = {};

    // Step 1: Import tournaments
    if (entityType === 'all' || entityType === 'tournaments') {
      if (tournamentId) {
        // Import specific tournament
        const tournament = await sportmonkApi.tournaments.fetchDetails(
          parseInt(tournamentId)
        );
        result.tournament = tournament;
      } else {
        // Import all tournaments
        const tournaments = await sportmonkApi.tournaments.fetchAll();
        result.tournaments = tournaments;
      }
    }

    // Step 2: Import teams for tournaments
    if ((entityType === 'all' || entityType === 'teams') && tournamentId) {
      // Check if teams already exist for this tournament
      const hasTeams = await tournamentHasTeams(tournamentId);

      if (!hasTeams || forceImport) {
        // Import teams for a specific tournament
        const teams = await sportmonkApi.teams.fetchByTournament(
          parseInt(tournamentId)
        );
        result.teams = teams;
      } else {
        result.teams = {
          message: `Teams for tournament ${tournamentId} already exist. Use force=true to re-import.`,
          skipped: true,
        };
      }
    }

    // Step 3: Import matches for tournaments
    if ((entityType === 'all' || entityType === 'matches') && tournamentId) {
      // Check if matches already exist for this tournament
      const hasMatches = await tournamentHasMatches(tournamentId);

      if (!hasMatches || forceImport) {
        // Import matches for a specific tournament
        const matches = await sportmonkApi.tournaments.fetchMatches(
          parseInt(tournamentId)
        );

        // Process each match to create proper database records
        const createdMatches = [];
        if (matches && matches.data && Array.isArray(matches.data)) {
          for (const match of matches.data) {
            try {
              const createdMatch = await createMatch(match);
              createdMatches.push(createdMatch);

              // If includePlayers flag is set, fetch detailed match data including lineup
              if (includePlayers) {
                console.log(
                  `Fetching detailed data with players for match ${match.id}`
                );
                await sportmonkApi.matches.fetchDetails(parseInt(match.id));
              }
            } catch (error) {
              console.error(`Error creating match ${match.id}:`, error);
            }
          }
        }

        result.matches = {
          ...matches,
          createdMatches,
        };
      } else {
        result.matches = {
          message: `Matches for tournament ${tournamentId} already exist. Use force=true to re-import.`,
          skipped: true,
        };
      }
    }

    // Step 4: Import players for teams
    if (entityType === 'all' || entityType === 'players') {
      if (tournamentId) {
        // Check if players already exist for this tournament
        const hasPlayers = await tournamentHasPlayers(tournamentId);

        if (!hasPlayers || forceImport) {
          // First try to get players using season data if available
          let playerResults = [];

          try {
            console.log('Trying to fetch players using season data...');
            const seasonPlayersResult =
              await sportmonkApi.teams.fetchPlayersBySeason(tournamentId);

            if (seasonPlayersResult.success) {
              playerResults.push({
                method: 'season',
                success: true,
                message: seasonPlayersResult.message,
              });

              // If season player fetch was successful, we can return
              result.players = playerResults;
              console.log('Successfully imported players using season data');
            } else {
              console.log(
                'Season player fetch was not successful, falling back to team-by-team player fetch'
              );
              playerResults.push({
                method: 'season',
                success: false,
                message: seasonPlayersResult.message,
              });

              // Fall back to getting players team by team
              // Get teams for this tournament using raw matches table query
              const teams = await prisma.match.findMany({
                where: {
                  leagueId: tournamentId.toString(),
                },
                select: {
                  teamAId: true,
                  teamBId: true,
                },
                distinct: ['teamAId', 'teamBId'],
              });

              // Extract unique team IDs
              const teamIds = new Set<string>();
              teams.forEach((match) => {
                if (match.teamAId) teamIds.add(match.teamAId);
                if (match.teamBId) teamIds.add(match.teamBId);
              });

              // Fetch players for each team
              for (const teamId of Array.from(teamIds)) {
                try {
                  const players = await sportmonkApi.teams.fetchPlayers(
                    parseInt(teamId)
                  );
                  if (players) {
                    playerResults.push({
                      method: 'team',
                      teamId,
                      success: true,
                    });
                  } else {
                    playerResults.push({
                      method: 'team',
                      teamId,
                      success: false,
                      error: 'Failed to fetch players',
                    });
                  }
                } catch (error) {
                  playerResults.push({
                    method: 'team',
                    teamId,
                    success: false,
                    error: String(error),
                  });
                }
              }

              result.players = playerResults;
            }
          } catch (error) {
            console.error('Error during player import:', error);
            result.players = {
              error: true,
              message: error instanceof Error ? error.message : String(error),
            };
          }
        } else {
          result.players = {
            message: `Players for tournament ${tournamentId} already exist. Use force=true to re-import.`,
            skipped: true,
          };
        }
      } else {
        // If no tournament specified, just get the timestamp
        result.players = {
          message: 'No specific tournament ID provided for player import',
        };
      }
    }

    // After import, get summary counts
    const summary = {
      tournaments: await prisma.tournament.count(),
      teams: await prisma.team.count(),
      matches: await prisma.match.count(),
      players: await prisma.player.count(),
    };

    return NextResponse.json({
      success: true,
      message: 'Import completed',
      timestamp: new Date().toISOString(),
      importParams: {
        entityType,
        tournamentId: tournamentId || 'not specified',
        includePlayers,
        forceImport,
      },
      summary,
      result,
    });
  } catch (error) {
    console.error('Error during import:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Import failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
