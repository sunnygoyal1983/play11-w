import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log(
      '[DEBUG] Starting cleanup of duplicate contest_win transactions'
    );

    // Get all contest_win transactions
    const contestWinTransactions = await prisma.transaction.findMany({
      where: {
        type: 'contest_win',
      },
      orderBy: {
        createdAt: 'asc', // Keep the oldest transaction for each entry
      },
    });

    console.log(
      `[DEBUG] Found ${contestWinTransactions.length} total contest_win transactions`
    );

    // Track which entries we've seen (entryId -> transactionId)
    const processedEntries = new Map();
    const duplicateTransactionIds: string[] = [];

    // First pass: identify duplicates
    for (const tx of contestWinTransactions) {
      try {
        // Extract entryId from metadata
        let entryId = null;
        if (tx.metadata) {
          const metadata =
            typeof tx.metadata === 'string'
              ? JSON.parse(tx.metadata as string)
              : tx.metadata;

          entryId = metadata?.entryId;
        }

        // If no entryId, we can't determine if it's a duplicate, so skip
        if (!entryId) {
          console.log(
            `[DEBUG] Transaction ${tx.id} has no entryId in metadata, skipping`
          );
          continue;
        }

        // If we've seen this entryId before, it's a duplicate
        if (processedEntries.has(entryId)) {
          console.log(
            `[DEBUG] Found duplicate transaction ${tx.id} for entry ${entryId}`
          );
          duplicateTransactionIds.push(tx.id);
        } else {
          // First time seeing this entryId, record it
          processedEntries.set(entryId, tx.id);
        }
      } catch (error) {
        console.error(`[DEBUG] Error processing transaction ${tx.id}:`, error);
      }
    }

    console.log(
      `[DEBUG] Found ${duplicateTransactionIds.length} duplicate transactions to remove`
    );

    if (duplicateTransactionIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicate transactions found',
      });
    }

    // Get the detailed duplicate transaction info for the response
    const duplicates = contestWinTransactions.filter((tx) =>
      duplicateTransactionIds.includes(tx.id)
    );

    // Second pass: for each duplicate, get the user and amount to adjust wallet balance
    const adjustments = [];
    for (const txId of duplicateTransactionIds) {
      const tx = contestWinTransactions.find((t) => t.id === txId);
      if (tx) {
        adjustments.push({
          userId: tx.userId,
          amount: -tx.amount, // Negative to reverse the transaction
          transactionId: tx.id,
        });
      }
    }

    // Get query parameter to determine if we should execute the fixes or just report
    const executeParam = request.nextUrl.searchParams.get('execute');
    const shouldExecute = executeParam === 'true';

    if (!shouldExecute) {
      return NextResponse.json({
        success: true,
        message: 'Found duplicate transactions (preview mode)',
        duplicateCount: duplicateTransactionIds.length,
        duplicates: duplicates.map((d) => ({
          id: d.id,
          userId: d.userId,
          amount: d.amount,
          createdAt: d.createdAt,
        })),
        executeUrl: `${request.nextUrl.pathname}?execute=true`,
      });
    }

    // Process wallet balance adjustments and delete transactions
    console.log(
      `[DEBUG] Processing ${adjustments.length} wallet balance adjustments...`
    );
    const results = [];

    for (const adjustment of adjustments) {
      try {
        // Adjust wallet balance
        await prisma.user.update({
          where: { id: adjustment.userId },
          data: {
            walletBalance: {
              increment: adjustment.amount, // This will subtract the amount
            },
          },
        });

        // Delete the transaction
        await prisma.transaction.delete({
          where: { id: adjustment.transactionId },
        });

        console.log(
          `[DEBUG] Removed duplicate transaction ${adjustment.transactionId} and adjusted user ${adjustment.userId} balance by ${adjustment.amount}`
        );

        results.push({
          status: 'success',
          transactionId: adjustment.transactionId,
          userId: adjustment.userId,
          adjustment: adjustment.amount,
        });
      } catch (error) {
        console.error(
          `[DEBUG] Error removing transaction ${adjustment.transactionId}:`,
          error
        );

        results.push({
          status: 'error',
          transactionId: adjustment.transactionId,
          userId: adjustment.userId,
          adjustment: adjustment.amount,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('[DEBUG] Duplicate removal process completed');

    return NextResponse.json({
      success: true,
      message: 'Duplicate transactions removed',
      totalDuplicates: duplicateTransactionIds.length,
      results,
    });
  } catch (error) {
    console.error('[DEBUG] Error in duplicate removal process:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process duplicate transactions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
