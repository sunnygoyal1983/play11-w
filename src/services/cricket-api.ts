import { env } from '../../env.mjs';
import { MatchStatus, PlayerRole } from '@prisma/client';

// Comprehensive logging function
function logCricketApiDetails() {
  /* console.log('Cricket API Configuration:');
  console.log('---------------------');
  console.log('API Base URL:', 'https://cricket.sportmonks.com/api/v2.0');
  console.log('API Token Present:', !!process.env.CRICKET_API_TOKEN);
  console.log('API Token Length:', process.env.CRICKET_API_TOKEN?.length);
  console.log('API Token First 4 chars:', process.env.CRICKET_API_TOKEN?.slice(0, 4));
  console.log('Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Available Env Vars with CRICKET:', 
    Object.keys(process.env).filter(key => key.includes('CRICKET'))
  );*/
}

// Interfaces (kept from previous implementation)
interface Player {
  id: string;
  name: string;
  team: string;
  role: PlayerRole;
  points: number;
  form: number;
  price: number;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: string;
  externalId: string;
  stats: {
    matches?: number;
    runs?: number;
    wickets?: number;
    average?: number;
    strikeRate?: number;
  };
}

interface Team {
  teamId: string;
  name: string;
  players: Player[];
}

interface Match {
  id: string;
  name: string;
  startTime: string;
  format: string;
  venue: string;
  status: MatchStatus;
  teams: Team[];
  score?: {
    team1Score?: string;
    team2Score?: string;
    currentOver?: number;
    commentary?: string;
  };
}

// API Response Interfaces
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

interface FixtureResponse {
  id: number;
  name?: string;
  starting_at: string;
  type: string;
  status: string;
  venue?: { name: string };
  localteam: { id: number; name: string };
  visitorteam: { id: number; name: string };
  localteam_id: number;
  visitorteam_id: number;
  lineup?: TeamSquadMember[];
}

// Team Squad Member interface to provide type safety
interface TeamSquadMember {
  player: {
    id: number;
    fullname: string;
    firstname?: string;
    lastname?: string;
    team?: { name: string };
    position?: { name: string };
    batting?: { style?: string };
    bowling?: { style?: string };
    country?: { name?: string };
    stats?: {
      matches?: number;
      runs?: number;
      wickets?: number;
      average?: number;
      strike_rate?: number;
    };
  };
  team_id: number;
  type?: string;
  position?: string;
}

// Mapping function for role
function mapPlayerRole(role?: string): PlayerRole {
  const normalizedRole = role?.toLowerCase().trim();

  switch (normalizedRole) {
    case 'batsman':
    case 'bat':
      return PlayerRole.BATSMAN;
    case 'bowler':
    case 'bowl':
      return PlayerRole.BOWLER;
    case 'allrounder':
    case 'all-rounder':
    case 'all rounder':
      return PlayerRole.ALL_ROUNDER;
    case 'wicketkeeper':
    case 'wicket-keeper':
    case 'keeper':
      return PlayerRole.WICKET_KEEPER;
    default:
      return PlayerRole.BATSMAN;
  }
}

// Utility Functions
function mapMatchStatus(status: string | undefined): MatchStatus {
  // Ensure we have a default value if MatchStatus is somehow undefined
  const UPCOMING = MatchStatus?.UPCOMING || 'UPCOMING';
  const LIVE = MatchStatus?.LIVE || 'LIVE';
  const COMPLETED = MatchStatus?.COMPLETED || 'COMPLETED';

  const statusMap: Record<string, MatchStatus> = {
    '0': UPCOMING,
    '1': UPCOMING,
    NS: UPCOMING,
    LIVE: LIVE,
    FT: COMPLETED,
    Finished: COMPLETED,
  };

  // Use the mapped status if available, otherwise default to UPCOMING
  const statusKey = String(status)?.toUpperCase() || '';
  return statusMap[statusKey] || UPCOMING;
}

// API URL Builder with Enhanced Logging
function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): string {
  if (!process.env.CRICKET_API_TOKEN) {
    console.error('CRITICAL: Cricket API token is not configured');
    throw new Error('Cricket API token is not configured');
  }

  const url = new URL(`https://cricket.sportmonks.com/api/v2.0${endpoint}`);

  // Add API token
  url.searchParams.append('api_token', process.env.CRICKET_API_TOKEN);

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
    url.toString().replace(process.env.CRICKET_API_TOKEN, '***')
  );
  return url.toString();
}

