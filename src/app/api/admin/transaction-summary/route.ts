import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * This endpoint provides a summary of transactions by user
 * Focusing on contest wins and showing detailed breakdowns
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type') || 'contest_win';

    // Base query for transactions
    let query: any = {
      where: {
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    };

    // Add filters if provided
    if (userId) {
      query.where.userId = userId;
    }

    if (type) {
      query.where.type = type;
    }

    // Get total transactions
    const totalTransactions = await prisma.transaction.count({
      where: query.where,
    });

    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      ...query,
      take: limit,
    });

    // Get summary data by user
    const rawUserSummaries = await prisma.$queryRaw<
      Array<{
        userId: string;
        name: string;
        email: string;
        totalWins: bigint;
        totalWinAmount: bigint;
        totalContestJoins: bigint;
        totalContestJoinAmount: bigint;
      }>
    >`
      SELECT 
        u.id as "userId", 
        u.name, 
        u.email,
        COUNT(CASE WHEN t.type = 'contest_win' THEN 1 END) as "totalWins",
        SUM(CASE WHEN t.type = 'contest_win' THEN t.amount ELSE 0 END) as "totalWinAmount",
        COUNT(CASE WHEN t.type = 'contest_join' THEN 1 END) as "totalContestJoins",
        SUM(CASE WHEN t.type = 'contest_join' THEN ABS(t.amount) ELSE 0 END) as "totalContestJoinAmount"
      FROM "User" u
      LEFT JOIN "Transaction" t ON u.id = t."userId" AND t.status = 'completed'
      GROUP BY u.id, u.name, u.email
      ORDER BY "totalWinAmount" DESC
      LIMIT 20
    `;

    // Convert BigInt values to numbers for proper JSON serialization
    const userSummaries = rawUserSummaries.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      totalWins: Number(user.totalWins),
      totalWinAmount: Number(user.totalWinAmount) || 0,
      totalContestJoins: Number(user.totalContestJoins),
      totalContestJoinAmount: Number(user.totalContestJoinAmount) || 0,
    }));

    // Group transactions by date (YYYY-MM-DD) for the contest win time series
    const dateTransactions: Record<string, number> = {};
    const contestWins = transactions.filter((tx) => tx.type === 'contest_win');

    for (const tx of contestWins) {
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];

      if (!dateTransactions[dateKey]) {
        dateTransactions[dateKey] = 0;
      }

      dateTransactions[dateKey] += tx.amount;
    }

    // Convert to array and sort by date
    const winningsByDate = Object.entries(dateTransactions)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      total: totalTransactions,
      transactions,
      userSummaries,
      winningsByDate,
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transaction summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
