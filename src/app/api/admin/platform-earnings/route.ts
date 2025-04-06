import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get query parameters for time range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate') as string)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate') as string)
      : undefined;

    // Build date filter if provided
    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = startDate;
      }
      if (endDate) {
        dateFilter.createdAt.lte = endDate;
      }
    }

    // Calculate total deposits (positive)
    const deposits = await prisma.transaction.aggregate({
      where: {
        type: 'deposit',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total withdrawals (negative)
    const withdrawals = await prisma.transaction.aggregate({
      where: {
        type: 'withdrawal',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total contest entries (amounts paid by users, negative)
    const contestEntries = await prisma.transaction.aggregate({
      where: {
        type: 'contest_join',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total contest winnings paid out (negative)
    const contestWinnings = await prisma.transaction.aggregate({
      where: {
        type: 'contest_win',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate bonuses given to users (negative)
    const bonuses = await prisma.transaction.aggregate({
      where: {
        type: 'bonus',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate refunds given to users (negative)
    const refunds = await prisma.transaction.aggregate({
      where: {
        type: 'refund',
        status: 'completed',
        ...dateFilter,
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total users with active wallets
    const activeUsersCount = await prisma.user.count({
      where: {
        walletBalance: {
          gt: 0,
        },
      },
    });

    // Calculate total user wallet balances
    const totalUserBalance = await prisma.user.aggregate({
      _sum: {
        walletBalance: true,
      },
    });

    // Calculate platform revenue
    const totalDeposits = deposits._sum.amount || 0;
    const totalWithdrawals = Math.abs(withdrawals._sum.amount || 0);
    const totalContestEntries = Math.abs(contestEntries._sum.amount || 0);
    const totalContestWinnings = contestWinnings._sum.amount || 0;
    const totalBonuses = bonuses._sum.amount || 0;
    const totalRefunds = Math.abs(refunds._sum.amount || 0);

    // Platform commission is entry fees minus winnings paid out
    const platformCommission = totalContestEntries - totalContestWinnings;

    // Current platform liability is the sum of all user wallet balances
    const platformLiability = totalUserBalance._sum.walletBalance || 0;

    // Net platform earnings - corrected to only include platform commission
    const netPlatformEarnings = platformCommission;

    // Calculate theoretical balance (what the platform should have)
    const theoreticalBalance =
      totalDeposits - totalWithdrawals - platformLiability;

    // Count unique users who made transactions
    const uniqueUsers = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        status: 'completed',
        ...dateFilter,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDeposits,
          totalWithdrawals,
          totalContestEntries,
          totalContestWinnings,
          totalBonuses,
          totalRefunds,
          platformCommission,
          netPlatformEarnings,
          platformLiability,
          theoreticalBalance,
        },
        userMetrics: {
          uniqueTransactingUsers: uniqueUsers.length,
          activeWalletUsers: activeUsersCount,
          averageWalletBalance:
            activeUsersCount > 0 ? platformLiability / activeUsersCount : 0,
        },
        period: {
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating platform earnings:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate platform earnings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
