import { prisma } from '@/lib/prisma';

// Track scheduler state
let schedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;
let lastRunTime: Date | null = null;

/**
 * Get the current status of the wallet fix scheduler
 */
export function getWalletFixSchedulerStatus() {
  return {
    running: schedulerRunning,
    nextRun: schedulerInterval
      ? new Date(Date.now() + (schedulerInterval as any)._idleTimeout)
      : null,
    lastRun: lastRunTime,
  };
}

/**
 * Initialize and start the wallet transaction fix scheduler
 * @param intervalMinutes How often to run the wallet fix (in minutes)
 * @returns Boolean indicating success
 */
export async function startWalletFixScheduler(intervalMinutes = 60) {
  try {
    if (schedulerRunning) {
      console.log('[WALLET-FIX] Scheduler is already running');
      return true;
    }

    console.log(
      `[WALLET-FIX] Starting scheduler to run every ${intervalMinutes} minutes`
    );

    // Run the fix immediately on startup
    console.log('[WALLET-FIX] Running immediate fix on startup');
    try {
      await runWalletTransactionFix();
      lastRunTime = new Date();
      console.log(
        `[WALLET-FIX] Initial run completed at ${lastRunTime.toISOString()}`
      );
    } catch (initialRunError) {
      console.error('[WALLET-FIX] Error during initial run:', initialRunError);
      // Continue setting up the scheduler even if initial run fails
    }

    // Set up interval for regular runs
    console.log(
      `[WALLET-FIX] Setting up interval for ${intervalMinutes} minutes`
    );
    schedulerInterval = setInterval(() => {
      try {
        console.log('[WALLET-FIX] Interval triggered, running wallet fix...');
        runWalletTransactionFix()
          .then(() => {
            lastRunTime = new Date();
            console.log(
              `[WALLET-FIX] Scheduled run completed at ${lastRunTime.toISOString()}`
            );
          })
          .catch((err) => {
            console.error('[WALLET-FIX] Error during scheduled run:', err);
          });
      } catch (intervalError) {
        console.error(
          '[WALLET-FIX] Error in interval callback:',
          intervalError
        );
      }
    }, intervalMinutes * 60 * 1000);

    schedulerRunning = true;
    console.log('[WALLET-FIX] Scheduler startup complete and running');

    return true;
  } catch (error) {
    console.error('[WALLET-FIX] Error starting scheduler:', error);
    return false;
  }
}

/**
 * Stop the wallet transaction fix scheduler
 */
export function stopWalletFixScheduler() {
  console.log('[WALLET-FIX] Stopping scheduler');
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    schedulerRunning = false;
    console.log('[WALLET-FIX] Scheduler stopped');
  } else {
    console.log('[WALLET-FIX] No scheduler was running');
  }
}

/**
 * Run the wallet transaction fix
 */
async function runWalletTransactionFix() {
  console.log('[WALLET-FIX] Starting wallet transaction fix...');

  try {
    // First, find all winning entries
    console.log('[WALLET-FIX] Querying for winning entries...');
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
      `[WALLET-FIX] Found ${winningEntries.length} total winning entries`
    );

    // Then find all contest win transactions
    console.log(
      '[WALLET-FIX] Querying for existing contest win transactions...'
    );
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        type: 'contest_win',
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    console.log(
      `[WALLET-FIX] Found ${existingTransactions.length} existing contest win transactions`
    );

    // Filter to find entries without transactions
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
            `[WALLET-FIX] Error checking transaction metadata:`,
            err
          );
          return false;
        }
      });
    });

    if (entriesWithoutTransactions.length === 0) {
      console.log(
        '[WALLET-FIX] No missing transactions found. All winning entries have transactions.'
      );
      return;
    }

    console.log(
      `[WALLET-FIX] Found ${entriesWithoutTransactions.length} winning entries without transactions. Processing...`
    );
    let successCount = 0;
    let errorCount = 0;

    // Process each missing transaction
    for (const entry of entriesWithoutTransactions) {
      try {
        console.log(
          `[WALLET-FIX] Processing entry ${entry.id} with win amount ${entry.winAmount}`
        );

        // Check if user exists
        if (!entry.user) {
          console.error(`[WALLET-FIX] No user found for entry ${entry.id}`);
          errorCount++;
          continue;
        }

        // Check if contest exists
        if (!entry.contest) {
          console.error(`[WALLET-FIX] No contest found for entry ${entry.id}`);
          errorCount++;
          continue;
        }

        // Skip if win amount is null
        if (entry.winAmount === null) {
          console.log(
            `[WALLET-FIX] Skipping entry ${entry.id} with null win amount`
          );
          continue;
        }

        console.log(
          `[WALLET-FIX] Creating transaction for user ${entry.userId}, amount ${entry.winAmount}`
        );

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
          `[WALLET-FIX] Created transaction ${transaction.id} for entry ${entry.id} with amount ${entry.winAmount}`
        );
        successCount++;
      } catch (error) {
        console.error(
          `[WALLET-FIX] Error processing entry ${entry.id}:`,
          error
        );
        errorCount++;
      }
    }

    console.log(
      `[WALLET-FIX] Wallet fix completed: ${successCount} transactions created, ${errorCount} errors`
    );

    // Process any failed transaction logs
    await processFailedTransactionLogs();
  } catch (error) {
    console.error('[WALLET-FIX] Error running wallet transaction fix:', error);
    throw error; // Re-throw to ensure proper error handling
  }
}

/**
 * Process any failed transaction logs stored in settings
 */
async function processFailedTransactionLogs() {
  console.log('[WALLET-FIX] Processing failed transaction logs');
  try {
    // Find all failed transaction logs
    const failedLogs = await prisma.setting.findMany({
      where: {
        key: {
          startsWith: 'failed_contest_win_',
        },
      },
    });

    console.log(
      `[WALLET-FIX] Found ${failedLogs.length} failed transaction logs`
    );

    for (const log of failedLogs) {
      try {
        const logData = JSON.parse(log.value);
        console.log(
          `[WALLET-FIX] Processing failed log for entry ${logData.entryId}`
        );

        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            userId: logData.userId,
            amount: logData.winAmount,
            type: 'contest_win',
            status: 'completed',
            reference: `Contest Win: Entry ${logData.entryId} (Recovered)`,
            metadata: {
              contestId: logData.contestId,
              entryId: logData.entryId,
            },
          },
        });

        // Update wallet
        await prisma.user.update({
          where: { id: logData.userId },
          data: {
            walletBalance: {
              increment: logData.winAmount,
            },
          },
        });

        console.log(
          `[WALLET-FIX] Created recovered transaction ${transaction.id} for entry ${logData.entryId}`
        );

        // Delete the log since it's been processed
        await prisma.setting.delete({
          where: { id: log.id },
        });
      } catch (error) {
        console.error(
          `[WALLET-FIX] Error processing failed log ${log.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error('[WALLET-FIX] Error processing failed logs:', error);
  }
}

/**
 * Get the time remaining until the next scheduled run
 */
function getIntervalRemaining() {
  if (!schedulerInterval) return 0;

  try {
    // This is a bit of a hack since Node.js doesn't expose interval timers directly
    // We're returning a reasonable estimate based on when the interval was started
    const intervalObj = schedulerInterval as unknown as {
      _idleTimeout: number;
      _idleStart: number;
    };
    return Math.max(
      0,
      intervalObj._idleTimeout - (Date.now() - intervalObj._idleStart)
    );
  } catch (error) {
    console.error('[WALLET-FIX] Error calculating interval remaining:', error);
    return 0;
  }
}
