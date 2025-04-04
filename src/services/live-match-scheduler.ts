import { prisma } from '@/lib/prisma';
import { updateLiveMatchPlayerStats } from './live-scoring-service';

// Track intervals for each match to avoid duplication
const liveMatchIntervals: Record<string, NodeJS.Timeout> = {};

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

    // Run an initial update for all live matches
    updateAllLiveMatchesPoints();

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
      },
    });

    // Stop tracking completed matches and finalize their contests
    for (const match of completedMatchIds) {
      await stopTrackingMatch(match.id);
      await finalizeMatchContests(match.id);
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

        // Transaction to update entries and distribute prizes
        const operations = [];

        for (const entry of rankedEntries) {
          // Update the entry with rank and points
          operations.push(
            prisma.contestEntry.update({
              where: { id: entry.id },
              data: {
                rank: entry.rank,
                points: entry.calculatedPoints,
              },
            })
          );

          // Distribute prizes to winners
          const prizeForRank = prizeBreakup.find((p) => p.rank === entry.rank);
          if (prizeForRank) {
            const winAmount = prizeForRank.prize;

            // Update the contest entry with win amount
            operations.push(
              prisma.contestEntry.update({
                where: { id: entry.id },
                data: {
                  winAmount,
                },
              })
            );

            // Add to user wallet
            operations.push(
              prisma.user.update({
                where: { id: entry.userId },
                data: {
                  walletBalance: {
                    increment: winAmount,
                  },
                },
              })
            );

            // Create transaction record
            operations.push(
              prisma.transaction.create({
                data: {
                  userId: entry.userId,
                  amount: winAmount,
                  type: 'contest_win',
                  status: 'completed',
                  reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
                },
              })
            );
          }
        }

        // Execute all operations in a transaction
        await prisma.$transaction(operations);

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
