import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type ContestEntryWithRelations = {
  id: string;
  userId: string;
  contestId: string;
  fantasyTeamId: string;
  rank: number | null;
  winAmount: number | null;
  points: number | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  contest: {
    id: string;
    name: string;
    match?: {
      id: string;
      name: string;
      sportMonkId: string;
    };
  };
};

/**
 * This endpoint checks for missing contest win transactions
 * It compares ContestEntry records with Transaction records to find discrepancies
 * For entries that have a winAmount but no corresponding transaction, it creates them
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const dryRun = searchParams.get('dryRun') === 'true';
    const forceCreate = searchParams.get('forceCreate') === 'true'; // Add a force option

    // Get all contest entries with winAmount > 0
    const winningEntriesQuery: any = {
      where: {
        winAmount: {
          gt: 0,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
            match: {
              select: {
                id: true,
                name: true,
                sportMonkId: true,
              },
            },
          },
        },
      },
    };

    // If userId is provided, filter by that user
    if (userId) {
      winningEntriesQuery.where.userId = userId;
      console.log(`Checking for missing transactions for user ID: ${userId}`);
    }

    const winningEntries = (await prisma.contestEntry.findMany(
      winningEntriesQuery
    )) as ContestEntryWithRelations[];

    console.log(`Found ${winningEntries.length} winning contest entries`);

    // For each winning entry, check if there's a corresponding transaction
    const missingTransactions = [];
    const processingResults = [];

    // Special handling for specific user
    const isSpecificUser = userId === '5c4d400d-ac19-45aa-ad67-ecffb2831b9d';

    // If it's the specific user, let's first check all their contest win transactions
    if (isSpecificUser) {
      const allUserTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'contest_win',
          status: 'completed',
        },
      });

      console.log(
        `User ${userId} has ${allUserTransactions.length} contest win transactions:`
      );
      allUserTransactions.forEach((tx) => {
        console.log(
          `- ID: ${tx.id}, Amount: ${tx.amount}, Reference: ${
            tx.reference || 'No reference'
          }, Date: ${tx.createdAt}`
        );
      });

      // If forcing creation for this user, add a special log
      if (forceCreate) {
        console.log(
          `Force create flag enabled for user ${userId} - will create transactions regardless of existing ones`
        );
      }
    }

    for (const entry of winningEntries) {
      // Check if this is the specific user
      const entryIsSpecificUser =
        entry.userId === '5c4d400d-ac19-45aa-ad67-ecffb2831b9d';

      if (entryIsSpecificUser) {
        console.log(`---
Processing contest entry for specific user:
Entry ID: ${entry.id}
Contest ID: ${entry.contestId}
Contest Name: ${entry.contest.name}
Match Name: ${entry.contest.match?.name || 'Unknown match'}
Rank: ${entry.rank}
Amount: ${entry.winAmount}
User: ${entry.user.name} (${entry.userId})
---`);
      }

      // Prepare more detailed search strategies
      // We'll check various ways a transaction might exist for this contest win
      let existingTransaction = null;

      if (!forceCreate || !entryIsSpecificUser) {
        // Step 1: Try exact reference match
        existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: entry.userId,
            type: 'contest_win',
            status: 'completed',
            reference: `Contest Win: ${entry.contest.name} - Rank ${entry.rank}`,
          },
        });

        if (entryIsSpecificUser) {
          console.log(
            `Strategy 1 (Exact reference): ${
              existingTransaction ? 'Transaction found' : 'No match'
            }`
          );
        }

        // Step 2: If no match, try partial reference match
        if (!existingTransaction) {
          existingTransaction = await prisma.transaction.findFirst({
            where: {
              userId: entry.userId,
              type: 'contest_win',
              status: 'completed',
              reference: {
                contains: entry.contest.name,
              },
            },
          });

          if (entryIsSpecificUser) {
            console.log(
              `Strategy 2 (Partial reference - contest name): ${
                existingTransaction ? 'Transaction found' : 'No match'
              }`
            );
          }
        }

        // Step 3: Look for same amount with type contest_win
        if (!existingTransaction && entry.winAmount) {
          existingTransaction = await prisma.transaction.findFirst({
            where: {
              userId: entry.userId,
              type: 'contest_win',
              status: 'completed',
              amount: entry.winAmount,
            },
          });

          if (entryIsSpecificUser) {
            console.log(
              `Strategy 3 (Same amount): ${
                existingTransaction ? 'Transaction found' : 'No match'
              }`
            );
          }
        }

        // Step 4: For our specific problematic user, try looking for the match name in the reference
        if (
          !existingTransaction &&
          entryIsSpecificUser &&
          entry.contest.match
        ) {
          const matchName = entry.contest.match.name;
          if (matchName) {
            existingTransaction = await prisma.transaction.findFirst({
              where: {
                userId: entry.userId,
                type: 'contest_win',
                status: 'completed',
                reference: {
                  contains: matchName.split(' vs ')[0], // Try first team name
                },
              },
            });

            if (entryIsSpecificUser) {
              console.log(
                `Strategy 4 (Match name): ${
                  existingTransaction ? 'Transaction found' : 'No match'
                }`
              );
            }
          }
        }
      } else if (entryIsSpecificUser) {
        console.log(`Skipping transaction search due to forceCreate flag`);
      }

      // For the specific user, if we're forcing creation or no transaction was found, add to missing transactions
      if ((forceCreate && entryIsSpecificUser) || !existingTransaction) {
        if (entryIsSpecificUser) {
          console.log(
            `NO MATCHING TRANSACTION FOUND for entry ${entry.id} - adding to missing transactions list`
          );
        }

        missingTransactions.push({
          userId: entry.userId,
          userName: entry.user.name,
          contestId: entry.contestId,
          contestName: entry.contest.name,
          entryId: entry.id,
          winAmount: entry.winAmount,
          rank: entry.rank,
        });

        // Create the missing transaction if not a dry run
        if (!dryRun) {
          try {
            // Create transaction entry
            const newTransaction = await prisma.transaction.create({
              data: {
                userId: entry.userId,
                amount: entry.winAmount || 0,
                type: 'contest_win',
                status: 'completed',
                reference: `Contest Win: ${entry.contest.name} - Rank ${entry.rank}`,
              },
            });

            processingResults.push({
              status: 'success',
              entryId: entry.id,
              transactionId: newTransaction.id,
              message: `Created missing transaction for user ${entry.user.name} (${entry.userId}) - ${entry.contest.name} - Rank ${entry.rank} - Amount: ${entry.winAmount}`,
            });

            if (entryIsSpecificUser) {
              console.log(
                `Successfully created new transaction: ID ${newTransaction.id}, Amount: ${entry.winAmount}, Reference: Contest Win: ${entry.contest.name} - Rank ${entry.rank}`
              );
            }
          } catch (error) {
            processingResults.push({
              status: 'error',
              entryId: entry.id,
              message: `Failed to create transaction: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            });

            if (entryIsSpecificUser) {
              console.error(
                `ERROR creating transaction: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`
              );
            }
          }
        }
      } else if (entryIsSpecificUser && existingTransaction) {
        console.log(
          `Found existing transaction: ID ${existingTransaction.id}, Amount: ${existingTransaction.amount}, Reference: ${existingTransaction.reference}`
        );
      }
    }

    // If it's our specific user, check all transactions after processing
    if (isSpecificUser && !dryRun) {
      const updatedUserTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'contest_win',
          status: 'completed',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(
        `After processing, user ${userId} now has ${updatedUserTransactions.length} contest win transactions:`
      );
      updatedUserTransactions.forEach((tx) => {
        console.log(
          `- ID: ${tx.id}, Amount: ${tx.amount}, Reference: ${
            tx.reference || 'No reference'
          }, Date: ${tx.createdAt}`
        );
      });
    }

    // Update wallet balances if not a dry run
    if (!dryRun && missingTransactions.length > 0) {
      // Group by user to calculate total amount to add to each user's wallet
      const userTotals: Record<string, number> = {};

      for (const tx of missingTransactions) {
        if (!userTotals[tx.userId]) {
          userTotals[tx.userId] = 0;
        }
        userTotals[tx.userId] += tx.winAmount || 0;
      }

      // Update wallet balances for affected users
      for (const [userId, amount] of Object.entries(userTotals)) {
        if (amount > 0) {
          try {
            // First, log current wallet balance
            const userBefore = await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, name: true, walletBalance: true },
            });

            if (userBefore) {
              console.log(
                `User ${userBefore.name} (${userId}) wallet balance before update: ${userBefore.walletBalance}`
              );
            }

            // Update wallet
            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: { walletBalance: { increment: amount } },
            });

            console.log(
              `User ${updatedUser.name} (${userId}) wallet balance updated: ${updatedUser.walletBalance} (added ${amount})`
            );

            processingResults.push({
              status: 'success',
              userId,
              message: `Updated wallet balance for user ${userId} from ${userBefore?.walletBalance} to ${updatedUser.walletBalance} (added ${amount})`,
            });
          } catch (error) {
            processingResults.push({
              status: 'error',
              userId,
              message: `Failed to update wallet balance: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalWinningEntries: winningEntries.length,
      missingTransactions: missingTransactions.length,
      details: missingTransactions,
      processed: dryRun ? [] : processingResults,
    });
  } catch (error) {
    console.error('Error fixing missing transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix missing transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
