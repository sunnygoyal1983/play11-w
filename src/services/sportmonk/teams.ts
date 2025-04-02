import {
  buildApiUrl,
  rateLimitedFetch,
  prisma,
  logApiRequest,
  fetchSeasonPlayers,
} from './utils';

/**
 * Create a team from API data
 */
export const createTeam = async (team: any) => {
  try {
    return await prisma.team.upsert({
      where: { sportMonkId: team.id?.toString() || '' },
      update: {
        name: team.name || '',
        shortName: team.code || team.short_name || '',
        image: team.image_path || '',
        country: team.country?.name || '',
        isActive: true,
      },
      create: {
        id: team.id?.toString() || '',
        sportMonkId: team.id?.toString() || '',
        name: team.name || '',
        shortName: team.code || team.short_name || '',
        image: team.image_path || '',
        country: team.country?.name || '',
        isActive: true,
      },
    });
  } catch (error) {
    console.error(`Error creating team ${team.id}:`, error);
    throw error;
  }
};

/**
 * Fetch teams for a tournament and store them in the database
 */
export const fetchTournamentTeams = async (tournamentId: number) => {
  try {
    const url = buildApiUrl('/teams', {
      filter: `league_id:${tournamentId}`,
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for tournament teams:`, errorText);
      return null;
    }

    const data = await response.json();
    const teams = data.data;

    // Store teams in database
    const createdTeams = [];
    for (const team of teams) {
      try {
        const createdTeam = await createTeam(team);
        createdTeams.push(createdTeam);
      } catch (error) {
        console.error(`Error storing team ${team.id}:`, error);
      }
    }

    return {
      ...data,
      createdTeams,
    };
  } catch (error) {
    console.error(
      `Error fetching teams for tournament ${tournamentId}:`,
      error
    );
    throw error;
  }
};

/**
 * Fetch team details and players
 */
export const fetchTeamDetails = async (teamId: number) => {
  try {
    const url = buildApiUrl(`/teams/${teamId}`, {
      include: 'country',
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for team details:`, errorText);
      return null;
    }

    const data = await response.json();
    const team = data.data;

    // Create or update the team in the database
    await createTeam(team);

    return data;
  } catch (error) {
    console.error(`Error fetching team details for team ${teamId}:`, error);
    throw error;
  }
};

/**
 * Fetch team players and store them in the database
 */