// Date Range Utility with Detailed Logging
function getDateRange(days: number = 30): {
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

  const startDate = formatDate(pastDate);
  const endDate = formatDate(futureDate);

  console.log('Date Range Details:');
  console.log('Past Date:', startDate);
  console.log('Future Date:', endDate);
  console.log('Days Range:', days);

  return { startDate, endDate };
}

// Add new function to fetch team lineup for a specific fixture
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

async function fetchFixtureLineup(
  fixtureId: string
): Promise<{ localTeam: Player[]; visitorTeam: Player[] }> {
  try {
    const apiUrl = buildApiUrl(`/fixtures/${fixtureId}`, {
      include: 'lineup,batting,bowling',
    });

    console.log(`Fetching lineup data for fixture ${fixtureId}`);

    const response = await rateLimitedFetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.CRICKET_API_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<FixtureResponse>;
    console.log('Lineup API Response:', data);

    if (!data?.data?.lineup) {
      console.error('Invalid lineup data structure');
      return { localTeam: [], visitorTeam: [] };
    }

    const processPlayer = (player: TeamSquadMember['player']): Player => ({
      id: String(player.id),
      name: player.fullname || `${player.firstname} ${player.lastname}`,
      team: player.team?.name || 'Unknown',
      role: mapPlayerRole(player.position?.name),
      points: 0,
      form: 0,
      price: 8.5,
      battingStyle: player.batting?.style,
      bowlingStyle: player.bowling?.style,
      country: player.country?.name,
      externalId: String(player.id),
      stats: {
        matches: player.stats?.matches || 0,
        runs: player.stats?.runs || 0,
        wickets: player.stats?.wickets || 0,
        average: player.stats?.average || 0,
        strikeRate: player.stats?.strike_rate || 0,
      },
    });

    const lineup = data.data.lineup;
    const localTeamPlayers = lineup
      .filter(
        (player: TeamSquadMember) => player.team_id === data.data.localteam_id
      )
      .map((player) => processPlayer(player.player));
    const visitorTeamPlayers = lineup
      .filter(
        (player: TeamSquadMember) => player.team_id === data.data.visitorteam_id
      )
      .map((player) => processPlayer(player.player));

    return { localTeam: localTeamPlayers, visitorTeam: visitorTeamPlayers };
  } catch (error) {
    console.error(`Error fetching lineup for fixture ${fixtureId}:`, error);
    return { localTeam: [], visitorTeam: [] };
  }
}

