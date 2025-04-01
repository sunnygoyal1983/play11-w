import {
  buildApiUrl,
  rateLimitedFetch,
  prisma,
  getDateRange,
  logApiRequest,
} from './utils';

/**
 * Create a match from API data
 */
export const createMatch = async (match: any) => {
  try {
    // Use a transaction to ensure all related entities are created before the match
    return await prisma.$transaction(async (tx) => {
      // 1. Ensure tournament exists
      if (match.league?.id) {
        const tournament = await tx.tournament.findUnique({
          where: { sportMonkId: match.league.id.toString() },
        });

        if (!tournament) {
          console.log(
            `Tournament ${match.league.id} not found, creating it first...`
          );

          // Create tournament directly in the transaction
          await tx.tournament.create({
            data: {
              id: match.league.id.toString(),
              sportMonkId: match.league.id.toString(),
              name: match.league?.name || 'Unknown League',
              shortName: match.league?.code || '',
              image: match.league?.image_path || '',
              country: '',
              season: '',
              isActive: true,
            },
          });
        }
      }

      // 2. Ensure team A exists
      if (match.localteam?.id) {
        await tx.team.upsert({
          where: { sportMonkId: match.localteam.id.toString() },
          update: {
            name: match.localteam.name || '',
            shortName: match.localteam.code || '',
            image: match.localteam.image_path || '',
            country: '',
            isActive: true,
          },
          create: {
            id: match.localteam.id.toString(),
            sportMonkId: match.localteam.id.toString(),
            name: match.localteam.name || '',
            shortName: match.localteam.code || '',
            image: match.localteam.image_path || '',
            country: '',
            isActive: true,
          },
        });
      }

      // 3. Ensure team B exists
      if (match.visitorteam?.id) {
        await tx.team.upsert({
          where: { sportMonkId: match.visitorteam.id.toString() },
          update: {
            name: match.visitorteam.name || '',
            shortName: match.visitorteam.code || '',
            image: match.visitorteam.image_path || '',
            country: '',
            isActive: true,
          },
          create: {
            id: match.visitorteam.id.toString(),
            sportMonkId: match.visitorteam.id.toString(),
            name: match.visitorteam.name || '',
            shortName: match.visitorteam.code || '',
            image: match.visitorteam.image_path || '',
            country: '',
            isActive: true,
          },
        });
      }

      // 4. Now create or update the match
      return await tx.match.upsert({
        where: { sportMonkId: match.id.toString() },
        update: {
          name: `${match.localteam?.name || 'TBA'} vs ${
            match.visitorteam?.name || 'TBA'
          }`,
          format: match.type || 'unknown',
          status: 'upcoming',
          startTime: match.starting_at
            ? new Date(match.starting_at)
            : new Date(),
          venue: match.venue?.name || 'TBA',
          teamAId: match.localteam?.id?.toString() || '',
          teamAName: match.localteam?.name || 'TBA',
          teamALogo: match.localteam?.image_path || '',
          teamBId: match.visitorteam?.id?.toString() || '',
          teamBName: match.visitorteam?.name || 'TBA',
          teamBLogo: match.visitorteam?.image_path || '',
          leagueId: match.league?.id?.toString() || '',
          leagueName: match.league?.name || 'Unknown League',
          isActive: true,
        },
        create: {
          id: match.id.toString(),
          sportMonkId: match.id.toString(),
          name: `${match.localteam?.name || 'TBA'} vs ${
            match.visitorteam?.name || 'TBA'
          }`,
          format: match.type || 'unknown',
          status: 'upcoming',
          startTime: match.starting_at
            ? new Date(match.starting_at)
            : new Date(),
          venue: match.venue?.name || 'TBA',
          teamAId: match.localteam?.id?.toString() || '',
          teamAName: match.localteam?.name || 'TBA',
          teamALogo: match.localteam?.image_path || '',
          teamBId: match.visitorteam?.id?.toString() || '',
          teamBName: match.visitorteam?.name || 'TBA',
          teamBLogo: match.visitorteam?.image_path || '',
          leagueId: match.league?.id?.toString() || '',
          leagueName: match.league?.name || 'Unknown League',
          isActive: true,
        },
      });
    });
  } catch (error) {
    console.error(`Error creating match ${match.id}:`, error);
    throw error;
  }
};

/**
 * Fetch match details and update the database
 */
export const fetchMatchDetails = async (matchId: number) => {
  try {
    const url = buildApiUrl(`/fixtures/${matchId}`, {
      include: 'localteam,visitorteam,venue,league,lineup,runs,manofmatch',
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
      console.error(`API Error Response for match details:`, errorText);
      return null;
    }

    const data = await response.json();
    const match = data.data;

    // Create/update the match
    await createMatch(match);

    return data;
  } catch (error) {
    console.error(`Error fetching match details for match ${matchId}:`, error);
    throw error;
  }
};

/**
 * Fetch live matches
 */
export const fetchLiveMatches = async (page = 1, perPage = 10) => {
  try {
    const url = buildApiUrl('/livescores', {
      include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling',
      filter: 'status:LIVE',
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
      console.error(`API Error Response for live matches:`, errorText);
      return null;
    }

    const data = await response.json();
    const matches = data.data;

    // Create/update each match
    for (const match of matches) {
      try {
        await createMatch(match);
      } catch (error) {
        console.error(`Error creating live match ${match.id}:`, error);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

/**
 * Fetch recent matches
 */
export const fetchRecentMatches = async (page = 1, perPage = 10) => {
  try {
    const { startDate, endDate } = getDateRange(7);
    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league,runs',
      filter: `status:Finished,starting_at:${startDate}...${endDate}`,
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
      console.error(`API Error Response for recent matches:`, errorText);
      return null;
    }

    const data = await response.json();
    const matches = data.data;

    // Create/update each match
    for (const match of matches) {
      try {
        await createMatch({
          ...match,
          status: 'completed',
          endTime: new Date(),
        });
      } catch (error) {
        console.error(`Error creating recent match ${match.id}:`, error);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }
};

/**
 * Fetch upcoming matches
 */
export const fetchUpcomingMatches = async (page = 1, perPage = 10) => {
  try {
    const { startDate, endDate } = getDateRange();
    console.log(
      'Fetching upcoming matches between:',
      startDate,
      'and',
      endDate
    );

    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league',
      filter: `starting_between:${startDate},${endDate}`,
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
      console.error(`API Error Response for upcoming matches:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Received matches:', data.data?.length || 0);

    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }

    // Create/update each match
    const matches = data.data;
    const createdMatches = [];

    for (const match of matches) {
      try {
        if (!match.id) {
          console.warn('Skipping match with missing ID');
          continue;
        }

        console.log('Processing match:', match.id);
        const createdMatch = await createMatch(match);
        createdMatches.push(createdMatch);
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
      }
    }

    return {
      ...data,
      createdMatches,
    };
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return {
      error: true,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };
  }
};
