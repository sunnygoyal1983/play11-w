import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * This endpoint cleans up duplicate contest win transactions in the database
 * It finds all cases where multiple transactions exist for the same contest win
 * and keeps only the first one, deleting the rest
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

    // Get all contest win transactions with their references
    const contestWinTransactions = await prisma.transaction.findMany({
      where: {
        type: 'contest_win',
        status: 'completed',
      },
      orderBy: {
        createdAt: 'asc', // Get oldest first so we keep those
      },
    });

    console.log(
      `Found ${contestWinTransactions.length} total contest win transactions`
    );

    // Before grouping, let's analyze the transactions for debugging
    contestWinTransactions.forEach((tx) => {
      console.log(
        `Transaction ID: ${tx.id}, Amount: ${tx.amount}, Reference: ${tx.reference}, Date: ${tx.createdAt}`
      );
    });

    // Group transactions that are EXACT duplicates (same user, same reference, same amount, same day)
    // This prevents legitimate separate contest wins from being treated as duplicates
    const transactionsByUniqueKey = new Map<string, string[]>();

    for (const transaction of contestWinTransactions) {
      if (!transaction.reference) continue;

      // Extract the date part (YYYY-MM-DD) from the createdAt timestamp for grouping by day
      const txDate = new Date(transaction.createdAt)
        .toISOString()
        .split('T')[0];

      // Create a unique key that includes all identifying factors of a unique contest win
      // Including amount ensures we don't remove wins from different contests with similar names
      const uniqueKey = `${transaction.userId}:${transaction.reference}:${transaction.amount}:${txDate}`;

      if (!transactionsByUniqueKey.has(uniqueKey)) {
        transactionsByUniqueKey.set(uniqueKey, []);
      }

      transactionsByUniqueKey.get(uniqueKey)?.push(transaction.id);
    }

    // Find duplicates (any group with more than 1 transaction)
    const duplicateGroups: { reference: string; transactionIds: string[] }[] =
      [];

    Array.from(transactionsByUniqueKey.entries()).forEach(
      ([uniqueKey, transactionIds]) => {
        if (transactionIds.length > 1) {
          const [userId, reference, amount, date] = uniqueKey.split(':');
          console.log(
            `Found ${transactionIds.length} duplicates for ${reference} (${amount}) on ${date}`
          );

          // Keep the first transaction (oldest), mark the rest for deletion
          duplicateGroups.push({
            reference: reference,
            transactionIds: transactionIds.slice(1), // Skip the first one (keep it)
          });
        }
      }
    );

    console.log(
      `Found ${duplicateGroups.length} groups with duplicate transactions`
    );

    // Count total duplicates
    const totalDuplicates = duplicateGroups.reduce(
      (sum, group) => sum + group.transactionIds.length,
      0
    );

    console.log(`Total duplicate transactions to remove: ${totalDuplicates}`);

    if (totalDuplicates === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicate transactions found',
        duplicatesRemoved: 0,
      });
    }

    // Delete all duplicate transactions
    const deleteResult = await prisma.transaction.deleteMany({
      where: {
        id: {
          in: duplicateGroups.flatMap((group) => group.transactionIds),
        },
      },
    });

    console.log(`Deleted ${deleteResult.count} duplicate transactions`);

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully removed ${deleteResult.count} duplicate transactions`,
      duplicatesRemoved: deleteResult.count,
      duplicateGroups: duplicateGroups.map((group) => ({
        reference: group.reference,
        count: group.transactionIds.length,
      })),
    });
  } catch (error) {
    console.error('Error cleaning up duplicate transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clean up duplicate transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