export const fetchTeamPlayers = async (teamId: number) => {
  try {
    // First ensure we have the team in the database
    await fetchTeamDetails(teamId);

    const url = buildApiUrl(`/teams/${teamId}`, {
      include: 'squad',
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for team players:`, errorText);
      return null;
    }

    const data = await response.json();
    const team = data.data;

    if (!team || !team.squad) {
      console.warn(`No squad data available for team ${teamId}`);
      return null;
    }

    // Use a transaction to ensure the team exists before creating players
    await prisma.$transaction(async (tx) => {
      // Ensure team record exists
      const teamRecord = await tx.team.findUnique({
        where: { sportMonkId: team.id?.toString() || '' },
      });

      if (!teamRecord) {
        throw new Error(
          `Team ${team.id} not found in database after fetching details`
        );
      }

      // Store team players in database
      for (const player of team.squad) {
        if (!player.id) {
          console.warn('Skipping player with missing ID');
          continue;
        }

        try {
          await tx.player.upsert({
            where: { sportMonkId: player.id.toString() },
            update: {
              name: player.fullname || 'Unknown Player',
              image: player.image_path || '',
              teamId: team.id?.toString() || '',
              teamName: team.name || 'Unknown Team',
              role: (player.position?.name || 'unknown').toLowerCase(),
            },
            create: {
              id: player.id.toString(),
              sportMonkId: player.id.toString(),
              name: player.fullname || 'Unknown Player',
              image: player.image_path || '',
              country: player.country_id?.toString() || '',
              teamId: team.id?.toString() || '',
              teamName: team.name || 'Unknown Team',
              role: (player.position?.name || 'unknown').toLowerCase(),
            },
          });
        } catch (playerError) {
          console.error(`Error storing player ${player.id} data:`, playerError);
          continue;
        }
      }
    });

    return data;
  } catch (error) {
    console.error(`Error fetching team players for team ${teamId}:`, error);
    return null;
  }
};

/**
 * Fetch and store players for a tournament season
 * This ensures we get the current players for the season
 */
export async function fetchTeamPlayersBySeason(tournamentId: string) {
  try {
    // Get the tournament to access the season ID
    const tournament = await prisma.tournament.findUnique({
      where: { sportMonkId: tournamentId },
    });

    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    // For now, we will try to use the tournament.season as the season ID
    // or get the current season ID from the SportMonk API
    let seasonIdToUse: string | null = null;

    // Try to use the seasonId field directly if available
    const seasonIdFromDb = (await prisma.$queryRaw`
      SELECT "seasonId" FROM "Tournament" WHERE "sportMonkId" = ${tournamentId}
    `) as any[];

    if (seasonIdFromDb?.length > 0 && seasonIdFromDb[0]?.seasonId) {
      seasonIdToUse = seasonIdFromDb[0].seasonId;
      console.log(
        `Using seasonId ${seasonIdToUse} from database for tournament ${tournament.name}`
      );
    }

    // If seasonId not available, try to get from API
    if (!seasonIdToUse) {
      // First try to get the current season ID from the API
      try {
        const url = buildApiUrl(`/leagues/${tournamentId}`, {
          include: 'season,country',
        });

        logApiRequest(url);
        const response = await rateLimitedFetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.data?.season?.id) {
            seasonIdToUse = data.data.season.id.toString();
            console.log(
              `Got season ID ${seasonIdToUse} from API for tournament ${tournament.name}`
            );
          }
        }
      } catch (error) {
        console.warn(`Error fetching current season ID from API: ${error}`);
      }

      // If we couldn't get the season ID from the API, try to parse it from tournament.season
      if (!seasonIdToUse && tournament.season) {
        // If tournament.season is an ID (numeric string), use it
        if (/^\d+$/.test(tournament.season)) {
          seasonIdToUse = tournament.season;
          console.log(
            `Using numeric season value ${seasonIdToUse} as ID for tournament ${tournament.name}`
          );
        } else {
          console.warn(
            `Tournament ${tournament.name} has season name (${tournament.season}) but not a numeric ID`
          );
        }
      }
    }

    if (!seasonIdToUse) {
      console.warn(`No season ID found for tournament ${tournamentId}`);
      return { success: false, message: 'No season ID found for tournament' };
    }

    console.log(
      `Fetching players for tournament ${tournament.name} (season ID: ${seasonIdToUse})`
    );

    // Fetch all squads for this season
    const seasonData = await fetchSeasonPlayers(seasonIdToUse);
    if (!seasonData || !seasonData.data) {
      return { success: false, message: 'No squad data returned from API' };
    }

    const squads = seasonData.data;
    console.log(`Processing ${squads.length} squads`);

    // Store players in database
    for (const squad of squads) {
      try {
        // Ensure the team exists
        if (!squad.team?.id) {
          console.warn('Skipping squad with missing team ID');
          continue;
        }

        // Create or update the team first
        await createTeam(squad.team);

        // Process squad players
        if (!squad.players || !Array.isArray(squad.players)) {
          console.warn(`No players found for team ${squad.team.name}`);
          continue;
        }

        // Use a transaction to ensure team exists before adding players
        await prisma.$transaction(async (tx) => {
          for (const squadPlayer of squad.players) {
            if (!squadPlayer.player || !squadPlayer.player.id) {
              console.warn('Skipping player with missing ID');
              continue;
            }

            const player = squadPlayer.player;
            await tx.player.upsert({
              where: { sportMonkId: player.id.toString() },
              update: {
                name: player.fullname || player.name || 'Unknown Player',
                image: player.image_path || '',
                teamId: squad.team.id.toString(),
                teamName: squad.team.name || 'Unknown Team',
                role: (
                  player.position?.name ||
                  squadPlayer.position?.name ||
                  'unknown'
                ).toLowerCase(),
                battingStyle: player.batting_style || '',
                bowlingStyle: player.bowling_style || '',
              },
              create: {
                id: player.id.toString(),
                sportMonkId: player.id.toString(),
                name: player.fullname || player.name || 'Unknown Player',
                image: player.image_path || '',
                country: player.country_id?.toString() || '',
                teamId: squad.team.id.toString(),
                teamName: squad.team.name || 'Unknown Team',
                role: (
                  player.position?.name ||
                  squadPlayer.position?.name ||
                  'unknown'
                ).toLowerCase(),
                battingStyle: player.batting_style || '',
                bowlingStyle: player.bowling_style || '',
                isActive: true,
              },
            });
          }
        });

        console.log(
          `Processed ${squad.players.length} players for team ${squad.team.name}`
        );
      } catch (error) {
        console.error(`Error processing squad:`, error);
      }
    }

    return {
      success: true,
      message: `Processed ${squads.length} teams with players for tournament season`,
    };
  } catch (error) {
    console.error(`Error fetching team players by season:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
