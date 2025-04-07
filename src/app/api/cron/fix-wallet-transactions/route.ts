import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron endpoint to automatically fix missing contest win transactions
 * This checks for contest entries with winAmount > 0 that don't have corresponding transactions,
 * and creates the missing transactions while updating wallet balances
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Running automatic wallet transaction fix...');

    // Check for authorization via cron secret header
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecretHeader === process.env.CRON_SECRET;

    if (!isAuthorizedCron && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all contest entries with winAmount > 0
    const winningEntries = await prisma.contestEntry.findMany({
      where: {
        winAmount: { gt: 0 },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        contest: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(
      `Found ${winningEntries.length} winning contest entries to check`
    );

    const missingTransactions = [];
    const processingResults = [];

    // Process each winning entry
    for (const entry of winningEntries) {
      try {
        // Check if this entry already has a transaction
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: entry.userId,
            type: 'contest_win',
            status: 'completed',
            reference: {
              contains: `Contest Win: ${entry.contest.name}`,
            },
          },
        });

        if (!existingTransaction && entry.winAmount) {
          console.log(
            `Missing transaction for contest entry ${entry.id} (user: ${entry.userId}, contest: ${entry.contestId})`
          );

          // Create the missing transaction
          const transaction = await prisma.transaction.create({
            data: {
              userId: entry.userId,
              amount: entry.winAmount,
              type: 'contest_win',
              status: 'completed',
              reference: `Contest Win: ${entry.contest.name} - Rank ${
                entry.rank
              } (auto-fixed ${new Date().toISOString()})`,
            },
          });

          // Update user wallet balance
          await prisma.user.update({
            where: { id: entry.userId },
            data: {
              walletBalance: {
                increment: entry.winAmount,
              },
            },
          });

          console.log(
            `Created transaction ${transaction.id} and updated wallet for user ${entry.userId}`
          );

          missingTransactions.push({
            contestEntryId: entry.id,
            userId: entry.userId,
            contestId: entry.contestId,
            transactionId: transaction.id,
            amount: entry.winAmount,
          });

          processingResults.push({
            status: 'success',
            entryId: entry.id,
            transactionId: transaction.id,
            message: `Created transaction and updated wallet for user ${entry.userId}`,
          });
        }
      } catch (error) {
        console.error(`Error processing entry ${entry.id}:`, error);

        processingResults.push({
          status: 'error',
          entryId: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Also check for any failed contest win logs and try to process them
    const failedLogs = await prisma.setting.findMany({
      where: {
        key: { contains: 'failed_contest_win_' },
        category: 'error_log',
      },
    });

    console.log(
      `Found ${failedLogs.length} failed contest win logs to process`
    );

    const processedFailures = [];

    for (const log of failedLogs) {
      try {
        // Parse the transaction data
        const data = JSON.parse(log.value);

        // Skip if already processed
        if (data.processed) continue;

        // Check if a transaction already exists
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: data.userId,
            type: 'contest_win',
            status: 'completed',
            amount: data.winAmount,
          },
        });

        if (!existingTransaction && data.winAmount) {
          // Create the missing transaction
          const transaction = await prisma.transaction.create({
            data: {
              userId: data.userId,
              amount: data.winAmount,
              type: 'contest_win',
              status: 'completed',
              reference: `Contest Win: Auto-Recovery - Rank ${data.rank}`,
            },
          });

          // Update user wallet balance
          await prisma.user.update({
            where: { id: data.userId },
            data: {
              walletBalance: {
                increment: data.winAmount,
              },
            },
          });

          // Mark the error log as processed
          await prisma.setting.update({
            where: { id: log.id },
            data: {
              value: JSON.stringify({
                ...data,
                processed: true,
                processedAt: new Date().toISOString(),
                recoveryTransactionId: transaction.id,
              }),
            },
          });

          processedFailures.push({
            logId: log.id,
            userId: data.userId,
            amount: data.winAmount,
            transactionId: transaction.id,
          });
        }
      } catch (error) {
        console.error(`Error processing failed log ${log.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      missingTransactionsFixed: missingTransactions.length,
      failedLogsProcessed: processedFailures.length,
      details: {
        missingTransactions,
        processedFailures,
      },
      processingResults,
    });
  } catch (error) {
    console.error('Error fixing wallet transactions:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix wallet transactions',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
