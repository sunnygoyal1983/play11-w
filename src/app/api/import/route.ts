import { NextRequest, NextResponse } from 'next/server';
import { sportmonkApi, prisma } from '@/services/sportmonk';
import { createMatch } from '@/services/sportmonk/matches';

// POST /api/import
export async function POST(request: NextRequest) {
  try {
    // Parse the request body for custom import options
    const body = await request.json().catch(() => ({}));
    const entityType = body.entityType || 'all'; // all, tournaments, teams, matches, players
    const tournamentId = body.tournamentId; // Optional specific tournament ID

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
      // Import teams for a specific tournament
      const teams = await sportmonkApi.teams.fetchByTournament(
        parseInt(tournamentId)
      );
      result.teams = teams;
    }

    // Step 3: Import matches for tournaments
    if ((entityType === 'all' || entityType === 'matches') && tournamentId) {
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
          } catch (error) {
            console.error(`Error creating match ${match.id}:`, error);
          }
        }
      }

      result.matches = {
        ...matches,
        createdMatches,
      };
    }

    // Step 4: Import players for teams
    if (entityType === 'all' || entityType === 'players') {
      if (tournamentId) {
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
        const playerResults = [];
        for (const teamId of Array.from(teamIds)) {
          try {
            const players = await sportmonkApi.teams.fetchPlayers(
              parseInt(teamId)
            );
            if (players) {
              playerResults.push({
                teamId,
                success: true,
              });
            } else {
              playerResults.push({
                teamId,
                success: false,
                error: 'Failed to fetch players',
              });
            }
          } catch (error) {
            playerResults.push({
              teamId,
              success: false,
              error: String(error),
            });
          }
        }

        result.players = playerResults;
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
