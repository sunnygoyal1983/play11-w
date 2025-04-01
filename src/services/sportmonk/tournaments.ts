import { buildApiUrl, rateLimitedFetch, prisma, logApiRequest } from './utils';

/**
 * Fetch all tournaments/leagues
 */
export const fetchTournaments = async (page = 1, perPage = 50) => {
  try {
    const url = buildApiUrl('/leagues', {
      include: 'season,country',
      sort: '-name',
      page: page.toString(),
      per_page: perPage.toString(),
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
      console.error(`API Error Response for tournaments:`, errorText);
      return null;
    }

    const data = await response.json();

    // Store tournaments in database
    const tournaments = data.data;
    for (const tournament of tournaments) {
      await prisma.tournament.upsert({
        where: { sportMonkId: tournament.id?.toString() || '' },
        update: {
          name: tournament.name || '',
          shortName: tournament.short_name || '',
          image: tournament.image_path || '',
          country: tournament.country?.name || '',
          season: tournament.season?.name || '',
          isActive: true,
        },
        create: {
          id: tournament.id?.toString() || '',
          sportMonkId: tournament.id?.toString() || '',
          name: tournament.name || '',
          shortName: tournament.short_name || '',
          image: tournament.image_path || '',
          country: tournament.country?.name || '',
          season: tournament.season?.name || '',
          isActive: true,
        },
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    throw error;
  }
};

/**
 * Fetch details for a specific tournament
 */
export const fetchTournamentDetails = async (tournamentId: number) => {
  try {
    // First fetch the tournament basic details
    const url = buildApiUrl(`/leagues/${tournamentId}`, {
      include: 'season,country', // Only use allowed includes
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
      console.error(
        `API Error Response for tournament ${tournamentId}:`,
        errorText
      );
      return null;
    }

    const data = await response.json();
    const tournament = data.data;

    if (!tournament) {
      console.error(`Tournament ${tournamentId} not found`);
      return null;
    }

    // Create or update tournament in the database
    await prisma.tournament.upsert({
      where: { sportMonkId: tournament.id?.toString() || '' },
      update: {
        name: tournament.name || '',
        shortName: tournament.short_name || '',
        image: tournament.image_path || '',
        country: tournament.country?.name || '',
        season: tournament.season?.name || '',
        isActive: true,
      },
      create: {
        id: tournament.id?.toString() || '',
        sportMonkId: tournament.id?.toString() || '',
        name: tournament.name || '',
        shortName: tournament.short_name || '',
        image: tournament.image_path || '',
        country: tournament.country?.name || '',
        season: tournament.season?.name || '',
        isActive: true,
      },
    });

    return data;
  } catch (error) {
    console.error(
      `Error fetching tournament details for ${tournamentId}:`,
      error
    );
    throw error;
  }
};

/**
 * Fetch matches for a specific tournament
 */
export const fetchTournamentMatches = async (
  tournamentId: number,
  page = 1,
  perPage = 50
) => {
  try {
    // First, ensure the tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { sportMonkId: tournamentId.toString() },
    });

    if (!tournament) {
      console.log(
        `Tournament ${tournamentId} not found, fetching details first...`
      );
      await fetchTournamentDetails(tournamentId);
    }

    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league',
      filter: `league_id:${tournamentId}`,
      sort: '-starting_at',
      page: page.toString(),
      per_page: perPage.toString(),
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
      console.error(`API Error Response for tournament matches:`, errorText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Error fetching matches for tournament ${tournamentId}:`,
      error
    );
    throw error;
  }
};
