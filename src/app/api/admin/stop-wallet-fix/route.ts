import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stopWalletFixScheduler } from '@/services/wallet-fix-scheduler';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Stop the scheduler
    stopWalletFixScheduler();

    return NextResponse.json({
      success: true,
      message: 'Wallet fix scheduler stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping wallet fix scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop wallet fix scheduler',
      },
      { status: 500 }
    );
  }
}
