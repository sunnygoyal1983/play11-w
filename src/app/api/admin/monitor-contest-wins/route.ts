import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET - Monitor all failed contest win transactions
 * Returns a list of failed contest win transactions that were logged in the settings table
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Find all failed contest win errors in the settings table
    const failedTransactions = await prisma.setting.findMany({
      where: {
        key: {
          contains: 'failed_contest_win_',
        },
        category: 'error_log',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Parse the JSON data stored in the value field
    const parsedFailures = failedTransactions.map((record) => {
      try {
        const data = JSON.parse(record.value);
        return {
          id: record.id,
          key: record.key,
          data,
          createdAt: record.createdAt,
        };
      } catch (e) {
        return {
          id: record.id,
          key: record.key,
          data: { error: 'Failed to parse JSON' },
          createdAt: record.createdAt,
        };
      }
    });

    return NextResponse.json({
      success: true,
      failedTransactions: parsedFailures,
      count: parsedFailures.length,
    });
  } catch (error) {
    console.error('Error fetching failed contest wins:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch failed contest wins',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Retry a failed contest win transaction or delete the error record
 */
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

    const body = await request.json();
    const { action, id } = body;

    // Find the error record
    const errorRecord = await prisma.setting.findUnique({
      where: { id },
    });

    if (!errorRecord) {
      return NextResponse.json(
        { error: 'Error record not found' },
        { status: 404 }
      );
    }

    // Parse the transaction data
    let transactionData;
    try {
      transactionData = JSON.parse(errorRecord.value);
    } catch (e) {
      return NextResponse.json(
        { error: 'Failed to parse error record data' },
        { status: 400 }
      );
    }

    if (action === 'retry') {
      // Create the missing transaction
      await prisma.transaction.create({
        data: {
          userId: transactionData.userId,
          amount: transactionData.winAmount || 0,
          type: 'contest_win',
          status: 'completed',
          reference: `Contest Win: Manual Retry - Rank ${transactionData.rank}`,
        },
      });

      // Update user wallet balance
      await prisma.user.update({
        where: { id: transactionData.userId },
        data: {
          walletBalance: {
            increment: transactionData.winAmount || 0,
          },
        },
      });

      // Update the error record to mark it as processed
      await prisma.setting.update({
        where: { id },
        data: {
          value: JSON.stringify({
            ...transactionData,
            processed: true,
            processedAt: new Date().toISOString(),
            processedBy: session.user.email,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Transaction successfully retried',
        userId: transactionData.userId,
        amount: transactionData.winAmount,
      });
    } else if (action === 'delete') {
      // Delete the error record
      await prisma.setting.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Error record deleted',
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing failed contest win:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process contest win',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
