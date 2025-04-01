// API URL Builder with Enhanced Logging
export function buildApiUrl(
  endpoint: string,
  params: Record<string, string> = {}
): string {
  const baseUrl =
    process.env.SPORTMONK_API_URL || 'https://cricket.sportmonk.com/api/v2.0';
  const apiKey = process.env.SPORTMONK_API_KEY;

  if (!apiKey) {
    throw new Error('SPORTMONK_API_KEY is not set');
  }

  // Add API key to params
  const queryParams = new URLSearchParams({
    api_token: apiKey,
    ...params,
  });

  const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;
  console.log(`Building API URL: ${url}`);
  return url;
}

// Date Range Helper
export function getDateRange() {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 10);

  return {
    startDate: today.toISOString().split('T')[0],
    endDate: futureDate.toISOString().split('T')[0],
  };
}
