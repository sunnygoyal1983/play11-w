import { NextResponse } from 'next/server';
import { buildApiUrl, rateLimitedFetch } from '@/services/sportmonk/utils';

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.SPORTMONK_API_KEY) {
      return NextResponse.json(
        {
          error: true,
          message:
            'SportMonk API key is not configured in environment variables',
        },
        { status: 500 }
      );
    }

    // Test API connection with a simple request
    const url = buildApiUrl('/leagues', {
      per_page: '1', // Only request 1 league for a quick test
    });
    console.log(
      'Testing API connection with URL:',
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
      return NextResponse.json(
        {
          error: true,
          message: `API request failed with status: ${response.status}`,
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'SportMonk API connection successful',
      data,
    });
  } catch (error) {
    console.error('Error testing API connection:', error);
    return NextResponse.json(
      {
        error: true,
        message: 'Failed to test API connection',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
