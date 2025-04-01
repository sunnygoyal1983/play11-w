import { PrismaClient } from '@prisma/client';
import https from 'https';

const prisma = new PrismaClient();

// Rate limiting configuration
const API_RATE_LIMIT = {
  requestDelay: 1000, // Delay between requests in milliseconds
  maxRetries: 3,
  backoffFactor: 2,
};

// Sleep utility function for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Enhanced fetch function with rate limiting and retries
async function rateLimitedFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  let retries = 0;

  while (retries <= API_RATE_LIMIT.maxRetries) {
    try {
      // Add delay before request (except for first attempt)
      if (retries > 0) {
        const backoffDelay =
          API_RATE_LIMIT.requestDelay *
          Math.pow(API_RATE_LIMIT.backoffFactor, retries - 1);
        await sleep(backoffDelay);
      }

      const response = await fetch(url, options);

      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : API_RATE_LIMIT.requestDelay;
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
        retries++;
        continue;
      }

      return response;
    } catch (error) {
      console.error(
        `Request failed (attempt ${retries + 1}/${
          API_RATE_LIMIT.maxRetries + 1
        }):`,
        error
      );
      if (retries === API_RATE_LIMIT.maxRetries) throw error;
      retries++;
    }
  }

  throw new Error('Max retries exceeded');
}
// API URL Builder
// API URL Builder with Enhanced Logging
function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): string {
  if (!process.env.SPORTMONK_API_KEY) {
    console.error('CRITICAL: Cricket API token is not configured');
    throw new Error('Cricket API token is not configured');
  }

  const url = new URL(`https://cricket.sportmonks.com/api/v2.0${endpoint}`);

  // Add API token
  url.searchParams.append('api_token', process.env.SPORTMONK_API_KEY);

  // Add additional parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  console.log(
    'Built API URL:',
    url.toString().replace(process.env.SPORTMONK_API_KEY, '***')
  );
  return url.toString();
}

// Date Range Utility
function getDateRange(days: number = 10): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    startDate: formatDate(pastDate),
    endDate: formatDate(futureDate),
  };
}

