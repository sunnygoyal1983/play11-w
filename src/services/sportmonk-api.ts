import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.SPORTMONK_API_KEY;
const API_URL =
  process.env.SPORTMONK_API_URL || 'https://cricket.sportmonk.com/api/v2.0';

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

export const fetchUpcomingMatches = async (page = 1, perPage = 10) => {
  try {
    // Calculate date range (today to 10 days from now)
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 10);

    // Format dates as YYYY-MM-DD
    const startDate = today.toISOString().split('T')[0];
    const endDate = futureDate.toISOString().split('T')[0];

    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league',
      filter: `starting_at:${startDate}...${endDate}`,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Store matches in database
    const matches = data.data;
    for (const match of matches) {
      try {
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
          },
        });

        // Fetch and store players for both teams
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

        // Fetch match details to get lineup and create match players
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
        continue; // Continue with next match if one fails
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    throw error;
  }
};

export const fetchLiveMatches = async (page = 1, perPage = 10) => {
  try {
    const url = buildApiUrl('/livescores', {
      include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling',
      filter: 'status:LIVE',
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Store live matches in database
    const matches = data.data;
    for (const match of matches) {
      await prisma.match.update({
        where: { sportMonkId: match.id?.toString() || '' },
        data: {
          status: 'live',
          result: `${match.runs?.[0]?.score || 0}/${
            match.runs?.[0]?.wickets || 0
          } vs ${match.runs?.[1]?.score || 0}/${match.runs?.[1]?.wickets || 0}`,
        },
      });

      // Update player statistics
      if (match.batting) {
        for (const batsman of match.batting) {
          await prisma.playerStatistic.create({
            data: {
              matchId: match.id?.toString() || '',
              playerId: batsman.player_id?.toString() || '',
              runs: batsman.score || 0,
              balls: batsman.ball || 0,
              fours: batsman.four_x || 0,
              sixes: batsman.six_x || 0,
              strikeRate: batsman.rate || 0,
            },
          });
        }
      }

      if (match.bowling) {
        for (const bowler of match.bowling) {
          await prisma.playerStatistic.create({
            data: {
              matchId: match.id?.toString() || '',
              playerId: bowler.player_id?.toString() || '',
              overs: bowler.overs || 0,
              maidens: bowler.medians || 0,
              runs: bowler.runs || 0,
              wickets: bowler.wickets || 0,
              economy: bowler.rate || 0,
            },
          });
        }
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

export const fetchRecentMatches = async (page = 1, perPage = 10) => {
  try {
    // Calculate date range (7 days ago to today)
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);

    // Format dates as YYYY-MM-DD
    const startDate = pastDate.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league,runs',
      filter: `status:Finished,starting_at:${startDate}...${endDate}`,
      sort: '-starting_at',
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Store completed matches in database
    const matches = data.data;
    for (const match of matches) {
      await prisma.match.update({
        where: { sportMonkId: match.id?.toString() || '' },
        data: {
          status: 'completed',
          endTime: new Date(),
          result: `${match.runs?.[0]?.score || 0}/${match.runs?.[0]?.wickets || 0} vs ${match.runs?.[1]?.score || 0}/${match.runs?.[1]?.wickets || 0}`,
        },
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }
};

export const fetchMatchDetails = async (matchId: number) => {
  try {
    const url = buildApiUrl(`/fixtures/${matchId}`, {
      include:
        'localteam,visitorteam,venue,league,scoreboards,batting,bowling,lineup,runs,manofmatch',
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const match = data.data;

    // Store match players
    if (match.lineup) {
      for (const player of match.lineup) {
        // Store player information
        await prisma.player.upsert({
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

        // Create match player entry
        await prisma.matchPlayer.upsert({
          where: {
            matchId_playerId: {
              matchId: match.id?.toString() || '',
              playerId: player.id?.toString() || '',
            },
          },
          update: {
            teamId: player.team_id?.toString() || '',
            selected: true,
          },
          create: {
            matchId: match.id?.toString() || '',
            playerId: player.id?.toString() || '',
            teamId: player.team_id?.toString() || '',
            selected: true,
          },
        });
      }
    }

    return data;
  } catch (error) {
    console.error(`Error fetching match details for match ${matchId}:`, error);
    throw error;
  }
};

export const fetchPlayerDetails = async (playerId: number) => {
  try {
    const url = buildApiUrl(`/players/${playerId}`, {
      include: 'country,career,teams,currentteams',
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const player = data.data;

    // Update player information in database
    await prisma.player.upsert({
      where: { sportMonkId: player.id.toString() },
      update: {
        name: player.fullname,
        image: player.image_path,
        country: player.country.id.toString(),
        teamId:
          player.currentteams?.[0]?.id.toString() ||
          player.teams?.[0]?.id.toString(),
        teamName: player.currentteams?.[0]?.name || player.teams?.[0]?.name,
        role: player.position.name.toLowerCase(),
        battingStyle: player.batting_style,
        bowlingStyle: player.bowling_style,
      },
      create: {
        id: player.id.toString(),
        sportMonkId: player.id.toString(),
        name: player.fullname,
        image: player.image_path,
        country: player.country.id.toString(),
        teamId:
          player.currentteams?.[0]?.id.toString() ||
          player.teams?.[0]?.id.toString(),
        teamName: player.currentteams?.[0]?.name || player.teams?.[0]?.name,
        role: player.position.name.toLowerCase(),
        battingStyle: player.batting_style,
        bowlingStyle: player.bowling_style,
      },
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

export const fetchTeamPlayers = async (teamId: number) => {
  try {
    const url = buildApiUrl(`/teams/${teamId}`, {
      include: 'squad',
    });

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `Failed to fetch team ${teamId} data. Status: ${response.status}`
      );
      // Return early without throwing error to allow the app to continue
      return null;
    }
    const data = await response.json();

    const team = data.data;
    if (!team || !team.squad) {
      console.warn(`No squad data available for team ${teamId}`);
      return null;
    }

    // Store team players in database
    for (const player of team.squad) {
      if (!player.id) {
        console.warn('Skipping player with missing ID');
        continue;
      }

      try {
        await prisma.player.upsert({
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
        // Continue with next player if one fails
        continue;
      }
    }

    return data;
  } catch (error) {
    console.error(`Error fetching team players for team ${teamId}:`, error);
    // Return null instead of throwing to prevent cascade failures
    return null;
  }
};
