import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Rate limiting configuration
export const API_RATE_LIMIT = {
  requestDelay: 1000, // 1 second between requests
  maxRetries: 3,
  backoffFactor: 2,
};

// Helper function to sleep
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// API URL Builder with Enhanced Logging
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | undefined>
): string {
  if (!process.env.SPORTMONK_API_KEY) {
    console.error('CRITICAL: Cricket API token is not configured');
    throw new Error('Cricket API token is not configured');
  }

  console.log(
    'Using API key length:',
    process.env.SPORTMONK_API_KEY.length,
    'Last 4 chars:',
    process.env.SPORTMONK_API_KEY.slice(-4)
  );

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

// Enhanced fetch function with rate limiting and retries
export async function rateLimitedFetch(
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

      // Make request using global fetch
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        },
      });

      // Handle rate limit response
      const retryAfter = response.headers.get('retry-after');
      if (response.status === 429 && retryAfter) {
        const waitTime =
          parseInt(retryAfter) * 1000 || API_RATE_LIMIT.requestDelay;
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

// Get date range for match filtering
export const getDateRange = (daysBack = 0) => {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 30);

  const startDate = new Date();
  if (daysBack > 0) {
    startDate.setDate(today.getDate() - daysBack);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

// Log API request with masked API key
export const logApiRequest = (url: string) => {
  console.log(
    'Making API request to:',
    url.replace(process.env.SPORTMONK_API_KEY || '', '***')
  );
};

// Export prisma for use in all services
export { prisma };

/**
 * Fetch players for a specific season in a tournament
 * This is helpful when we need to get current players for a league in this season
 */
export async function fetchSeasonPlayers(
  seasonId: string,
  page = 1,
  perPage = 100
) {
  try {
    if (!seasonId) {
      throw new Error('Season ID is required to fetch season players');
    }

    console.log(`Fetching players for season ${seasonId}`);

    const url = buildApiUrl('/squads/season', {
      filter: `season_id:${seasonId}`,
      include: 'team,player',
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
      console.error(`API Error Response for season players:`, errorText);
      throw new Error(
        `Failed to fetch season players: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      `Received ${data.data?.length || 0} squads for season ${seasonId}`
    );
    return data;
  } catch (error) {
    console.error(`Error fetching players for season ${seasonId}:`, error);
    throw error;
  }
}
