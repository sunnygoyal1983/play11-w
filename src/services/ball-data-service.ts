import { prisma } from '@/lib/prisma';
import { fetchLiveMatchDetails } from './live-scoring-service';

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
        }

        if (teamBScoreData) {
          teamBScore = `${teamBScoreData.score || 0}/${
            teamBScoreData.wickets || 0
          }`;
        }

        // Determine current innings
        currentInnings =
          Math.max(...matchData.runs.map((r: any) => r.inning)) || 1;

        // Set overs based on current innings
        const currentInningsData = matchData.runs.find(
          (r: any) => r.inning === currentInnings
        );

        if (currentInningsData && currentInningsData.overs) {
          overs = currentInningsData.overs.toString();
          console.log(
            `Setting overs to ${overs} based on current innings ${currentInnings}`
          );
        } else if (
          teamBScoreData &&
          teamBScoreData.overs &&
          currentInnings > 1
        ) {
          // Fallback for second innings
          overs = teamBScoreData.overs.toString();
          console.log(`Fallback: Setting overs to ${overs} for second innings`);
        } else if (teamAScoreData && teamAScoreData.overs) {
          // Fallback for first innings
          overs = teamAScoreData.overs.toString();
          console.log(`Fallback: Setting overs to ${overs} for first innings`);
        }
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
 * Retrieves live match data from our database, prioritizing rawData for accuracy.
 * @param matchId Our internal match ID
 */
