import { prisma } from '@/lib/prisma';
import { updateLiveMatchPlayerStats } from './live-scoring-service';

// Track intervals for each match to avoid duplication
const liveMatchIntervals: Record<string, NodeJS.Timeout> = {};

// Global interval for lineup checks
let lineupSyncInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the scheduler and start tracking all live matches
 */
export async function initLiveMatchScheduler() {
  try {
    // Clean up any existing intervals
    Object.keys(liveMatchIntervals).forEach((matchId) => {
      clearInterval(liveMatchIntervals[matchId]);
      delete liveMatchIntervals[matchId];
    });

    // Clear existing lineup sync interval if it exists
    if (lineupSyncInterval) {
      clearInterval(lineupSyncInterval);
      lineupSyncInterval = null;
    }

    // Find all live matches
    const liveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
      },
      select: {
        id: true,
      },
    });

    console.log(
      `Initializing live match scheduler for ${liveMatches.length} matches...`
    );

    // Start tracking each live match
    liveMatches.forEach((match) => {
      startTrackingMatch(match.id);
    });

    // Set up a periodic check for new live matches
    setInterval(checkForNewLiveMatches, 5 * 60 * 1000); // Check every 5 minutes

    // Set up a periodic update of player points for all live matches
    setInterval(updateAllLiveMatchesPoints, 2 * 60 * 1000); // Update every 2 minutes

    // Set up a periodic sync of lineups for all active matches
    lineupSyncInterval = setInterval(syncAllLiveMatchLineups, 10 * 60 * 1000); // Sync lineups every 10 minutes

    // Run an initial update for all live matches
    updateAllLiveMatchesPoints();

    // Run an initial sync of lineups
    syncAllLiveMatchLineups();

    // CRITICAL FIX: Force an immediate check for completed matches to ensure none are tracked
    console.log('Running immediate check for completed matches...');
    await clearTrackingForCompletedMatches();

    // Run an initial check for new live matches
    await checkForNewLiveMatches();

    return true;
  } catch (error) {
    console.error('Error initializing live match scheduler:', error);
    return false;
  }
}

/**
 * Check for new matches that have gone live
 */