// Tournament/League Level Functions
export const fetchTournaments = async (page = 1, perPage = 50) => {
  try {
    const url = buildApiUrl('/leagues', {
      include: 'season,country',
      sort: '-name',
      page: page.toString(),
      per_page: perPage.toString(),
    });

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

export const fetchTournamentDetails = async (tournamentId: number) => {
  try {
    // First fetch the tournament basic details
    const url = buildApiUrl(`/leagues/${tournamentId}`, {
      include: 'season,country', // Only use allowed includes
    });

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

    // Fetch the teams separately using the teams by league endpoint
    try {
      const teamsUrl = buildApiUrl('/teams', {
        filter: `league_id:${tournamentId}`,
      });

      const teamsResponse = await rateLimitedFetch(teamsUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!teamsResponse.ok) {
        const errorText = await teamsResponse.text();
        console.error(
          `API Error Response for teams in tournament ${tournamentId}:`,
          errorText
        );
      } else {
        const teamsData = await teamsResponse.json();
        const teams = teamsData.data;

        // Store participating teams
        if (teams && Array.isArray(teams)) {
          for (const team of teams) {
            await prisma.team.upsert({
              where: { sportMonkId: team.id?.toString() || '' },
              update: {
                name: team.name || '',
                shortName: team.short_name || '',
                image: team.image_path || '',
                country: team.country?.name || '',
                isActive: true,
              },
              create: {
                id: team.id?.toString() || '',
                sportMonkId: team.id?.toString() || '',
                name: team.name || '',
                shortName: team.short_name || '',
                image: team.image_path || '',
                country: team.country?.name || '',
                isActive: true,
              },
            });
          }
        }
      }
    } catch (teamsError) {
      console.error(
        `Error fetching teams for tournament ${tournamentId}:`,
        teamsError
      );
      // Continue with the tournament data even if teams fetch fails
    }

    return data;
  } catch (error) {
    console.error(
      `Error fetching tournament details for ${tournamentId}:`,
      error
    );
    throw error;
  }
};

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

    // Store matches in database
    const matches = data.data;
    for (const match of matches) {
      try {
        // Ensure both teams exist before creating the match
        if (match.localteam?.id) {
          await prisma.team.upsert({
            where: { sportMonkId: match.localteam.id.toString() },
            update: {
              name: match.localteam.name || '',
              shortName: match.localteam.short_name || '',
              image: match.localteam.image_path || '',
              country: match.localteam.country?.name || '',
              isActive: true,
            },
            create: {
              id: match.localteam.id.toString(),
              sportMonkId: match.localteam.id.toString(),
              name: match.localteam.name || '',
              shortName: match.localteam.short_name || '',
              image: match.localteam.image_path || '',
              country: match.localteam.country?.name || '',
              isActive: true,
            },
          });
        }

        if (match.visitorteam?.id) {
          await prisma.team.upsert({
            where: { sportMonkId: match.visitorteam.id.toString() },
            update: {
              name: match.visitorteam.name || '',
              shortName: match.visitorteam.short_name || '',
              image: match.visitorteam.image_path || '',
              country: match.visitorteam.country?.name || '',
              isActive: true,
            },
            create: {
              id: match.visitorteam.id.toString(),
              sportMonkId: match.visitorteam.id.toString(),
              name: match.visitorteam.name || '',
              shortName: match.visitorteam.short_name || '',
              image: match.visitorteam.image_path || '',
              country: match.visitorteam.country?.name || '',
              isActive: true,
            },
          });
        }

        // Now create the match
        await prisma.match.upsert({
          where: { sportMonkId: match.id?.toString() || '' },
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
            id: match.id?.toString() || '',
            sportMonkId: match.id?.toString() || '',
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
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
        continue;
      }
    }

    return data;
  } catch (error) {
    console.error(
      `Error fetching matches for tournament ${tournamentId}:`,
      error
    );
    throw error;
  }
};

// Team Level Functions
export const fetchTeamPlayers = async (teamId: number) => {
  try {
    const url = buildApiUrl(`/teams/${teamId}`, {
      include: 'squad',
    });

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
      // 1. Ensure team exists
      const teamRecord = await tx.team.findUnique({
        where: { sportMonkId: team.id?.toString() || '' },
      });

      // Create team if it doesn't exist
      if (!teamRecord) {
        console.log(`Team ${team.id} not found, creating it first...`);
        await tx.team.create({
          data: {
            id: team.id?.toString() || '',
            sportMonkId: team.id?.toString() || '',
            name: team.name || 'Unknown Team',
            shortName: team.code || '',
            image: team.image_path || '',
            country: team.country?.name || '',
            isActive: true,
          },
        });
      }

      // 2. Store team players in database
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

// Match Level Functions
export const fetchMatchDetails = async (matchId: number) => {
  try {
    const url = buildApiUrl(`/fixtures/${matchId}`, {
      include: 'localteam,visitorteam,venue,league,lineup,runs,manofmatch',
    });

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

    // Use a transaction to ensure all related entities exist
    await prisma.$transaction(async (tx) => {
      // 1. Ensure tournament exists if available
      if (match.league?.id) {
        const tournament = await tx.tournament.findUnique({
          where: { sportMonkId: match.league.id.toString() },
        });

        if (!tournament) {
          console.log(
            `Tournament ${match.league.id} not found, creating it first...`
          );

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

      // 2. Ensure both teams exist
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

      // 3. Update match details
      await tx.match.update({
        where: { sportMonkId: match.id?.toString() || '' },
        data: {
          status: match.status || 'upcoming',
          result: match.runs
            ? `${match.runs[0]?.score || 0}/${match.runs[0]?.wickets || 0} vs ${
                match.runs[1]?.score || 0
              }/${match.runs[1]?.wickets || 0}`
            : null,
          endTime: match.status === 'Finished' ? new Date() : null,
        },
      });

      // 4. Create any teams that players belong to but aren't explicitly mentioned
      const teamIds = new Set<string>();
      if (match.lineup) {
        for (const player of match.lineup) {
          if (player.team_id && !teamIds.has(player.team_id.toString())) {
            teamIds.add(player.team_id.toString());

            // Check if team exists
            const team = await tx.team.findUnique({
              where: { sportMonkId: player.team_id.toString() },
            });

            if (!team) {
              // Create team for player
              await tx.team.create({
                data: {
                  id: player.team_id.toString(),
                  sportMonkId: player.team_id.toString(),
                  name: player.team_name || 'Unknown Team',
                  shortName: '',
                  image: '',
                  country: '',
                  isActive: true,
                },
              });
            }
          }
        }
      }

      // 5. Store match players
      if (match.lineup) {
        for (const player of match.lineup) {
          if (!player.id) continue;

          // Skip players with missing team_id
          if (!player.team_id) {
            console.warn(`Skipping player ${player.id} with missing team_id`);
            continue;
          }

          // Verify the team exists before creating the player
          const team = await tx.team.findUnique({
            where: { sportMonkId: player.team_id.toString() },
          });

          if (!team) {
            console.log(
              `Team ${player.team_id} for player ${player.id} not found, creating it first...`
            );
            try {
              await tx.team.create({
                data: {
                  id: player.team_id.toString(),
                  sportMonkId: player.team_id.toString(),
                  name: player.team_name || 'Unknown Team',
                  shortName: '',
                  image: '',
                  country: '',
                  isActive: true,
                },
              });
            } catch (teamError) {
              console.error(
                `Failed to create team ${player.team_id}, skipping player ${player.id}:`,
                teamError
              );
              continue; // Skip this player if team creation fails
            }
          }

          try {
            await tx.player.upsert({
              where: { sportMonkId: player.id?.toString() || '' },
              update: {
                name: player.fullname || '',
                image: player.image_path || '',
                country: player.country_id?.toString() || '',
                teamId: player.team_id?.toString() || '',
                teamName: player.team_name || '',
                role: (player.position?.name || '').toLowerCase(),
                battingStyle: player.batting_style || '',
                bowlingStyle: player.bowling_style || '',
              },
              create: {
                id: player.id?.toString() || '',
                sportMonkId: player.id?.toString() || '',
                name: player.fullname || '',
                image: player.image_path || '',
                country: player.country_id?.toString() || '',
                teamId: player.team_id?.toString() || '',
                teamName: player.team_name || '',
                role: (player.position?.name || '').toLowerCase(),
                battingStyle: player.batting_style || '',
                bowlingStyle: player.bowling_style || '',
              },
            });
          } catch (playerError) {
            console.error(
              `Error creating/updating player ${player.id}:`,
              playerError
            );
            // Continue with other players
          }
        }
      }
    });

    return data;
  } catch (error) {
    console.error(`Error fetching match details for match ${matchId}:`, error);
    throw error;
  }
};

// Live Score Functions
export const fetchLiveMatches = async (page = 1, perPage = 10) => {
  try {
    const url = buildApiUrl('/livescores', {
      include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling',
      filter: 'status:LIVE',
      page: page.toString(),
      per_page: perPage.toString(),
    });

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

    // Update live matches in database
    const matches = data.data;
    for (const match of matches) {
      await prisma.match.update({
        where: { sportMonkId: match.id?.toString() || '' },
        data: {
          status: 'live',
          result: match.runs
            ? `${match.runs[0]?.score || 0}/${match.runs[0]?.wickets || 0} vs ${
                match.runs[1]?.score || 0
              }/${match.runs[1]?.wickets || 0}`
            : null,
        },
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

// Recent Matches Functions
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

    // Update completed matches in database
    const matches = data.data;
    for (const match of matches) {
      await prisma.match.update({
        where: { sportMonkId: match.id?.toString() || '' },
        data: {
          status: 'completed',
          endTime: new Date(),
          result: match.runs
            ? `${match.runs[0]?.score || 0}/${match.runs[0]?.wickets || 0} vs ${
                match.runs[1]?.score || 0
              }/${match.runs[1]?.wickets || 0}`
            : null,
        },
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }
};

// Match Level Functions
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

    console.log(
      'Making API request to:',
      url.replace(process.env.SPORTMONK_API_KEY || '', '***')
    );

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

    // Store matches in database
    const matches = data.data;
    for (const match of matches) {
      try {
        if (!match.id) {
          console.warn('Skipping match with missing ID');
          continue;
        }

        console.log('Processing match:', match.id);

        // Use a transaction to ensure all related entities are created before the match
        await prisma.$transaction(async (tx) => {
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

              // Fetch tournament details asynchronously (outside transaction) for later update
              fetchTournamentDetails(parseInt(match.league.id)).catch((e) =>
                console.error(`Error fetching tournament details: ${e}`)
              );
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
          await tx.match.upsert({
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

        // Fetch additional data outside the transaction (after match is created)
        // Fetch and store players for both teams
        if (match.localteam?.id && match.visitorteam?.id) {
          const [teamAPlayers, teamBPlayers] = await Promise.allSettled([
            fetchTeamPlayers(parseInt(match.localteam.id)),
            fetchTeamPlayers(parseInt(match.visitorteam.id)),
          ]);

          if (teamAPlayers.status === 'rejected') {
            console.warn(
              `Failed to fetch players for team ${match.localteam.name}:`,
              teamAPlayers.reason
            );
          }
          if (teamBPlayers.status === 'rejected') {
            console.warn(
              `Failed to fetch players for team ${match.visitorteam.name}:`,
              teamBPlayers.reason
            );
          }
        }

        // Fetch match details to get lineup
        try {
          await fetchMatchDetails(match.id);
        } catch (detailsError) {
          console.warn(
            `Failed to fetch details for match ${match.id}:`,
            detailsError
          );
        }
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
        continue;
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    // Return a more informative error object
    return {
      error: true,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };
  }
};

// Player Level Functions
export const fetchPlayerDetails = async (playerId: number) => {
  try {
    const url = buildApiUrl(`/players/${playerId}`, {
      include: 'team,country,position',
    });

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for player details:`, errorText);
      return null;
    }

    const data = await response.json();
    const player = data.data;

    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    // Use a transaction to ensure the team exists before creating the player
    await prisma.$transaction(async (tx) => {
      // 1. Ensure team exists if available
      if (player.team?.id) {
        const team = await tx.team.findUnique({
          where: { sportMonkId: player.team.id.toString() },
        });

        if (!team) {
          console.log(`Team ${player.team.id} not found, creating it first...`);
          await tx.team.create({
            data: {
              id: player.team.id.toString(),
              sportMonkId: player.team.id.toString(),
              name: player.team.name || 'Unknown Team',
              shortName: player.team.code || '',
              image: player.team.image_path || '',
              country: '',
              isActive: true,
            },
          });
        }
      }

      // 2. Create player with guaranteed team reference
      await tx.player.upsert({
        where: { sportMonkId: player.id?.toString() || '' },
        update: {
          name: player.fullname || 'Unknown Player',
          image: player.image_path || '',
          country: player.country?.id?.toString() || '',
          teamId: player.team?.id?.toString() || '',
          teamName: player.team?.name || 'Unknown Team',
          role: (player.position?.name || 'unknown').toLowerCase(),
          battingStyle: player.batting_style || '',
          bowlingStyle: player.bowling_style || '',
          isActive: true,
        },
        create: {
          id: player.id?.toString() || '',
          sportMonkId: player.id?.toString() || '',
          name: player.fullname || 'Unknown Player',
          image: player.image_path || '',
          country: player.country?.id?.toString() || '',
          teamId: player.team?.id?.toString() || '',
          teamName: player.team?.name || 'Unknown Team',
          role: (player.position?.name || 'unknown').toLowerCase(),
          battingStyle: player.batting_style || '',
          bowlingStyle: player.bowling_style || '',
          isActive: true,
        },
      });
    });

    return data;
  } catch (error) {
    console.error(
      `Error fetching player details for player ${playerId}:`,
      error
    );
    throw error;
  }
};
