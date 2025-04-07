import { prisma } from '@/lib/prisma';
import { fetchLiveMatchDetails } from './live-scoring-service';
import { initWalletFixScheduler } from '@/lib/init-wallet-fix';

/**
 * Synchronizes live match data from SportMonks to our database
 * @param matchId Our internal match ID
 * @param sportMonkId The SportMonks API match ID
 * @param forceSync Force syncing even if ball already exists
 */
export async function syncLiveMatchData(
  matchId: string,
  sportMonkId: string,
  forceSync: boolean = false
) {
  try {
    // CRITICAL FIX: Check if match is already completed before making any API calls
    const matchStatus = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        status: true,
        name: true,
      },
    });

    // If match is not found or already completed, stop processing immediately
    if (!matchStatus) {
      console.error(`Match ${matchId} not found in database, cannot sync`);
      return null;
    }
    initWalletFixScheduler();
    if (matchStatus.status === 'completed') {
      console.log(
        `🛑 SKIPPED: Match ${matchStatus.name} (${matchId}) is already completed in database, skipping sync`
      );
      return {
        status: 'completed',
        message: 'Match already completed, sync skipped',
        matchId,
      };
    }

    console.log(
      `Syncing live match data for match ${matchId} (SportMonk ID: ${sportMonkId}), force: ${forceSync}`
    );

    // Fetch data from SportMonks
    const matchData = await fetchLiveMatchDetails(sportMonkId);

    if (!matchData) {
      console.error('No match data returned from SportMonks');
      return null;
    }

    // Process and store ball data
    const balls = matchData.balls || [];

    console.log(`Processing ${balls.length} balls for match ${matchId}`);

    // Update or create match summary
    let matchSummary;
    try {
      // Extract team scores
      let teamAScore = '';
      let teamBScore = '';
      let overs = '';
      let currentInnings = 1;

      // Get scores from runs data if available
      if (matchData.runs && matchData.runs.length > 0) {
        const teamAScoreData = matchData.runs.find(
          (r: any) => r.team_id.toString() === matchData.localteam.id.toString()
        );
        const teamBScoreData = matchData.runs.find(
          (r: any) =>
            r.team_id.toString() === matchData.visitorteam.id.toString()
        );

        if (teamAScoreData) {
          teamAScore = `${teamAScoreData.score || 0}/${
            teamAScoreData.wickets || 0
          }`;
          if (teamAScoreData.overs) {
            overs = teamAScoreData.overs.toString();
          }
        }

        if (teamBScoreData) {
          teamBScore = `${teamBScoreData.score || 0}/${
            teamBScoreData.wickets || 0
          }`;
          if (!teamAScoreData && teamBScoreData.overs) {
            overs = teamBScoreData.overs.toString();
          }
        }

        // Determine current innings
        currentInnings =
          Math.max(...matchData.runs.map((r: any) => r.inning)) || 1;
      }
      // Fallback to scoreboards if no runs data
      else if (matchData.scoreboards && matchData.scoreboards.length > 0) {
        const teamATotals = matchData.scoreboards.filter(
          (sb: any) =>
            sb.team_id.toString() === matchData.localteam.id.toString() &&
            sb.type === 'total'
        );

        const teamBTotals = matchData.scoreboards.filter(
          (sb: any) =>
            sb.team_id.toString() === matchData.visitorteam.id.toString() &&
            sb.type === 'total'
        );

        if (teamATotals.length > 0) {
          const latest = teamATotals[teamATotals.length - 1];
          teamAScore = `${latest.total || 0}/${latest.wickets || 0}`;
          if (latest.overs) {
            overs = latest.overs.toString();
          }
        }

        if (teamBTotals.length > 0) {
          const latest = teamBTotals[teamBTotals.length - 1];
          teamBScore = `${latest.total || 0}/${latest.wickets || 0}`;
        }
      }

      matchSummary = await prisma.matchSummary.upsert({
        where: { matchId },
        create: {
          matchId,
          teamAScore,
          teamBScore,
          overs,
          currentInnings,
          status: matchData.status,
          lastUpdated: new Date(),
          rawData: matchData,
        },
        update: {
          teamAScore,
          teamBScore,
          overs,
          currentInnings,
          status: matchData.status,
          lastUpdated: new Date(),
          rawData: matchData,
        },
      });

      console.log(`Updated match summary for match ${matchId}`);
    } catch (error) {
      console.error('Error updating match summary:', error);
    }

    // Process ball data
    let newBallsCount = 0;
    let updatedBallsCount = 0;

    if (balls.length > 0) {
      // Sort the balls by their natural order if possible
      const sortedBalls = [...balls].sort((a: any, b: any) => {
        // Try to get numeric IDs
        const idA = a?.id ? parseInt(a.id) : 0;
        const idB = b?.id ? parseInt(b.id) : 0;
        return idA - idB; // Sort ascending (oldest first)
      });

      // Process each ball with a sequential number
      // First, check if there are existing balls in the database
      const existingBallsCount = await prisma.ballData.count({
        where: { matchId },
      });

      console.log(
        `Found ${existingBallsCount} existing balls in the database for match ${matchId}`
      );

      // Start numbering from after the last existing ball if not force syncing
      let nextBallNumber = forceSync ? 1 : existingBallsCount + 1;

      // Log first ball for debugging
      if (sortedBalls[0]) {
        console.log(
          'First ball sample:',
          JSON.stringify(sortedBalls[0]).substring(0, 100)
        );
      }

      for (const ball of sortedBalls) {
        if (!ball) continue;

        // Generate unique identifier for the ball
        const sportMonkBallId = ball.id ? ball.id.toString() : null;

        // Skip if ball already exists and not force syncing
        let shouldCreate = true;
        if (sportMonkBallId && !forceSync) {
          const existingBall = await prisma.ballData.findFirst({
            where: { sportMonkBallId },
          });

          if (existingBall) {
            console.log(`Ball ${sportMonkBallId} already exists, skipping`);
            shouldCreate = false;
          }
        }

        if (shouldCreate || forceSync) {
          // Parse the ball data
          try {
            // Assign the next sequential ball number
            const ballNumber = nextBallNumber++;

            // Calculate over in cricket notation (e.g., 6.4 = 6 overs and 4 balls)
            const overNumber = Math.floor((ballNumber - 1) / 6);
            const ballInOver = ((ballNumber - 1) % 6) + 1; // 1-6 instead of 0-5
            const overString = `${overNumber}.${ballInOver}`;
            const over = parseFloat(overString);

            console.log(
              `Assigning sequential ball #${ballNumber} (over ${overString}) to ball ID ${
                sportMonkBallId || 'unknown'
              }`
            );

            // Parse runs
            let runs = 0;
            let isFour = false;
            let isSix = false;
            let isWicket = false;

            // Parse from score object first
            if (ball.score && typeof ball.score === 'object') {
              runs = typeof ball.score.runs === 'number' ? ball.score.runs : 0;
              isFour = ball.score.four === true;
              isSix = ball.score.six === true;
              isWicket = ball.score.is_wicket === true;
            }
            // Fallback to direct properties
            else {
              runs = typeof ball.score === 'number' ? ball.score : 0;
              isFour = ball.is_boundary === true && !ball.is_six;
              isSix = ball.is_six === true;
              isWicket = ball.is_wicket === true;
            }

            console.log(
              `Processing ball #${ballNumber} (over ${overString}): runs=${runs}, four=${isFour}, six=${isSix}, wicket=${isWicket}`
            );

            // Get inning number
            let inning = 1;
            if (ball.scoreboard) {
              if (
                typeof ball.scoreboard === 'string' &&
                ball.scoreboard.startsWith('S')
              ) {
                inning = parseInt(ball.scoreboard.replace('S', ''));
              } else if (typeof ball.scoreboard === 'number') {
                inning = ball.scoreboard;
              }
            }

            if (forceSync && sportMonkBallId) {
              // Delete existing ball if force syncing
              await prisma.ballData.deleteMany({
                where: { sportMonkBallId },
              });
              console.log(
                `Deleted existing ball ${sportMonkBallId} for force sync`
              );
            }

            // Create the ball data record
            await prisma.ballData.create({
              data: {
                matchId,
                ballNumber,
                over,
                teamId: ball.team_id ? ball.team_id.toString() : null,
                batsmanId: ball.batsman?.id ? ball.batsman.id.toString() : null,
                bowlerId: ball.bowler?.id ? ball.bowler.id.toString() : null,
                runs,
                isFour,
                isSix,
                isWicket,
                wicketType: ball.wicket_type || null,
                outBatsmanId: ball.batsmanout_id
                  ? ball.batsmanout_id.toString()
                  : null,
                inning,
                sportMonkBallId,
                ballData: ball, // Store the complete ball data for reference
              },
            });

            console.log(
              `Added ball #${ballNumber} (over ${overString}) with runs: ${runs}, wicket: ${isWicket}, four: ${isFour}, six: ${isSix}`
            );

            newBallsCount++;
          } catch (error) {
            console.error('Error processing ball data:', error);
          }
        }
      }
    }

    console.log(
      `Added ${newBallsCount} new balls to the database for match ${matchId}`
    );

    return {
      updatedSummary: true,
      newBallsAdded: newBallsCount,
      updatedBalls: updatedBallsCount,
    };
  } catch (error) {
    console.error('Error syncing live match data:', error);
    return null;
  }
}

