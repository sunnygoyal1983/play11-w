import { buildApiUrl, rateLimitedFetch, prisma, logApiRequest } from './utils';

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
