import { NextRequest, NextResponse } from 'next/server';
import { monitorPrizeDistribution } from '@/services/prize-monitor-service';

// This API route is designed to be called by a scheduled job (e.g., cron)
// It checks for contest entries that should have received prizes but didn't
export async function GET(req: NextRequest) {
  try {
    // Check for API key authentication (you should implement this for security)
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');
    const daysParam = url.searchParams.get('days');

    // Basic auth check - in production, use a secure API key
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Parse days parameter (default to 7 days if not provided)
    const days = daysParam ? parseInt(daysParam) : 7;

    console.log(
      `Running prize distribution monitoring for the last ${days} days`
    );

    // Run the monitoring process
    const result = await monitorPrizeDistribution(days);

    return NextResponse.json({
      success: true,
      message: `Prize distribution monitoring completed. Found ${result.totalIssuesFound} issues across ${result.contestsWithIssues} contests.`,
      result,
    });
  } catch (error) {
    console.error('Error running prize distribution monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to run prize distribution monitoring' },
      { status: 500 }
    );
  }
}