async function checkForNewLiveMatches() {
  try {
    // Log tracked matches for debugging
    console.log(
      `Currently tracking ${
        Object.keys(liveMatchIntervals).length
      } matches: ${JSON.stringify(Object.keys(liveMatchIntervals))}`
    );

    // Find matches that should be live based on start time but are still marked as upcoming
    const currentTime = new Date();
    const upcomingMatchesPastStartTime = await prisma.match.findMany({
      where: {
        status: 'upcoming',
        startTime: { lte: currentTime }, // Start time is in the past
      },
      select: {
        id: true,
        name: true,
        sportMonkId: true,
      },
    });

    if (upcomingMatchesPastStartTime.length > 0) {
      console.log(
        `Found ${upcomingMatchesPastStartTime.length} matches that should transition to live status`
      );

      // Update these matches to live status
      for (const match of upcomingMatchesPastStartTime) {
        try {
          // Update match status to live
          await prisma.match.update({
            where: { id: match.id },
            data: { status: 'live' },
          });

          console.log(
            `Updated match ${match.name} (ID: ${match.id}) to LIVE status`
          );

          // Start tracking the match for live updates
          startTrackingMatch(match.id);
        } catch (updateError) {
          console.error(
            `Error updating match ${match.id} to live status:`,
            updateError
          );
        }
      }
    }

    // Find matches that are live but not being tracked
    const liveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
        id: {
          notIn: Object.keys(liveMatchIntervals),
        },
      },
      select: {
        id: true,
      },
    });

    if (liveMatches.length > 0) {
      console.log(`Found ${liveMatches.length} new live matches to track...`);

      // Start tracking each new live match
      liveMatches.forEach((match) => {
        startTrackingMatch(match.id);
      });
    }

    // Also check for matches that have ended but are still being tracked
    const completedMatchIds = await prisma.match.findMany({
      where: {
        status: 'completed',
        id: {
          in: Object.keys(liveMatchIntervals),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Stop tracking completed matches and finalize their contests
    if (completedMatchIds.length > 0) {
      console.log(
        `Found ${
          completedMatchIds.length
        } completed matches that are still being tracked: ${JSON.stringify(
          completedMatchIds.map((m) => m.name)
        )}`
      );

      for (const match of completedMatchIds) {
        console.log(
          `Stopping tracking and finalizing match: ${match.name} (${match.id})`
        );
        await stopTrackingMatch(match.id);
        await finalizeMatchContests(match.id);
      }
    } else {
      // Double check - if there are no completed matches being tracked, but there are
      // completed matches with unfinalized contests, log these for debugging
      const recentlyCompletedMatches = await prisma.match.findMany({
        where: {
          status: 'completed',
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        select: {
          id: true,
          name: true,
          contests: {
            select: {
              id: true,
              entries: {
                select: {
                  id: true,
                  winAmount: true,
                },
              },
            },
          },
        },
      });

      const matchesNeedingFinalization = recentlyCompletedMatches.filter(
        (match) =>
          match.contests.some((contest) =>
            contest.entries.some((entry) => entry.winAmount === null)
          )
      );

      if (matchesNeedingFinalization.length > 0) {
        console.log(
          `Warning: Found ${
            matchesNeedingFinalization.length
          } recently completed matches with unfinalized contests: ${matchesNeedingFinalization
            .map((m) => m.name)
            .join(', ')}`
        );
        console.log(
          `These should be finalized via the /api/cron/check-completed-matches endpoint`
        );
      }
    }
  } catch (error) {
    console.error('Error checking for new live matches:', error);
  }
}

/**
 * Start tracking a live match for score updates
 */
function startTrackingMatch(matchId: string) {
  // Don't start a new interval if one already exists
  if (liveMatchIntervals[matchId]) {
    return;
  }

  console.log(`Starting live score updates for match ${matchId}`);

  // Update the match data immediately
  updateLiveMatchPlayerStats(matchId)
    .then((statsUpdated) => {
      if (statsUpdated) {
        // Also update contest entries
        return updateContestEntryPoints(matchId);
      }
    })
    .catch((error) => {
      console.error(`Error updating live match ${matchId}:`, error);
    });

  // Set up interval to update every 2 minutes (can be adjusted)
  liveMatchIntervals[matchId] = setInterval(() => {
    updateLiveMatchPlayerStats(matchId)
      .then((statsUpdated) => {
        if (statsUpdated) {
          // Also update contest entries
          return updateContestEntryPoints(matchId);
        }
      })
      .catch((error) => {
        console.error(`Error updating live match ${matchId}:`, error);
      });
  }, 2 * 60 * 1000);
}

/**
 * Stop tracking a match
 */
async function stopTrackingMatch(matchId: string) {
  if (liveMatchIntervals[matchId]) {
    console.log(`Stopping live score updates for match ${matchId}`);

    clearInterval(liveMatchIntervals[matchId]);
    delete liveMatchIntervals[matchId];

    // Update one final time
    try {
      await updateLiveMatchPlayerStats(matchId);
    } catch (error) {
      console.error(`Error during final update for match ${matchId}:`, error);
    }
  }
}

/**
 * Finalize all contests for a completed match
 */
async function finalizeMatchContests(matchId: string) {
  try {
    console.log(`Finalizing contests for completed match ${matchId}`);

    // Find all contests for this match
    const contests = await prisma.contest.findMany({
      where: { matchId },
      select: { id: true, name: true },
    });

    if (contests.length === 0) {
      console.log(`No contests found for match ${matchId}`);
      return;
    }

    console.log(
      `Found ${contests.length} contests to finalize for match ${matchId}`
    );

    // Finalize each contest
    for (const contest of contests) {
      try {
        // Call the finalize API directly
        console.log(`Finalizing contest: ${contest.name} (${contest.id})`);

        // Get all entries for this contest
        const entries = await prisma.contestEntry.findMany({
          where: { contestId: contest.id },
          include: {
            fantasyTeam: {
              include: {
                players: {
                  include: {
                    player: true,
                  },
                },
              },
            },
            user: true,
          },
        });

        if (entries.length === 0) {
          console.log(`No entries found for contest ${contest.id}`);
          continue;
        }

        // Calculate points for each team
        const entriesWithPoints = await Promise.all(
          entries.map(async (entry) => {
            // Calculate total points for the team
            let totalPoints = 0;

            // Get player statistics for this match
            for (const teamPlayer of entry.fantasyTeam.players) {
              const playerStats = await prisma.playerStatistic.findUnique({
                where: {
                  matchId_playerId: {
                    matchId,
                    playerId: teamPlayer.playerId,
                  },
                },
              });

              if (playerStats) {
                // Apply captain/vice-captain multiplier
                let points = playerStats.points;
                if (teamPlayer.isCaptain) {
                  points *= 2; // 2x for captain
                } else if (teamPlayer.isViceCaptain) {
                  points *= 1.5; // 1.5x for vice-captain
                }
                totalPoints += points;
              }
            }

            return {
              ...entry,
              calculatedPoints: totalPoints,
            };
          })
        );

        // Sort entries by points (descending)
        const sortedEntries = entriesWithPoints.sort(
          (a, b) => b.calculatedPoints - a.calculatedPoints
        );

        // Assign ranks and determine prize winners
        const rankedEntries = sortedEntries.map((entry, index) => {
          // Assign rank (1-based)
          const rank = index + 1;
          return { ...entry, rank };
        });

        // Get prize breakup for this contest
        const prizeBreakup = await prisma.prizeBreakup.findMany({
          where: { contestId: contest.id },
          orderBy: { rank: 'asc' },
        });

        // First, update entry ranks and points (this can be done outside the main transaction)
        for (const entry of rankedEntries) {
          try {
            await prisma.contestEntry.update({
              where: { id: entry.id },
              data: {
                rank: entry.rank,
                points: entry.calculatedPoints,
              },
            });
          } catch (error) {
            console.error(
              `Error updating rank and points for entry ${entry.id}:`,
              error
            );
            // Continue to other entries if one fails
          }
        }

        // Process winners and create transactions
        for (const entry of rankedEntries) {
          // Find matching prize - check both direct matches and ranges
          const prizeForRank = prizeBreakup.find((p) => {
            // Handle direct rank matches
            if (p.rank === entry.rank.toString()) {
              return true;
            }

            // Handle rank ranges like "101-200"
            if (typeof p.rank === 'string' && p.rank.includes('-')) {
              const [start, end] = p.rank.split('-').map(Number);
              return entry.rank >= start && entry.rank <= end;
            }

            return false;
          });

          if (prizeForRank) {
            const winAmount = prizeForRank.prize;

            // Log for admin users
            if (entry.user?.role === 'ADMIN') {
              console.log(
                `Found admin user at rank ${entry.rank}: ${entry.user.name}`
              );
              console.log(`Prize amount for admin: ${winAmount}`);
            }

            // For each winner, process in its own transaction with retries
            await processContestWinner(entry, contest, winAmount);
          } else {
            console.log(`No prize found for rank ${entry.rank}`);
          }
        }

        console.log(
          `Successfully finalized contest ${contest.id} with ${rankedEntries.length} entries`
        );
      } catch (error) {
        console.error(`Error finalizing contest ${contest.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error finalizing contests for match ${matchId}:`, error);
  }
}

/**
 * Process a contest winner, update their wallet and create transaction record
 * This function includes retry logic and verification to ensure transactions are created
 */
async function processContestWinner(
  entry: any,
  contest: any,
  winAmount: number,
  retryCount = 0
) {
  const maxRetries = 3;

  try {
    // Add special logging for admin users
    const isAdminUser = entry.user?.role === 'ADMIN';
    if (isAdminUser) {
      console.log(
        `Processing win for ADMIN user ${entry.userId}, contest ${contest.id}, rank ${entry.rank}, amount ${winAmount}`
      );
    }

    // Check if this entry already has a transaction (to prevent duplicates)
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: entry.userId,
        type: 'contest_win',
        status: 'completed',
        reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
      },
    });

    if (existingTransaction) {
      console.log(
        `Transaction already exists for user ${entry.userId}, contest ${contest.id}, rank ${entry.rank}`
      );

      // Verify contest entry has winAmount set
      const contestEntry = await prisma.contestEntry.findUnique({
        where: { id: entry.id },
      });

      if (!contestEntry?.winAmount) {
        // Update just the winAmount if missing
        await prisma.contestEntry.update({
          where: { id: entry.id },
          data: { winAmount },
        });
        console.log(`Updated missing winAmount for entry ${entry.id}`);
      }

      return;
    }

    // First, ensure the contest entry is marked with the correct winAmount
    // Do this as a separate transaction to ensure at least this part succeeds
    try {
      console.log(
        `Updating contest entry ${entry.id} with winAmount ${winAmount}`
      );
      await prisma.contestEntry.update({
        where: { id: entry.id },
        data: { winAmount },
      });
    } catch (updateError) {
      console.error(`Error updating contest entry winAmount: ${updateError}`);
      throw updateError; // Rethrow to trigger retry logic
    }

    // Now try to update the wallet and create the transaction record
    try {
      // Add to user wallet
      await prisma.user.update({
        where: { id: entry.userId },
        data: {
          walletBalance: {
            increment: winAmount,
          },
        },
      });

      console.log(
        `Updated wallet balance for user ${entry.userId}, added ${winAmount}`
      );

      // Create transaction record
      const txn = await prisma.transaction.create({
        data: {
          userId: entry.userId,
          amount: winAmount,
          type: 'contest_win',
          status: 'completed',
          reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
        },
      });

      console.log(`Created transaction record: ${txn.id}`);
    } catch (txError) {
      console.error(
        `Error in wallet update or transaction creation: ${txError}`
      );

      // Check if the user's wallet was already updated
      // If it was, we need to create just the transaction record
      try {
        // Try to create just the transaction record with a slightly modified reference
        // to avoid uniqueness conflicts if that's the issue
        await prisma.transaction.create({
          data: {
            userId: entry.userId,
            amount: winAmount,
            type: 'contest_win',
            status: 'completed',
            reference: `Contest Win: ${contest.name} - Rank ${
              entry.rank
            } (retry ${Date.now()})`,
          },
        });
        console.log(`Created fallback transaction for user ${entry.userId}`);
      } catch (fallbackError) {
        console.error(
          `Fallback transaction creation also failed: ${fallbackError}`
        );
        throw txError; // Rethrow the original error to trigger retry logic
      }
    }

    // Verify transaction was created successfully - check with a more flexible query
    const verifyTransaction = await prisma.transaction.findFirst({
      where: {
        userId: entry.userId,
        type: 'contest_win',
        status: 'completed',
        amount: winAmount,
        reference: {
          contains: `Contest Win: ${contest.name}`,
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (!verifyTransaction) {
      throw new Error(
        'Transaction verification failed - transaction not found after creation'
      );
    }

    console.log(
      `Successfully processed win for user ${entry.userId}, contest ${contest.id}, rank ${entry.rank}, amount ${winAmount}`
    );
  } catch (error) {
    console.error(
      `Error processing contest winner for entry ${entry.id}:`,
      error
    );

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(
        `Retrying process contest winner (${retryCount + 1}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return processContestWinner(entry, contest, winAmount, retryCount + 1);
    } else {
      // Log critical error for manual intervention
      console.error(
        `CRITICAL: Failed to process contest winner after ${maxRetries} retries.`,
        {
          userId: entry.userId,
          contestId: contest.id,
          entryId: entry.id,
          rank: entry.rank,
          winAmount,
        }
      );

      // Create an error record in the database for later processing
      try {
        await prisma.setting.create({
          data: {
            key: `failed_contest_win_${entry.id}_${Date.now()}`,
            value: JSON.stringify({
              userId: entry.userId,
              contestId: contest.id,
              entryId: entry.id,
              rank: entry.rank,
              winAmount,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            }),
            type: 'json',
            category: 'error_log',
            description:
              'Failed contest win transaction that needs manual processing',
          },
        });
      } catch (logError) {
        console.error('Failed to log error to database:', logError);
      }
    }
  }
}

/**
 * Manual trigger to update a specific match
 */
export async function triggerMatchUpdate(matchId: string): Promise<boolean> {
  try {
    return await updateLiveMatchPlayerStats(matchId);
  } catch (error) {
    console.error(`Error manually updating match ${matchId}:`, error);
    return false;
  }
}

/**
 * Manual trigger to finalize contests for a match
 */
export async function triggerContestFinalization(
  matchId: string
): Promise<boolean> {
  try {
    await finalizeMatchContests(matchId);
    return true;
  } catch (error) {
    console.error(
      `Error manually finalizing contests for match ${matchId}:`,
      error
    );
    return false;
  }
}

/**
 * Cleanup function to stop all tracking when server is shutting down
 */
export function shutdownScheduler() {
  Object.keys(liveMatchIntervals).forEach((matchId) => {
    clearInterval(liveMatchIntervals[matchId]);
    delete liveMatchIntervals[matchId];
  });
  console.log('Live match scheduler shut down');
}

/**
 * Updates points for all contest entries in a live match
 * This keeps the leaderboard updated in real-time
 */
async function updateContestEntryPoints(matchId: string): Promise<boolean> {
  try {
    console.log(`Updating contest entry points for match ${matchId}...`);

    // Find all contests for this match
    const contests = await prisma.contest.findMany({
      where: { matchId },
      select: { id: true, name: true },
    });

    if (contests.length === 0) {
      console.log(`No contests found for match ${matchId}`);
      return false;
    }

    console.log(`Found ${contests.length} contests to update points`);
    let updateCount = 0;

    // Process each contest
    for (const contest of contests) {
      try {
        // Get all entries for this contest with their fantasy teams
        const entries = await prisma.contestEntry.findMany({
          where: { contestId: contest.id },
          include: {
            fantasyTeam: {
              include: {
                players: true,
              },
            },
          },
        });

        if (entries.length === 0) {
          console.log(`No entries found for contest ${contest.id}`);
          continue;
        }

        console.log(
          `Processing ${entries.length} entries for contest ${contest.name}`
        );

        // Get all player statistics for this match
        const playerStats = await prisma.playerStatistic.findMany({
          where: { matchId },
          select: {
            playerId: true,
            points: true,
          },
        });

        // Create a map for quick lookup
        const statsMap = new Map();
        playerStats.forEach((stat) => {
          statsMap.set(stat.playerId, stat.points);
        });

        // Update each entry's points
        for (const entry of entries) {
          // Calculate total points for this team
          let totalPoints = 0;

          for (const teamPlayer of entry.fantasyTeam.players) {
            const playerPoints = statsMap.get(teamPlayer.playerId) || 0;

            // Apply captain/vice-captain multiplier
            let effectivePoints = playerPoints;
            if (teamPlayer.isCaptain) {
              effectivePoints *= 2; // 2x for captain
            } else if (teamPlayer.isViceCaptain) {
              effectivePoints *= 1.5; // 1.5x for vice-captain
            }

            totalPoints += effectivePoints;
          }

          // Update the contest entry with the calculated points
          await prisma.contestEntry.update({
            where: { id: entry.id },
            data: { points: totalPoints },
          });

          updateCount++;
        }

        console.log(
          `Updated points for ${entries.length} entries in contest ${contest.name}`
        );
      } catch (error) {
        console.error(
          `Error updating points for contest ${contest.id}:`,
          error
        );
      }
    }

    console.log(
      `Successfully updated ${updateCount} contest entries for match ${matchId}`
    );
    return true;
  } catch (error) {
    console.error(
      `Error updating contest entry points for match ${matchId}:`,
      error
    );
    return false;
  }
}

/**
 * Update points for all live matches
 * Will be called periodically by the scheduler
 */
async function updateAllLiveMatchesPoints() {
  try {
    console.log('Updating points for all live matches...');

    // Find all live matches
    const liveMatches = await prisma.match.findMany({
      where: {
        status: 'live',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (liveMatches.length === 0) {
      console.log('No live matches found to update points');
      return;
    }

    console.log(`Found ${liveMatches.length} live matches to update points`);

    // Update player statistics for each match
    for (const match of liveMatches) {
      try {
        console.log(
          `Updating player points for match: ${match.name} (${match.id})`
        );
        const statsUpdated = await updateLiveMatchPlayerStats(match.id);

        if (statsUpdated) {
          // Also update contest entries with the latest points
          console.log('Player stats updated, now updating contest entries...');
          await updateContestEntryPoints(match.id);
        }
      } catch (error) {
        console.error(`Error updating points for match ${match.id}:`, error);
      }
    }

    console.log('Completed updating points for all live matches');
  } catch (error) {
    console.error('Error updating all live match points:', error);
  }
}

/**
 * Manual trigger to update contest entry points
 */
export async function updateLiveContestPoints(
  matchId: string
): Promise<boolean> {
  try {
    console.log(
      `Manually updating contest entry points for match ${matchId}...`
    );
    return await updateContestEntryPoints(matchId);
  } catch (error) {
    console.error(
      `Error manually updating contest points for match ${matchId}:`,
      error
    );
    return false;
  }
}

/**
 * Synchronize lineups for all live matches
 * Note: This function now uses direct API calls to refresh player data instead of MatchLineup
 */
async function syncAllLiveMatchLineups() {
  try {
    console.log('Syncing lineups for all live matches...');

    // Find all live matches
    const liveMatches = await prisma.match.findMany({
      where: {
        OR: [
          { status: 'live' },
          { status: 'upcoming' }, // Include upcoming matches too
        ],
        // Only look at matches happening soon or already started
        startTime: {
          lte: new Date(Date.now() + 3 * 60 * 60 * 1000), // Within next 3 hours
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        sportMonkId: true,
      },
    });

    console.log(`Found ${liveMatches.length} matches to check for lineup data`);

    // Process each match with a delay to avoid rate limiting
    for (const match of liveMatches) {
      try {
        // Get current MatchPlayer count to detect changes
        const existingPlayers = await prisma.matchPlayer.count({
          where: {
            matchId: match.id,
          },
        });

        console.log(`Refreshing players for match ${match.id} (${match.name})`);

        // Import players directly via fetchMatchDetails in matches service
        // This will update the MatchPlayer table with the latest data
        const { fetchMatchDetails } = await import('./sportmonk/matches');
        if (match.sportMonkId) {
          try {
            await fetchMatchDetails(parseInt(match.sportMonkId));
            console.log(`Successfully refreshed players from SportMonks API`);
          } catch (apiError) {
            console.error(`Error fetching match details from API: ${apiError}`);
          }
        }

        // Check if players were added
        const updatedPlayers = await prisma.matchPlayer.count({
          where: {
            matchId: match.id,
          },
        });

        console.log(
          `Match ${match.id} (${match.name}): ${existingPlayers} players before, ${updatedPlayers} players after refresh`
        );
      } catch (error) {
        console.error(`Error syncing lineup for match ${match.id}:`, error);
      }

      // Add a small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('Finished syncing lineups for all matches');
  } catch (error) {
    console.error('Error syncing lineups for live matches:', error);
  }
}

/**
 * Clear tracking for any match that's marked as completed in the database
 * This is a critical function to stop API calls for completed matches
 */
export async function clearTrackingForCompletedMatches() {
  try {
    // Get all match IDs currently being tracked
    const trackedMatchIds = Object.keys(liveMatchIntervals);

    if (trackedMatchIds.length === 0) {
      console.log('No matches currently being tracked');
      return;
    }

    console.log(
      `Checking completion status for ${trackedMatchIds.length} tracked matches`
    );

    // Find any tracked matches that are already marked as completed
    const completedMatches = await prisma.match.findMany({
      where: {
        id: { in: trackedMatchIds },
        status: 'completed',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (completedMatches.length > 0) {
      console.log(
        `⚠️ CRITICAL: Found ${completedMatches.length} completed matches still being tracked. Stopping tracking for:`
      );

      // Stop tracking each completed match
      for (const match of completedMatches) {
        console.log(`- ${match.name} (${match.id})`);

        // Clear the interval
        if (liveMatchIntervals[match.id]) {
          clearInterval(liveMatchIntervals[match.id]);
          delete liveMatchIntervals[match.id];
          console.log(`✅ Successfully stopped tracking for match ${match.id}`);
        }
      }
    } else {
      console.log('No completed matches are being tracked - good!');
    }
  } catch (error) {
    console.error('Error clearing tracking for completed matches:', error);
  }
}

/**
 * Manually stop tracking a specific match by ID
 * Use this as a direct way to stop tracking a match that's still being called
 */
export async function stopTrackingMatchById(matchId: string): Promise<boolean> {
  try {
    console.log(`Manually stopping tracking for match ${matchId}`);

    // Check if this match is being tracked
    if (!liveMatchIntervals[matchId]) {
      console.log(`Match ${matchId} is not currently being tracked`);
      return false;
    }

    // Clear the interval and remove from tracking
    clearInterval(liveMatchIntervals[matchId]);
    delete liveMatchIntervals[matchId];

    console.log(`✅ Successfully removed match ${matchId} from tracking`);

    return true;
  } catch (error) {
    console.error(`Error stopping tracking for match ${matchId}:`, error);
    return false;
  }
}
