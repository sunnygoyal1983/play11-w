import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initLiveMatchScheduler } from '@/services/live-match-scheduler';

// Track if scheduler is already running
let schedulerRunning = false;

/**
 * POST /api/cron/start-live-scoring
 * Starts the live match scoring system
 * Can be triggered by automated cron jobs or manually by an admin
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication if not a cron job
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.role === 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Don't start if already running
    if (schedulerRunning) {
      return NextResponse.json({
        success: true,
        message: 'Live scoring system is already running',
      });
    }

    // Initialize the scheduler
    const success = await initLiveMatchScheduler();

    if (success) {
      schedulerRunning = true;
      return NextResponse.json({
        success: true,
        message: 'Live scoring system started successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to start live scoring system',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error starting live scoring system:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/start-live-scoring
 * Checks if the live scoring system is running
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      running: schedulerRunning,
    });
  } catch (error) {
    console.error('Error checking live scoring system status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
