import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// POST /api/admin/users/:id/wallet - Add or withdraw wallet funds
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is logged in and is an admin
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const data = await request.json();

    // Validate the data
    if (!data.amount || data.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!['deposit', 'withdrawal'].includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For withdrawals, check if there is enough balance
    if (data.type === 'withdrawal' && user.walletBalance < data.amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Update user's wallet balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            [data.type === 'deposit' ? 'increment' : 'decrement']: data.amount,
          },
        },
      });

      // Create a transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          amount: data.amount,
          type: data.type,
          status: 'completed',
          reference:
            data.reference ||
            `Admin ${data.type} by ${session.user.name || session.user.email}`,
        },
      });

      return { user: updatedUser, transaction };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing wallet transaction:', error);
    return NextResponse.json(
      { error: 'Failed to process wallet transaction' },
      { status: 500 }
    );
  }
}
