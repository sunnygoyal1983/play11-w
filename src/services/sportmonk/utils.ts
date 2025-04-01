import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// API configuration
const API_BASE_URL = 'https://cricket.sportmonks.com/api/v2.0';
const API_KEY = process.env.SPORTMONK_API_KEY;

// Rate limiting configuration
export const API_RATE_LIMIT = {
  requestDelay: 1000, // 1 second between requests
  maxRetries: 3,
  backoffFactor: 2,
};

// Helper function to sleep
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Build API URL with parameters
export const buildApiUrl = (
  endpoint: string,
  params: Record<string, string> = {}
) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // Add API key
  url.searchParams.append('api_token', API_KEY || '');

  // Add other parameters
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  return url.toString();
};

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
  console.log('Making API request to:', url.replace(API_KEY || '', '***'));
};

// Export prisma for use in all services
export { prisma };