export async function getLiveMatchData(matchId: string) {
  try {
    console.log(
      `Retrieving live match data from database for match ${matchId}`
    );

    // Get match summary (which includes rawData)
    const matchSummary = await prisma.matchSummary.findUnique({
      where: { matchId },
    });

    // --- START: Data Initialization ---
    let teamAScore = matchSummary?.teamAScore || '0/0';
    let teamBScore = matchSummary?.teamBScore || 'Yet to bat';
    let overs = matchSummary?.overs || '0.0';
    let currentInnings = matchSummary?.currentInnings || 1;
    let currentBatsman1Name = 'Waiting for data...';
    let currentBatsman1Score = '0 (0)';
    let currentBatsman2Name = 'Waiting for data...';
    let currentBatsman2Score = '0 (0)';
    let currentBowlerName = 'Waiting for data...';
    let currentBowlerFigures = '0/0 (0.0)';
    let lastWicketText = 'No wickets yet';
    let recentOvers = '';
    let teamAName = 'Team A';
    let teamBName = 'Team B';
    // --- END: Data Initialization ---

    // --- START: Process Recent Balls ---
    // Get the most recent balls for "recent overs" display
    const recentBalls = await prisma.ballData.findMany({
      where: { matchId },
      orderBy: { timestamp: 'desc' }, // Get most recent first
      take: 6,
    });

    // Sort recent balls chronologically for display
    const sortedRecentBalls = [...recentBalls].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Build recent overs string
    recentOvers = sortedRecentBalls
      .map((ball) => {
        if (ball.isWicket) return 'W';
        if (ball.isSix) return '6';
        if (ball.isFour) return '4';
        return ball.runs.toString();
      })
      .join(' ');
    // --- END: Process Recent Balls ---

    // --- START: Process Active Players & Last Wicket using rawData ---
    const rawMatchData = matchSummary?.rawData as any;

    if (rawMatchData) {
      console.log(`Processing rawData from MatchSummary for match ${matchId}`);

      // ENHANCED: Extract team names if available - check all possible locations and properties
      console.log('Attempting to extract team names from raw match data...');

      // Check in localteam and visitorteam objects
      if (rawMatchData.localteam) {
        if (
          typeof rawMatchData.localteam.name === 'string' &&
          rawMatchData.localteam.name.trim()
        ) {
          teamAName = rawMatchData.localteam.name;
          console.log(`Found team A name from localteam.name: ${teamAName}`);
        } else if (
          typeof rawMatchData.localteam.code === 'string' &&
          rawMatchData.localteam.code.trim()
        ) {
          teamAName = rawMatchData.localteam.code;
          console.log(`Found team A name from localteam.code: ${teamAName}`);
        } else if (rawMatchData.localteam.fullname) {
          teamAName = rawMatchData.localteam.fullname;
          console.log(
            `Found team A name from localteam.fullname: ${teamAName}`
          );
        }
      }

      if (rawMatchData.visitorteam) {
        if (
          typeof rawMatchData.visitorteam.name === 'string' &&
          rawMatchData.visitorteam.name.trim()
        ) {
          teamBName = rawMatchData.visitorteam.name;
          console.log(`Found team B name from visitorteam.name: ${teamBName}`);
        } else if (
          typeof rawMatchData.visitorteam.code === 'string' &&
          rawMatchData.visitorteam.code.trim()
        ) {
          teamBName = rawMatchData.visitorteam.code;
          console.log(`Found team B name from visitorteam.code: ${teamBName}`);
        } else if (rawMatchData.visitorteam.fullname) {
          teamBName = rawMatchData.visitorteam.fullname;
          console.log(
            `Found team B name from visitorteam.fullname: ${teamBName}`
          );
        }
      }

      // ADDITIONAL FALLBACK: Check directly from team data if available
      if (
        teamAName === 'Team A' &&
        rawMatchData.teams &&
        Array.isArray(rawMatchData.teams)
      ) {
        const teamA = rawMatchData.teams.find(
          (team: any) =>
            team.id?.toString() === rawMatchData.localteam?.id?.toString()
        );
        if (teamA?.name) {
          teamAName = teamA.name;
          console.log(`Found team A name from teams array: ${teamAName}`);
        }
      }

      if (
        teamBName === 'Team B' &&
        rawMatchData.teams &&
        Array.isArray(rawMatchData.teams)
      ) {
        const teamB = rawMatchData.teams.find(
          (team: any) =>
            team.id?.toString() === rawMatchData.visitorteam?.id?.toString()
        );
        if (teamB?.name) {
          teamBName = teamB.name;
          console.log(`Found team B name from teams array: ${teamBName}`);
        }
      }

      // Also update the Match entity with the extracted team names if they're better than what we have
      if (teamAName !== 'Team A' || teamBName !== 'Team B') {
        try {
          await prisma.match.update({
            where: { id: matchId },
            data: {
              teamAName: teamAName !== 'Team A' ? teamAName : undefined,
              teamBName: teamBName !== 'Team B' ? teamBName : undefined,
            },
          });
          console.log(
            `Updated Match record with team names: ${teamAName} vs ${teamBName}`
          );
        } catch (error) {
          console.error('Failed to update Match with team names:', error);
        }
      }

      // 1. Find active batsmen from rawData.batting
      // First try active flag
      let activeBatsmen = (rawMatchData.batting || [])
        .filter((b: any) => b.active === true)
        .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0)); // Sort by 'sort' field

      // If no active batsmen found, try batters with highest sort order in current innings
      if (activeBatsmen.length < 2) {
        console.log(
          `Not enough active batsmen found, trying alternative approach`
        );

        // Determine current innings/scoreboard
        const currentInningsNumber = Math.max(
          ...(rawMatchData.runs || []).map((r: any) => r.inning || 1)
        );
        const currentScoreboard = `S${currentInningsNumber}`;

        // Find batsmen from current innings sorted by sort order (descending)
        // This will get us the most recent batsmen
        const sortedBatsmen = (rawMatchData.batting || [])
          .filter(
            (b: any) => b.scoreboard === currentScoreboard && !b.wicket_id
          )
          .sort((a: any, b: any) => (b.sort || 0) - (a.sort || 0)); // Reverse sort

        if (sortedBatsmen.length > 0) {
          activeBatsmen = sortedBatsmen.slice(0, 2); // Take top 2
          console.log(
            `Using alternative approach: found ${activeBatsmen.length} recent batsmen`
          );
        }
      }

      // ADDITIONAL FALLBACK - If still no batsmen found, try using recent ball data
      if (activeBatsmen.length < 2) {
        console.log(`Still missing batsmen, trying ball data approach`);

        // Get the most recent balls to find batsmen
        const recentBalls = await prisma.ballData.findMany({
          where: {
            matchId,
            isWicket: false, // Exclude wicket balls to focus on recent active play
          },
          orderBy: { timestamp: 'desc' },
          take: 10, // Get more recent balls
        });

        // Extract unique batsman IDs from recent balls
        const recentBatsmenIds = new Set<string>();
        for (const ball of recentBalls) {
          if (ball.batsmanId) {
            recentBatsmenIds.add(ball.batsmanId);
            if (recentBatsmenIds.size >= 2) break; // Once we have 2 batsmen, stop
          }
        }

        console.log(`Found ${recentBatsmenIds.size} batsmen from recent balls`);

        // Find these batsmen in the rawData or use ball data
        if (recentBatsmenIds.size > 0) {
          // Convert Set to Array for processing
          const batsmenIdsArray = Array.from(recentBatsmenIds);
          const tempBatsmen = [];

          for (const batsmanId of batsmenIdsArray) {
            // Try to find in raw batting data first
            const rawBatsman = (rawMatchData.batting || []).find(
              (b: any) =>
                b.player_id?.toString() === batsmanId ||
                b.batsman?.id?.toString() === batsmanId
            );

            if (rawBatsman) {
              // Found in raw data, use this
              tempBatsmen.push(rawBatsman);
            } else {
              // Not found in raw data, create a minimal object with ID for name resolution
              const mostRecentBall = recentBalls.find(
                (ball) => ball.batsmanId === batsmanId
              );
              if (mostRecentBall?.ballData) {
                const ballData = mostRecentBall.ballData as any;

                // Create temporary batsman object with basic info
                tempBatsmen.push({
                  player_id: batsmanId,
                  batsman: ballData.batsman, // Use batsman details from ball if available
                  score: 0, // We don't know the score yet
                  ball: 0, // We don't know the balls faced
                  isFromBallData: true, // Flag that this is from ball data not batting list
                });
              }
            }
          }

          if (tempBatsmen.length > 0) {
            activeBatsmen = tempBatsmen;
            console.log(
              `Using batsmen from ball data: found ${activeBatsmen.length}`
            );
          }
        }
      }

      // LAST RESORT - If we still have no batsmen, try to use lineup data from batting team
      if (activeBatsmen.length < 2 && rawMatchData.lineup) {
        console.log(`Last resort: trying to use lineup data`);

        // Determine current batting team ID (team with lowest innings number typically)
        let battingTeamId = null;
        if (rawMatchData.runs && rawMatchData.runs.length > 0) {
          // Get team with most recent innings
          const currentInningsNumber = Math.max(
            ...rawMatchData.runs.map((r: any) => r.inning || 1)
          );

          const currentInningsRun = rawMatchData.runs.find(
            (r: any) => r.inning === currentInningsNumber
          );

          if (currentInningsRun) {
            battingTeamId = currentInningsRun.team_id?.toString();
            console.log(`Determined batting team ID: ${battingTeamId}`);
          }
        }

        if (battingTeamId) {
          // Get batsmen from lineup who belong to the batting team
          const teamLineup = rawMatchData.lineup.filter(
            (p: any) => p.lineup?.team_id?.toString() === battingTeamId
          );

          if (teamLineup.length >= 2) {
            // Just take the first two batsmen from lineup as placeholders
            // This is our last resort, so it's better than nothing
            activeBatsmen = teamLineup.slice(0, 2).map((player: any) => ({
              player_id: player.id?.toString(),
              batsman: {
                fullname: player.fullname,
                name: player.name,
              },
              score: 0,
              ball: 0,
              isFromLineup: true, // Flag that this is from lineup, not batting list
            }));

            console.log(
              `Using lineup data: found ${activeBatsmen.length} batsmen`
            );
          }
        }
      }

      console.log(`Found total of ${activeBatsmen.length} batsmen to display`);

      if (activeBatsmen.length > 0) {
        const batsman1 = activeBatsmen[0];

        // Enhanced player name resolution - first try the batsman object, then check lineup
        let batsman1NameResolved = false;

        // First check if the batsman object has name info
        if (batsman1?.batsman?.fullname || batsman1?.batsman?.name) {
          currentBatsman1Name =
            batsman1.batsman.fullname || batsman1.batsman.name;
          batsman1NameResolved = true;
          console.log(
            `Resolved batsman1 name from batsman object: ${currentBatsman1Name}`
          );
        }

        // If not resolved, try to find in lineup
        if (
          !batsman1NameResolved &&
          rawMatchData.lineup &&
          batsman1?.player_id
        ) {
          const playerInLineup = rawMatchData.lineup.find(
            (p: any) => p.id?.toString() === batsman1.player_id?.toString()
          );

          if (playerInLineup) {
            currentBatsman1Name =
              playerInLineup.fullname || playerInLineup.name;
            batsman1NameResolved = true;
            console.log(
              `Resolved batsman1 name from lineup: ${currentBatsman1Name}`
            );
          }
        }

        // Last resort - if still not resolved, look in our database
        if (!batsman1NameResolved && batsman1?.player_id) {
          try {
            const player = await prisma.player.findUnique({
              where: { sportMonkId: batsman1.player_id.toString() },
              select: { name: true },
            });

            if (player?.name) {
              currentBatsman1Name = player.name;
              batsman1NameResolved = true;
              console.log(
                `Resolved batsman1 name from database: ${currentBatsman1Name}`
              );
            }
          } catch (err) {
            console.error('Error looking up batsman1 name in database:', err);
          }
        }

        // If still not resolved, use a nicer display for the ID
        if (!batsman1NameResolved) {
          currentBatsman1Name = `Batsman ${batsman1?.player_id || 'Unknown'}`;
        }

        currentBatsman1Score = formatBatsmanScore(batsman1);
      }

      if (activeBatsmen.length > 1) {
        const batsman2 = activeBatsmen[1];

        // Enhanced player name resolution for batsman2 - same approach as above
        let batsman2NameResolved = false;

        if (batsman2?.batsman?.fullname || batsman2?.batsman?.name) {
          currentBatsman2Name =
            batsman2.batsman.fullname || batsman2.batsman.name;
          batsman2NameResolved = true;
          console.log(
            `Resolved batsman2 name from batsman object: ${currentBatsman2Name}`
          );
        }

        if (
          !batsman2NameResolved &&
          rawMatchData.lineup &&
          batsman2?.player_id
        ) {
          const playerInLineup = rawMatchData.lineup.find(
            (p: any) => p.id?.toString() === batsman2.player_id?.toString()
          );

          if (playerInLineup) {
            currentBatsman2Name =
              playerInLineup.fullname || playerInLineup.name;
            batsman2NameResolved = true;
            console.log(
              `Resolved batsman2 name from lineup: ${currentBatsman2Name}`
            );
          }
        }

        if (!batsman2NameResolved && batsman2?.player_id) {
          try {
            const player = await prisma.player.findUnique({
              where: { sportMonkId: batsman2.player_id.toString() },
              select: { name: true },
            });

            if (player?.name) {
              currentBatsman2Name = player.name;
              batsman2NameResolved = true;
              console.log(
                `Resolved batsman2 name from database: ${currentBatsman2Name}`
              );
            }
          } catch (err) {
            console.error('Error looking up batsman2 name in database:', err);
          }
        }

        if (!batsman2NameResolved) {
          currentBatsman2Name = `Batsman ${batsman2?.player_id || 'Unknown'}`;
        }

        currentBatsman2Score = formatBatsmanScore(batsman2);
      }

      // 2. Find active bowler from rawData.bowling - using enhanced approach
      let activeBowler = (rawMatchData.bowling || []).find(
        (b: any) => b.active === true
      );

      // If no active bowler found, get the one with highest sort order or most recent overs
      if (!activeBowler) {
        console.log(`No active bowler found, trying alternative approach`);

        // Determine current innings/scoreboard
        const currentInningsNumber = Math.max(
          ...(rawMatchData.runs || []).map((r: any) => r.inning || 1)
        );
        const currentScoreboard = `S${currentInningsNumber}`;

        // Find bowlers from current innings sorted by sort order or overs (descending)
        const sortedBowlers = (rawMatchData.bowling || [])
          .filter((b: any) => b.scoreboard === currentScoreboard)
          .sort((a: any, b: any) => {
            // If we have sort field, use that
            if (typeof a.sort === 'number' && typeof b.sort === 'number') {
              return (b.sort || 0) - (a.sort || 0);
            }
            // Otherwise sort by overs bowled
            const oversA = parseFloat(a.overs || '0');
            const oversB = parseFloat(b.overs || '0');
            return oversB - oversA;
          });

        if (sortedBowlers.length > 0) {
          activeBowler = sortedBowlers[0];
          console.log(`Using alternative approach: found recent bowler`);
        }
      }

      console.log(`Found active bowler in rawData: ${!!activeBowler}`);

      if (activeBowler) {
        // Enhanced bowler name resolution - same approach as batsmen
        let bowlerNameResolved = false;

        if (activeBowler?.bowler?.fullname || activeBowler?.bowler?.name) {
          currentBowlerName =
            activeBowler.bowler.fullname || activeBowler.bowler.name;
          bowlerNameResolved = true;
          console.log(
            `Resolved bowler name from bowler object: ${currentBowlerName}`
          );
        }

        if (
          !bowlerNameResolved &&
          rawMatchData.lineup &&
          activeBowler?.player_id
        ) {
          const playerInLineup = rawMatchData.lineup.find(
            (p: any) => p.id?.toString() === activeBowler.player_id?.toString()
          );

          if (playerInLineup) {
            currentBowlerName = playerInLineup.fullname || playerInLineup.name;
            bowlerNameResolved = true;
            console.log(
              `Resolved bowler name from lineup: ${currentBowlerName}`
            );
          }
        }

        if (!bowlerNameResolved && activeBowler?.player_id) {
          try {
            const player = await prisma.player.findUnique({
              where: { sportMonkId: activeBowler.player_id.toString() },
              select: { name: true },
            });

            if (player?.name) {
              currentBowlerName = player.name;
              bowlerNameResolved = true;
              console.log(
                `Resolved bowler name from database: ${currentBowlerName}`
              );
            }
          } catch (err) {
            console.error('Error looking up bowler name in database:', err);
          }
        }

        if (!bowlerNameResolved) {
          currentBowlerName = `Bowler ${activeBowler?.player_id || 'Unknown'}`;
        }

        currentBowlerFigures = formatBowlerFigures(activeBowler);
      }

      // 3. Find last wicket information
      const lastWicketBall = await prisma.ballData.findFirst({
        where: { matchId, isWicket: true },
        orderBy: { timestamp: 'desc' }, // Most recent wicket
      });

      if (lastWicketBall?.ballData) {
        console.log(
          `Found last wicket ball: ID ${lastWicketBall.sportMonkBallId}, BatsmanOutID: ${lastWicketBall.outBatsmanId}`
        );
        const wicketBallData = lastWicketBall.ballData as any;

        // Determine the ID of the batsman who got out
        const outBatsmanId =
          lastWicketBall.outBatsmanId || // From our parsed BallData field
          wicketBallData.batsmanout_id?.toString() || // From raw ball data
          wicketBallData.batsman?.id?.toString(); // Fallback to batsman on that ball if out ID missing

        let batsmanName = 'Unknown Batsman';
        let batsmanScore = '0 (0)';
        let wicketType =
          wicketBallData.wicket_type || wicketBallData.score?.name || 'out'; // Try different fields for type
        let bowlerName = 'Unknown Bowler';

        console.log(`Processing last wicket for batsman ID ${outBatsmanId}`);

        // Find the dismissed batsman's definitive stats from rawData using the ID
        const dismissedBatsmanData = (rawMatchData.batting || []).find(
          (b: any) => b.player_id?.toString() === outBatsmanId
        );

        // First try to get name and score from rawData.batting
        if (dismissedBatsmanData) {
          console.log(`Found dismissed batsman (${outBatsmanId}) in rawData`);

          // Try batsman object
          if (
            dismissedBatsmanData.batsman?.fullname ||
            dismissedBatsmanData.batsman?.name
          ) {
            batsmanName =
              dismissedBatsmanData.batsman.fullname ||
              dismissedBatsmanData.batsman.name;
          }

          batsmanScore = formatBatsmanScore(dismissedBatsmanData);
        }
        // If not found in batting data, try the wicket ball itself
        else if (wicketBallData.out_batsman) {
          batsmanName =
            wicketBallData.out_batsman.fullname ||
            wicketBallData.out_batsman.name;
        } else if (wicketBallData.batsman) {
          batsmanName =
            wicketBallData.batsman.fullname || wicketBallData.batsman.name;
        }

        // Still no name? Try lineup
        if (
          batsmanName === 'Unknown Batsman' &&
          rawMatchData.lineup &&
          outBatsmanId
        ) {
          const playerInLineup = rawMatchData.lineup.find(
            (p: any) => p.id?.toString() === outBatsmanId
          );

          if (playerInLineup) {
            batsmanName = playerInLineup.fullname || playerInLineup.name;
          }
        }

        // Last resort - database lookup
        if (batsmanName === 'Unknown Batsman' && outBatsmanId) {
          try {
            const player = await prisma.player.findUnique({
              where: { sportMonkId: outBatsmanId },
              select: { name: true },
            });

            if (player?.name) {
              batsmanName = player.name;
            }
          } catch (err) {
            console.log(
              'Error looking up last wicket batsman name in database:',
              err
            );
          }
        }

        // Get bowler name - try multiple sources
        if (wicketBallData.bowler) {
          bowlerName =
            wicketBallData.bowler.fullname || wicketBallData.bowler.name;
        }

        // Construct the last wicket string (adjust format as needed)
        lastWicketText = `${batsmanName} ${batsmanScore} - ${wicketType} ${
          bowlerName !== 'Unknown Bowler' ? 'b ' + bowlerName : ''
        }`;
        console.log(`Formatted last wicket text: ${lastWicketText}`);
      }
    } else {
      console.warn(`No rawMatchData found in MatchSummary for ${matchId}`);
    }
    // --- END: Process Active Players & Last Wicket ---

    // Format the final data for response
    return {
      success: true,
      data: {
        teamAName,
        teamBName,
        teamAScore,
        teamBScore,
        overs,
        currentInnings,
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

// Helper function to safely get player name
function getPlayerName(playerObj: any, defaultName: string): string {
  return playerObj?.fullname || playerObj?.name || defaultName;
}

// Helper function to format batsman score string
function formatBatsmanScore(batsmanData: any): string {
  if (!batsmanData) return '0 (0)';

  // If this is from ball data or lineup, show "batting" instead of a zero score
  if (batsmanData.isFromBallData || batsmanData.isFromLineup) {
    return 'batting';
  }

  // Check if we have actual score data
  const hasRuns = typeof batsmanData.score === 'number' || batsmanData.score;
  const hasBalls = typeof batsmanData.ball === 'number' || batsmanData.ball;

  // If no actual score data, return "batting"
  if (!hasRuns && !hasBalls) {
    return 'batting';
  }

  // Format with available data
  let score = `${batsmanData.score || 0} (${batsmanData.ball || 0})`;
  if (batsmanData.four_x) score += `, ${batsmanData.four_x}x4`;
  if (batsmanData.six_x) score += `, ${batsmanData.six_x}x6`;
  return score;
}

// Helper function to format bowler figures string
function formatBowlerFigures(bowlerData: any): string {
  if (!bowlerData) return '0/0 (0.0)';
  const oversNum = parseFloat(bowlerData.overs || '0');
  // Ensure standard cricket over notation (e.g., 6 balls = 1.0 over, not 0.6)
  const completedOvers = Math.floor(oversNum);
  const ballsInCurrentOver = Math.round((oversNum - completedOvers) * 10); // Extract balls safely
  const displayOvers = `${completedOvers}.${ballsInCurrentOver}`;

  return `${bowlerData.wickets || 0}/${bowlerData.runs || 0} (${displayOvers})`;
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