// Main API Functions
export async function getUpcomingMatches(): Promise<Match[]> {
  try {
    // Try to get data from cache first
    const cachedData = await readFromCache('upcoming_matches');
    if (cachedData) {
      console.log('Using cached upcoming matches data');
      return cachedData;
    }

    // Validate API Token
    if (!process.env.CRICKET_API_TOKEN) {
      console.error('CRITICAL: Cricket API token is not configured');
      return [];
    }

    // Get Date Range
    const { startDate, endDate } = getDateRange();

    // Construct API URL with valid parameters according to SportMonks API documentation
    const apiUrl = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,stage,lineup,batting,bowling',
      filter: `starting_between:${startDate},${endDate}`,
      sort: '-starting_at',
      fields:
        'id,name,starting_at,type,venue_id,status,localteam_id,visitorteam_id,lineup',
      per_page: '2',
    });

    // Fetch matches with detailed error handling
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.CRICKET_API_TOKEN}`,
      },
      cache: 'no-store',
    });

    // Log response details
    console.log('API Response Status:', response.status);
    console.log(
      'API Response Headers:',
      Object.fromEntries(response.headers.entries())
    );

    // Check response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Request Failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return [];
    }

    // Parse response
    const data = await response.json();

    // Validate data structure
    console.log('API Response Data:', {
      dataType: typeof data,
      dataKeys: Object.keys(data),
      dataLength: data?.data?.length || 0,
    });

    if (!data?.data || !Array.isArray(data.data)) {
      console.error('Invalid API response structure');
      return [];
    }

    // Process and transform matches with squad data
    const processedMatches: Match[] = [];
    for (const match of data.data) {
      if (!match.id || !match.localteam?.id || !match.visitorteam?.id) continue;

      // Fetch lineup for the match
      const { localTeam: localTeamPlayers, visitorTeam: visitorTeamPlayers } =
        await fetchFixtureLineup(String(match.id));

      const processedMatch: Match = {
        id: String(match.id),
        name:
          match.name || `${match.localteam.name} vs ${match.visitorteam.name}`,
        startTime: match.starting_at || new Date().toISOString(),
        format: match.type || 'unknown',
        venue: match.venue?.name || 'TBD',
        status: mapMatchStatus(match.status),
        teams: [
          {
            teamId: String(match.localteam.id),
            name: match.localteam.name,
            players: localTeamPlayers,
          },
          {
            teamId: String(match.visitorteam.id),
            name: match.visitorteam.name,
            players: visitorTeamPlayers,
          },
        ],
      };

      processedMatches.push(processedMatch);
    }

    // Log processed matches
    console.log('Processed Matches:');
    processedMatches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        id: match.id,
        name: match.name,
        startTime: match.startTime,
        venue: match.venue,
        status: match.status,
        teams: match.teams.map((team) => ({
          name: team.name,
          playerCount: team.players.length,
        })),
      });
    });

    // Save the processed matches to cache
    await saveToCache('upcoming_matches', processedMatches);
    return processedMatches;
  } catch (error) {
    console.error('Unhandled error in getUpcomingMatches:', error);
    return [];
  }
}

// Function to fetch team details using the team's external ID
export async function fetchTeamDetails(
  teamId: string,
  seasonId?: string
): Promise<any> {
  try {
    console.log(
      `Fetching team details for team ID: ${teamId}, Season ID: ${
        seasonId || 'default'
      }`
    );

    // Validate API Token
    if (!process.env.CRICKET_API_TOKEN) {
      console.error('CRITICAL: Cricket API token is not configured');
      return null;
    }

    // Build API URL with the team's external ID
    const apiUrl = buildApiUrl(`/teams/${teamId}`, {
      include: 'squad',
      season: seasonId,
    });

    // Fetch team details
    const response = await rateLimitedFetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for team ${teamId}:`, errorText);
      return null;
    }

    const data = await response.json();

    if (!data?.data) {
      console.error('Invalid API response structure for team details');
      return null;
    }

    // Process and return team details
    const teamDetails = {
      id: teamId,
      name: data.data.name || 'Unknown Team',
      externalId: String(data.data.id),
      logo: data.data.image_path,
      country: data.data.country?.name,
      squad: data.data.squad || [],
    };

    console.log(`Successfully fetched team details for ${teamDetails.name}`);
    return teamDetails;
  } catch (error) {
    console.error(`Error fetching team details for team ID ${teamId}:`, error);
    return null;
  }
}

// Logging API Token Status
if (!process.env.CRICKET_API_TOKEN) {
  console.error(
    'CRITICAL: Cricket API token is not set in environment variables'
  );
  console.log(
    'Available env vars with CRICKET:',
    Object.keys(process.env).filter((key) => key.includes('CRICKET'))
  );
} else {
  console.log(
    'API Token loaded:',
    `${process.env.CRICKET_API_TOKEN.slice(
      0,
      4
    )}...${process.env.CRICKET_API_TOKEN.slice(-4)}`
  );
}

// Cache utility functions
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheItem<any>>();

async function readFromCache<T>(key: string): Promise<T | null> {
  const item = cache.get(key);
  if (!item) return null;

  // Check if cache is expired
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  // Type guard to ensure cached data matches expected type
  if (key === 'upcoming_matches') {
    const matches = item.data as Match[];
    if (
      Array.isArray(matches) &&
      matches.every(
        (match) =>
          typeof match === 'object' &&
          'id' in match &&
          'teams' in match &&
          Array.isArray(match.teams)
      )
    ) {
      return matches as T;
    }
    cache.delete(key);
    return null;
  }

  return item.data as T;
}

async function saveToCache<T>(key: string, data: T): Promise<void> {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}