/**
 * Retrieves live match data from our database
 * @param matchId Our internal match ID
 */
export async function getLiveMatchData(matchId: string) {
  try {
    console.log(
      `Retrieving live match data from database for match ${matchId}`
    );

    // Get match summary
    const matchSummary = await prisma.matchSummary.findUnique({
      where: { matchId },
    });

    // Get the most recent balls for "recent overs" display
    const recentBalls = await prisma.ballData.findMany({
      where: { matchId },
      orderBy: { timestamp: 'desc' },
      take: 6,
    });

    // Sort balls chronologically for display
    const sortedBalls = [...recentBalls].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Build recent overs string
    const recentOvers = sortedBalls
      .map((ball) => {
        if (ball.isWicket) return 'W';
        if (ball.isSix) return '6';
        if (ball.isFour) return '4';
        return ball.runs.toString();
      })
      .join(' ');

    // Get more comprehensive ball data to find active batsmen and bowlers
    const balls = await prisma.ballData.findMany({
      where: { matchId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Get more data to ensure we find all active players
    });

    // Process batsmen data
    const batsmen = new Map();
    const bowlers = new Map();

    // Track the two most recent batsmen
    let currentBatsman1 = null;
    let currentBatsman2 = null;
    let currentBowler = null;

    // Track last wicket
    let lastWicket = null;

    // Get match summary with raw data to help with batsman/bowler stats
    const rawMatchData = matchSummary?.rawData as any;

    // Extract batting and bowling data from the raw match data
    const rawBattingData = new Map();
    const rawBowlingData = new Map();

    // Extract batting data from raw match data if available
    if (rawMatchData?.batting && Array.isArray(rawMatchData.batting)) {
      console.log(
        `Found ${rawMatchData.batting.length} batting entries in raw data`
      );

      for (const battingEntry of rawMatchData.batting) {
        if (battingEntry.player_id) {
          const playerId = battingEntry.player_id.toString();

          rawBattingData.set(playerId, {
            name:
              battingEntry.batsman?.fullname ||
              battingEntry.batsman?.name ||
              'Unknown Batsman',
            score: battingEntry.score || 0,
            ball: battingEntry.ball || 0,
            fours: battingEntry.four_x || 0,
            sixes: battingEntry.six_x || 0,
            out: !!battingEntry.wicket_id,
            active: battingEntry.active === true,
            raw: battingEntry,
          });

          console.log(
            `Added raw batting data for ${playerId}: ${battingEntry.score}(${battingEntry.ball})`
          );
        }
      }
    }

    // Extract bowling data from raw match data if available
    if (rawMatchData?.bowling && Array.isArray(rawMatchData.bowling)) {
      console.log(
        `Found ${rawMatchData.bowling.length} bowling entries in raw data`
      );

      for (const bowlingEntry of rawMatchData.bowling) {
        if (bowlingEntry.player_id) {
          const playerId = bowlingEntry.player_id.toString();

          rawBowlingData.set(playerId, {
            name:
              bowlingEntry.bowler?.fullname ||
              bowlingEntry.bowler?.name ||
              'Unknown Bowler',
            overs: bowlingEntry.overs || 0,
            maidens: bowlingEntry.medians || 0,
            runs: bowlingEntry.runs || 0,
            wickets: bowlingEntry.wickets || 0,
            active: bowlingEntry.active === true,
            raw: bowlingEntry,
          });

          console.log(
            `Added raw bowling data for ${playerId}: ${bowlingEntry.wickets}/${bowlingEntry.runs} (${bowlingEntry.overs})`
          );
        }
      }
    }

    // Process all balls to extract player stats
    for (const ball of balls) {
      if (!ball.ballData) continue;

      const ballData = ball.ballData as any;

      // Process batsman
      if (ball.batsmanId && ballData.batsman) {
        if (!batsmen.has(ball.batsmanId)) {
          // Initialize batsman stats
          batsmen.set(ball.batsmanId, {
            id: ball.batsmanId,
            name:
              ballData.batsman.fullname ||
              ballData.batsman.name ||
              'Unknown Batsman',
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            out: false,
            active: !!ballData.batsman.active,
            timestamp: ball.timestamp,
            raw: ballData.batsman,
          });
        }

        // Update batsman stats
        const batsmanStats = batsmen.get(ball.batsmanId);
        batsmanStats.runs += ball.runs;
        batsmanStats.balls += 1;
        batsmanStats.fours += ball.isFour ? 1 : 0;
        batsmanStats.sixes += ball.isSix ? 1 : 0;

        // Mark as most recent batsman if not already tracked
        if (!currentBatsman1) {
          currentBatsman1 = batsmanStats;
        } else if (!currentBatsman2 && ball.batsmanId !== currentBatsman1.id) {
          currentBatsman2 = batsmanStats;
        }
      }

      // Process bowler
      if (ball.bowlerId && ballData.bowler) {
        if (!bowlers.has(ball.bowlerId)) {
          // Initialize bowler stats
          bowlers.set(ball.bowlerId, {
            id: ball.bowlerId,
            name:
              ballData.bowler.fullname ||
              ballData.bowler.name ||
              'Unknown Bowler',
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            active: !!ballData.bowler.active,
            timestamp: ball.timestamp,
            raw: ballData.bowler,
          });
        }

        // Update bowler stats
        const bowlerStats = bowlers.get(ball.bowlerId);
        bowlerStats.runs += ball.runs;
        bowlerStats.wickets += ball.isWicket ? 1 : 0;

        // Track number of overs bowled (approximate)
        const ballsInOver = Math.floor(bowlerStats.overs) * 6 + 1;
        if (ballsInOver % 6 === 0) {
          bowlerStats.overs = Math.floor(bowlerStats.overs) + 1;
        } else {
          bowlerStats.overs =
            Math.floor(bowlerStats.overs) + (ballsInOver % 6) / 10;
        }

        // Mark as current bowler if not already tracked
        if (!currentBowler) {
          currentBowler = bowlerStats;
        }
      }

      // Track last wicket
      if (ball.isWicket && !lastWicket) {
        // Try multiple approaches to find the batsman name
        let batsmanName = 'Unknown Batsman';
        let batsmanRuns = 0;

        // First try: Use the out_batsman data if available
        if (ballData.out_batsman) {
          batsmanName =
            ballData.out_batsman.fullname || ballData.out_batsman.name;

          // Try to get runs from raw batting data
          if (ball.outBatsmanId && rawBattingData.has(ball.outBatsmanId)) {
            batsmanRuns = rawBattingData.get(ball.outBatsmanId).score;
          }
        }
        // Second try: Use batsman data directly
        else if (ballData.batsman) {
          batsmanName = ballData.batsman.fullname || ballData.batsman.name;
        }
        // Third try: Use batsmanout_id to find batsman data in our map
        else if (ball.outBatsmanId && batsmen.has(ball.outBatsmanId)) {
          const batsmanStats = batsmen.get(ball.outBatsmanId);
          batsmanName = batsmanStats.name;
          batsmanRuns = batsmanStats.runs;
        }
        // Fourth try: If this ball was played by a batsman we know, use that
        else if (ball.batsmanId && batsmen.has(ball.batsmanId)) {
          const batsmanStats = batsmen.get(ball.batsmanId);
          batsmanName = batsmanStats.name;
          batsmanRuns = batsmanStats.runs;
        }

        // Try to get wicket type
        const wicketType =
          ball.wicketType || (ballData.score && ballData.score.name) || 'out';

        // Try to get bowler name
        let bowlerName = 'Unknown Bowler';
        if (ballData.bowler) {
          bowlerName = ballData.bowler.fullname || ballData.bowler.name;
        } else if (ball.bowlerId && bowlers.has(ball.bowlerId)) {
          bowlerName = bowlers.get(ball.bowlerId).name;
        }

        // Log what we found for debugging
        console.log('Wicket data found:', {
          batsmanName,
          batsmanRuns,
          wicketType,
          bowlerName,
          ballData: JSON.stringify(ballData).substring(0, 200),
        });

        // Now check raw batting data again for more accurate run totals
        if (batsmanRuns === 0 && ball.outBatsmanId) {
          // Try to get more accurate data from raw batting data
          if (rawBattingData.has(ball.outBatsmanId)) {
            const rawBatting = rawBattingData.get(ball.outBatsmanId);
            batsmanRuns = rawBatting.score;

            // If we also don't have a good name, use this one
            if (batsmanName === 'Unknown Batsman') {
              batsmanName = rawBatting.name;
            }

            console.log(
              `Updated wicket data from raw batting data: ${batsmanName} scored ${batsmanRuns}`
            );
          }
          // Check if any player in raw batting data matches this name
          else {
            for (const [id, rawBatting] of Array.from(
              rawBattingData.entries()
            )) {
              if (rawBatting.name === batsmanName) {
                batsmanRuns = rawBatting.score;
                console.log(
                  `Found matching name in raw batting data: ${batsmanName} scored ${batsmanRuns}`
                );
                break;
              }
            }
          }
        }

        lastWicket = {
          batsmanId: ball.outBatsmanId || ball.batsmanId,
          batsmanName,
          runs: batsmanRuns,
          wicketType,
          bowlerName,
        };
      }
    }

    // Convert to array and sort by timestamp (most recent first)
    const batsmenArray = Array.from(batsmen.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const bowlersArray = Array.from(bowlers.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Find active/current batsmen if we couldn't determine from timestamps
    if (!currentBatsman1 && batsmenArray.length > 0) {
      currentBatsman1 = batsmenArray[0];
    }

    if (!currentBatsman2 && batsmenArray.length > 1) {
      currentBatsman2 = batsmenArray[1];
    }

    // Find active/current bowler if we couldn't determine from timestamps
    if (!currentBowler && bowlersArray.length > 0) {
      currentBowler = bowlersArray[0];
    }

    // Format the data for display
    let currentBatsman1Name = 'Waiting for data...';
    let currentBatsman1Score = '0 (0)';
    let currentBatsman2Name = 'Waiting for data...';
    let currentBatsman2Score = '0 (0)';
    let currentBowlerName = 'Waiting for data...';
    let currentBowlerFigures = '0/0 (0.0)';
    let lastWicketText = 'No wickets yet';

    if (currentBatsman1) {
      currentBatsman1Name = currentBatsman1.name;
      currentBatsman1Score = `${currentBatsman1.runs} (${currentBatsman1.balls})`;
      if (currentBatsman1.fours > 0 || currentBatsman1.sixes > 0) {
        currentBatsman1Score += `, ${currentBatsman1.fours}x4, ${currentBatsman1.sixes}x6`;
      }
    }

    if (currentBatsman2) {
      currentBatsman2Name = currentBatsman2.name;
      currentBatsman2Score = `${currentBatsman2.runs} (${currentBatsman2.balls})`;
      if (currentBatsman2.fours > 0 || currentBatsman2.sixes > 0) {
        currentBatsman2Score += `, ${currentBatsman2.fours}x4, ${currentBatsman2.sixes}x6`;
      }
    }

    if (currentBowler) {
      currentBowlerName = currentBowler.name;
      // Format overs to one decimal place
      const overs = Math.floor(currentBowler.overs) + (currentBowler.overs % 1);
      currentBowlerFigures = `${currentBowler.wickets}/${
        currentBowler.runs
      } (${overs.toFixed(1)})`;
    }

    if (lastWicket) {
      lastWicketText = `${lastWicket.batsmanName} ${lastWicket.runs} - ${lastWicket.wicketType} ${lastWicket.bowlerName}`;
    }

    // Format the data for response
    return {
      success: true,
      data: {
        teamAScore: matchSummary?.teamAScore || '0/0',
        teamBScore: matchSummary?.teamBScore || 'Yet to bat',
        overs: matchSummary?.overs || '0.0',
        currentInnings: matchSummary?.currentInnings || 1,
        currentBatsman1: currentBatsman1Name,
        currentBatsman1Score: currentBatsman1Score,
        currentBatsman2: currentBatsman2Name,
        currentBatsman2Score: currentBatsman2Score,
        currentBowler: currentBowlerName,
        currentBowlerFigures: currentBowlerFigures,
        lastWicket: lastWicketText,
        recentOvers,
      },
    };
  } catch (error) {
    console.error('Error retrieving live match data:', error);
    return { success: false, error: 'Failed to retrieve live match data' };
  }
}

/**
 * Gets the most recent balls for a match
 * @param matchId Our internal match ID
 * @param count Number of balls to retrieve (default: 6)
 */
export async function getRecentBalls(matchId: string, count: number = 6) {
  try {
    const balls = await prisma.ballData.findMany({
      where: { matchId },
      orderBy: { timestamp: 'desc' },
      take: count,
    });

    return {
      success: true,
      data: balls.sort(
        (a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
    };
  } catch (error) {
    console.error('Error retrieving recent balls:', error);
    return { success: false, error: 'Failed to retrieve recent balls' };
  }
}
