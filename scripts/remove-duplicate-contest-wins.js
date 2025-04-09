// Script to identify and remove duplicate contest_win transactions
require('ts-node/register');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicateContestWins() {
  console.log('Starting cleanup of duplicate contest_win transactions');

  try {
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
      `Found ${contestWinTransactions.length} total contest_win transactions`
    );

    // Track which entries we've seen (entryId -> transactionId)
    const processedEntries = new Map();
    const duplicateTransactionIds = [];

    // First pass: identify duplicates
    for (const tx of contestWinTransactions) {
      try {
        // Extract entryId from metadata
        let entryId = null;
        if (tx.metadata) {
          const metadata =
            typeof tx.metadata === 'string'
              ? JSON.parse(tx.metadata)
              : tx.metadata;

          entryId = metadata?.entryId;
        }

        // If no entryId, we can't determine if it's a duplicate, so skip
        if (!entryId) {
          console.log(
            `Transaction ${tx.id} has no entryId in metadata, skipping`
          );
          continue;
        }

        // If we've seen this entryId before, it's a duplicate
        if (processedEntries.has(entryId)) {
          console.log(
            `Found duplicate transaction ${tx.id} for entry ${entryId}`
          );
          duplicateTransactionIds.push(tx.id);
        } else {
          // First time seeing this entryId, record it
          processedEntries.set(entryId, tx.id);
        }
      } catch (error) {
        console.error(`Error processing transaction ${tx.id}:`, error);
      }
    }

    console.log(
      `Found ${duplicateTransactionIds.length} duplicate transactions to remove`
    );

    if (duplicateTransactionIds.length === 0) {
      console.log('No duplicates to remove. Exiting.');
      return;
    }

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

    // Process wallet balance adjustments and delete transactions
    console.log(
      `Processing ${adjustments.length} wallet balance adjustments...`
    );
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
          `Removed duplicate transaction ${adjustment.transactionId} and adjusted user ${adjustment.userId} balance by ${adjustment.amount}`
        );
      } catch (error) {
        console.error(
          `Error removing transaction ${adjustment.transactionId}:`,
          error
        );
      }
    }

    console.log('Duplicate removal process completed');
  } catch (error) {
    console.error('Error in duplicate removal process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeDuplicateContestWins()
  .then(() => {
    console.log('Script execution completed');
    setTimeout(() => process.exit(0), 1000);
  })
  .catch((err) => {
    console.error('Script execution failed:', err);
    setTimeout(() => process.exit(1), 1000);
  });
