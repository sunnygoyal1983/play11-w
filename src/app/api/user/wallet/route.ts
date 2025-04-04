import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to view your wallet' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user's wallet data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
        kycVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's transaction history
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate deposit, winnings, and bonus
    let depositedAmount = 0;
    let winnings = 0;
    let bonus = 0;

    transactions.forEach((transaction) => {
      if (
        transaction.type === 'deposit' &&
        transaction.status === 'completed'
      ) {
        depositedAmount += transaction.amount;
      } else if (
        transaction.type === 'contest_win' &&
        transaction.status === 'completed'
      ) {
        winnings += transaction.amount;
      } else if (
        transaction.type === 'bonus' &&
        transaction.status === 'completed'
      ) {
        bonus += transaction.amount;
      }
    });

    return NextResponse.json({
      totalBalance: user.walletBalance,
      depositedAmount,
      winnings,
      bonus,
      kycVerified: user.kycVerified,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}
