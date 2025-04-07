import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cron/force-fix-wallet
 * Directly runs a wallet transaction fix, bypassing the scheduler
 * This endpoint is for immediate execution in case scheduler is not working
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[FORCE-FIX-WALLET] Starting direct wallet transaction fix');

    // Find contest entries with winAmount > 0 and no transaction
    const winningEntries = await prisma.contestEntry.findMany({
      where: {
        winAmount: {
          gt: 0,
        },
      },
      include: {
        user: true,
        contest: true,
      },
    });

    console.log(
      `[FORCE-FIX-WALLET] Found ${winningEntries.length} winning entries`
    );

    // Get all existing contest win transactions
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        type: 'contest_win',
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    // Filter entries without transactions
    const entriesWithoutTransactions = winningEntries.filter((entry) => {
      // Skip if winAmount is null
      if (entry.winAmount === null) return false;

      // Check if a transaction exists for this entry
      return !existingTransactions.some((tx) => {
        try {
          const metadata = tx.metadata
            ? typeof tx.metadata === 'string'
              ? JSON.parse(tx.metadata)
              : tx.metadata
            : null;
          return metadata && metadata.entryId === entry.id;
        } catch (err) {
          console.error(
            `[FORCE-FIX-WALLET] Error checking transaction metadata:`,
            err
          );
          return false;
        }
      });
    });

    console.log(
      `[FORCE-FIX-WALLET] Found ${entriesWithoutTransactions.length} entries missing transactions`
    );

    // Create missing transactions
    const results = {
      fixedCount: 0,
      errors: 0,
      details: [] as Array<{
        entryId: string;
        userId?: string;
        amount?: number | null;
        transactionId?: string;
        status?: string;
        error?: string;
      }>,
    };

    for (const entry of entriesWithoutTransactions) {
      try {
        console.log(
          `[FORCE-FIX-WALLET] Processing entry ${entry.id} for user ${entry.userId}, amount ${entry.winAmount}`
        );

        // Skip entries without needed data or null winAmount
        if (!entry.user || !entry.contest || entry.winAmount === null) {
          console.log(
            `[FORCE-FIX-WALLET] Missing user, contest data, or null winAmount for entry ${entry.id}`
          );
          results.errors++;
          results.details.push({
            entryId: entry.id,
            error: 'Missing user, contest data, or null winAmount',
          });
          continue;
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            userId: entry.userId,
            amount: entry.winAmount,
            type: 'contest_win',
            status: 'completed',
            reference: `Contest Win: ${entry.contest.name} - Entry ${entry.id}`,
            metadata: {
              contestId: entry.contestId,
              entryId: entry.id,
            },
          },
        });

        // Update wallet
        await prisma.user.update({
          where: { id: entry.userId },
          data: {
            walletBalance: {
              increment: entry.winAmount,
            },
          },
        });

        console.log(
          `[FORCE-FIX-WALLET] Created transaction ${transaction.id} for entry ${entry.id}`
        );
        results.fixedCount++;
        results.details.push({
          entryId: entry.id,
          userId: entry.userId,
          amount: entry.winAmount,
          transactionId: transaction.id,
          status: 'success',
        });
      } catch (error) {
        console.error(
          `[FORCE-FIX-WALLET] Error processing entry ${entry.id}:`,
          error
        );
        results.errors++;
        results.details.push({
          entryId: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wallet fix completed. Fixed ${results.fixedCount} transactions with ${results.errors} errors.`,
      results,
    });
  } catch (error) {
    console.error('[FORCE-FIX-WALLET] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
