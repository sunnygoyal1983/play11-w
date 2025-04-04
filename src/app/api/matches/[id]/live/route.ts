import { NextResponse } from 'next/server';
import { fetchLiveMatchDetails } from '@/services/live-scoring-service';
import {
  getLiveMatchData,
  syncLiveMatchData,
} from '@/services/ball-data-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Fetching live data for match: ${params.id}`);

    // Get match from our database first
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
        teamAId: true,
        teamBId: true,
        status: true,
        sportMonkId: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // If we have a SportMonk ID, use it to fetch live data
    const sportMonkId = match.sportMonkId || params.id;

    try {
      // IMPROVED APPROACH: First try to get data from our database
      const localData = await getLiveMatchData(match.id);

      // Check if we have valid local data
      const isLocalDataValid =
        localData?.success &&
        localData.data?.teamAScore &&
        localData.data?.recentOvers;

      // If we have valid local data, return it
      if (isLocalDataValid) {
        console.log(`Using local database data for match ${match.id}`);

        // Check if data is stale (older than 30 seconds)
        const matchSummary = await prisma.matchSummary.findUnique({
          where: { matchId: match.id },
          select: { lastUpdated: true },
        });

        const now = new Date();
        const lastUpdated = matchSummary?.lastUpdated || new Date(0);
        const dataAge = now.getTime() - lastUpdated.getTime();

        // If data is stale, trigger a background sync
        if (dataAge > 30000) {
          // 30 seconds
          console.log(
            `Data is stale (${dataAge}ms old), triggering background sync`
          );
          // Don't await - let it happen in the background
          syncLiveMatchData(match.id, sportMonkId).catch((err) => {
            console.error('Background sync failed:', err);
          });
        }

        return NextResponse.json(
          { success: true, data: localData.data },
          { status: 200 }
        );
      }

      // If database approach failed, fall back to direct API call
      console.log(
        `No valid local data found, fetching directly from SportMonks API`
      );

      // Fetch match details from SportMonk API
      const matchData = await fetchLiveMatchDetails(sportMonkId);

      // Process SportMonk live data
      console.log('Processing SportMonk live data');

      // Process scores and innings state
      let teamAScore = 'Yet to bat';
      let teamBScore = 'Yet to bat';
      let currentInnings = 1;
      let overs = '0.0';
      let currentBatsman1 = '';
      let currentBatsman1Score = '';
      let currentBatsman2 = '';
      let currentBatsman2Score = '';
      let currentBowler = '';
      let currentBowlerFigures = '';
      let lastWicket = '';
      let recentOvers = '';

      // Get scores from runs data
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
      } else if (matchData.scoreboards && matchData.scoreboards.length > 0) {
        // Fallback to scoreboards if runs data is not available
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

      // Extract current batsmen information from batting data
      if (matchData.batting && matchData.batting.length > 0) {
        console.log(
          `Found ${matchData.batting.length} batting records, processing for active batsmen...`
        );

        // Print first few batting records for debugging
        matchData.batting.slice(0, 3).forEach((b: any, i: number) => {
          console.log(
            `Batting record ${i}:`,
            JSON.stringify({
              id: b.id,
              player_id: b.player_id,
              active: b.active,
              score: b.score,
              ball: b.ball,
              sort: b.sort,
              batsman_id: b.batsman_id,
              scoreboard: b.scoreboard,
            })
          );
        });

        // Try multiple approaches to find active batsmen
        // 1. Look for 'active' field first
        let activeBatsmen = matchData.batting.filter(
          (b: any) => b.active === true
        );

        // 2. If no active batsmen found, check for highest sort values in current scoreboard
        if (activeBatsmen.length < 2) {
          console.log(
            "No active batsmen found with 'active' field, trying sort order..."
          );
          // Find the current scoreboard (usually the highest one)
          const currentScoreboard = Math.max(
            ...matchData.batting
              .map((b: any) => b.scoreboard || 'S1')
              .filter(Boolean)
          );
          console.log(`Using current scoreboard: ${currentScoreboard}`);

          // Sort by 'sort' field (batting order) and take the last two (most recent)
          const sortedBatsmen = matchData.batting
            .filter((b: any) => b.scoreboard === currentScoreboard)
            .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));

          if (sortedBatsmen.length >= 2) {
            console.log(
              `Found ${sortedBatsmen.length} sorted batsmen for current innings`
            );
            activeBatsmen = sortedBatsmen.slice(-2); // Take the last 2 batsmen
          }
        }

        // 3. If still not enough, just take the most recent batsmen by ID
        if (activeBatsmen.length < 2) {
          console.log(
            'Still not enough active batsmen, using most recent by ID...'
          );
          activeBatsmen = matchData.batting
            .sort((a: any, b: any) => (b.id || 0) - (a.id || 0))
            .slice(0, 2);
        }

        console.log(
          `Found ${activeBatsmen.length} active batsmen after all checks`
        );

        if (activeBatsmen.length > 0) {
          // For first batsman
          if (activeBatsmen[0]) {
            const batsman = activeBatsmen[0];
            // Try multiple paths to get player name
            const playerId = batsman.player_id || batsman.batsman_id;

            // Try to find player name in lineup first
            let batsmanName = 'Batsman 1';
            if (matchData.lineup && matchData.lineup.length > 0) {
              const playerData = matchData.lineup.find(
                (p: any) => p.id === playerId
              );
              if (playerData) {
                batsmanName =
                  playerData.fullname || playerData.name || 'Batsman 1';
              }
            }

            // Fallback to database lookup
            if (batsmanName === 'Batsman 1') {
              try {
                const player = await prisma.player.findUnique({
                  where: { sportMonkId: playerId?.toString() },
                  select: { name: true },
                });
                if (player?.name) {
                  batsmanName = player.name;
                }
              } catch (err) {
                console.log('Error looking up player name:', err);
              }
            }

            // Last resort - try to get name from batsman object
            if (batsmanName === 'Batsman 1' && batsman.batsman) {
              batsmanName =
                batsman.batsman.fullname || batsman.batsman.name || 'Batsman 1';
            }

            currentBatsman1 = batsmanName;
            currentBatsman1Score = `${batsman.score || 0} (${
              batsman.ball || 0
            })`;
            if (batsman.four_x) currentBatsman1Score += `, ${batsman.four_x}x4`;
            if (batsman.six_x) currentBatsman1Score += `, ${batsman.six_x}x6`;
          }

          // For second batsman
          if (activeBatsmen.length > 1 && activeBatsmen[1]) {
            const batsman = activeBatsmen[1];
            const playerId = batsman.player_id || batsman.batsman_id;

            // Try to find player name in lineup first
            let batsmanName = 'Batsman 2';
            if (matchData.lineup && matchData.lineup.length > 0) {
              const playerData = matchData.lineup.find(
                (p: any) => p.id === playerId
              );
              if (playerData) {
                batsmanName =
                  playerData.fullname || playerData.name || 'Batsman 2';
              }
            }

            // Fallback to database lookup
            if (batsmanName === 'Batsman 2') {
              try {
                const player = await prisma.player.findUnique({
                  where: { sportMonkId: playerId?.toString() },
                  select: { name: true },
                });
                if (player?.name) {
                  batsmanName = player.name;
                }
              } catch (err) {
                console.log('Error looking up player name:', err);
              }
            }

            // Last resort - try to get name from batsman object
            if (batsmanName === 'Batsman 2' && batsman.batsman) {
              batsmanName =
                batsman.batsman.fullname || batsman.batsman.name || 'Batsman 2';
            }

            currentBatsman2 = batsmanName;
            currentBatsman2Score = `${batsman.score || 0} (${
              batsman.ball || 0
            })`;
            if (batsman.four_x) currentBatsman2Score += `, ${batsman.four_x}x4`;
            if (batsman.six_x) currentBatsman2Score += `, ${batsman.six_x}x6`;
          }
        }

        // Find the last wicket - get most recently out batsman
        const wickets = matchData.batting
          .filter((b: any) => b.wicket_id && b.wicket_id !== 84) // 84 seems to be not out
          .sort((a: any, b: any) => b.id - a.id); // Sort by ID, higher is more recent

        if (wickets.length > 0) {
          const lastWicketData = wickets[0];
          const playerId =
            lastWicketData.player_id || lastWicketData.batsman_id;

          // Try to find player name in lineup first
          let batsmanName = 'Batsman';
          if (matchData.lineup && matchData.lineup.length > 0) {
            const playerData = matchData.lineup.find(
              (p: any) => p.id === playerId
            );
            if (playerData) {
              batsmanName = playerData.fullname || playerData.name || 'Batsman';
            }
          }

          // Fallback to database lookup
          if (batsmanName === 'Batsman') {
            try {
              const player = await prisma.player.findUnique({
                where: { sportMonkId: playerId?.toString() },
                select: { name: true },
              });
              if (player?.name) {
                batsmanName = player.name;
              }
            } catch (err) {
              console.log('Error looking up player name:', err);
            }
          }

          const howOut =
            lastWicketData.how_out || lastWicketData.wicket_id === 54
              ? 'caught'
              : lastWicketData.wicket_id === 55
              ? 'bowled'
              : lastWicketData.wicket_id === 56
              ? 'lbw'
              : 'out';

          lastWicket = `${batsmanName} ${lastWicketData.score || 0} (${
            lastWicketData.ball || 0
          }) - ${howOut}`;
        }
      }

      // Extract current bowler information from bowling data
      if (matchData.bowling && matchData.bowling.length > 0) {
        console.log(
          `Found ${matchData.bowling.length} bowling records, processing for active bowler...`
        );

        // Print first few bowling records for debugging
        matchData.bowling.slice(0, 3).forEach((b: any, i: number) => {
          console.log(
            `Bowling record ${i}:`,
            JSON.stringify({
              id: b.id,
              player_id: b.player_id,
              active: b.active,
              overs: b.overs,
              wickets: b.wickets,
              runs: b.runs,
              sort: b.sort,
              scoreboard: b.scoreboard,
            })
          );
        });

        // Find the current innings scoreboard
        const currentInningsNumber = Math.max(
          ...matchData.runs.map((r: any) => r.inning || 1)
        );
        const currentInningsScoreboard = `S${currentInningsNumber}`;
        console.log(
          `Current innings is ${currentInningsNumber}, scoreboard: ${currentInningsScoreboard}`
        );

        // Try different approaches to find active bowler
        let activeBowlers: any[] = [];

        // 1. Look for active status first
        activeBowlers = matchData.bowling.filter(
          (b: any) =>
            b.active === true && b.scoreboard === currentInningsScoreboard
        );

        // 2. If no active bowlers found with active flag, find the bowler with highest overs
        if (activeBowlers.length === 0) {
          console.log(
            "No active bowlers found with 'active' flag, trying highest overs..."
          );

          // Filter bowlers from current innings
          const currentInningsBowlers = matchData.bowling.filter(
            (b: any) => b.scoreboard === currentInningsScoreboard
          );

          if (currentInningsBowlers.length > 0) {
            // Sort by overs bowled (descending) to find the bowler who bowled most recently
            activeBowlers = [
              [...currentInningsBowlers].sort((a: any, b: any) => {
                // Parse overs as number for proper comparison
                const oversA = parseFloat(a.overs || 0);
                const oversB = parseFloat(b.overs || 0);
                return oversB - oversA;
              })[0],
            ].filter(Boolean);
          }
        }

        // 3. If still nothing, try with sort order
        if (activeBowlers.length === 0) {
          console.log(
            'No bowlers found with highest overs, trying sort order...'
          );

          // Get bowlers from current innings and sort by 'sort' field
          const sortedBowlers = matchData.bowling
            .filter((b: any) => b.scoreboard === currentInningsScoreboard)
            .sort((a: any, b: any) => (b.sort || 0) - (a.sort || 0));

          if (sortedBowlers.length > 0) {
            activeBowlers = [sortedBowlers[0]];
          }
        }

        // 4. Last resort - use most recent bowler by ID
        if (activeBowlers.length === 0) {
          console.log('Still no bowlers found, using most recent by ID...');
          activeBowlers = [
            matchData.bowling.sort(
              (a: any, b: any) => (b.id || 0) - (a.id || 0)
            )[0],
          ].filter(Boolean);
        }

        console.log(
          `Found ${activeBowlers.length} active bowlers after all checks`
        );

        if (activeBowlers.length > 0) {
          const bowler = activeBowlers[0];
          console.log(
            'Selected bowler:',
            JSON.stringify({
              id: bowler.id,
              player_id: bowler.player_id,
              overs: bowler.overs,
              wickets: bowler.wickets,
              runs: bowler.runs,
            })
          );

          const playerId = bowler.player_id || bowler.bowler_id;

          console.log(`Processing active bowler with ID: ${playerId}`);

          // Try to find player name in lineup first
          let bowlerName = 'Bowler';
          if (matchData.lineup && matchData.lineup.length > 0) {
            const playerData = matchData.lineup.find(
              (p: any) => p.id === playerId || p.pid === playerId
            );
            if (playerData) {
              bowlerName = playerData.fullname || playerData.name || 'Bowler';
            }
          }

          // Try to find in all players data
          if (bowlerName === 'Bowler' && matchData.bowling) {
            // Look for bowler details in all bowling records
            for (const b of matchData.bowling) {
              if (b.bowler && (b.player_id === playerId || b.id === playerId)) {
                bowlerName = b.bowler.fullname || b.bowler.name || bowlerName;
                break;
              }
            }
          }

          // Fallback to database lookup
          if (bowlerName === 'Bowler') {
            try {
              const player = await prisma.player.findUnique({
                where: { sportMonkId: playerId?.toString() },
                select: { name: true },
              });
              if (player?.name) {
                bowlerName = player.name;
              }
            } catch (err) {
              console.log('Error looking up player name:', err);
            }
          }

          // Last resort - try to get name from bowler object
          if (bowlerName === 'Bowler' && bowler.bowler) {
            bowlerName =
              bowler.bowler.fullname || bowler.bowler.name || 'Bowler';
          }

          // If we found the player name, use it. Otherwise try a direct name if available
          if (bowlerName === 'Bowler' && (bowler.fullname || bowler.name)) {
            bowlerName = bowler.fullname || bowler.name;
          }

          currentBowler = bowlerName;
          currentBowlerFigures = `${bowler.wickets || 0}/${bowler.runs || 0} (${
            bowler.overs || 0
          }.${bowler.medians || 0})`;

          console.log(
            `Final bowler: ${currentBowler} with figures ${currentBowlerFigures}`
          );
        }
      }

      // IMPROVEMENT: After processing the data, sync it to our database in the background
      // This ensures future requests can use the database approach
      syncLiveMatchData(match.id, sportMonkId).catch((err) => {
        console.error('Background sync failed:', err);
      });

      // NEW SECTION: Create recent overs from ball data
      if (matchData.balls && matchData.balls.length > 0) {
        try {
          console.log(
            `Found ${matchData.balls.length} balls, processing for recent overs...`
          );

          // Get the 6 most recent balls, or all if fewer than 6
          const numBalls = Math.min(6, matchData.balls.length);
          const ballValues = [];

          // Iterate from the end to get most recent balls
          for (
            let i = matchData.balls.length - 1;
            i >= Math.max(0, matchData.balls.length - numBalls);
            i--
          ) {
            const ball: any = matchData.balls[i];
            if (!ball) continue;

            // Check if ball has a score object with runs info
            if (ball.score && typeof ball.score === 'object') {
              console.log(
                `Processing ball with score:`,
                JSON.stringify(ball.score).substring(0, 100)
              );

              // Check for wicket
              if (ball.score.is_wicket === true) {
                ballValues.unshift('W');
              }
              // Check for boundaries
              else if (ball.score.four === true) {
                ballValues.unshift('4');
              } else if (ball.score.six === true) {
                ballValues.unshift('6');
              }
              // Get regular runs
              else if (typeof ball.score.runs === 'number') {
                ballValues.unshift(ball.score.runs.toString());
              }
              // Fallback
              else {
                ballValues.unshift('0');
              }
            }
            // Fallback to direct properties if score object isn't available
            else {
              if (ball.is_wicket === true) {
                ballValues.unshift('W');
              } else if (ball.is_boundary === true && !ball.is_six) {
                ballValues.unshift('4');
              } else if (ball.is_six === true) {
                ballValues.unshift('6');
              } else if (typeof ball.score === 'number') {
                ballValues.unshift(ball.score.toString());
              } else {
                ballValues.unshift('0');
              }
            }
          }

          // Join values with spaces
          if (ballValues.length > 0) {
            recentOvers = ballValues.join(' ');
            console.log('Recent overs processed:', recentOvers);
          }
        } catch (error) {
          console.error('Error processing recent overs:', error);
        }
      }

      // Log the raw data for debugging
      console.log('Raw SportMonk data structure:');
      console.log('- Has runs array:', !!matchData.runs);
      console.log('- Has batting array:', !!matchData.batting);
      console.log('- Has bowling array:', !!matchData.bowling);
      console.log('- Has balls array:', !!matchData.balls);
      console.log('- Has lineup array:', !!matchData.lineup);
      console.log('- Has scoreboards array:', !!matchData.scoreboards);

      // Return processed data
      return NextResponse.json(
        {
          success: true,
          data: {
            teamAScore,
            teamBScore,
            overs,
            currentInnings,
            currentBatsman1,
            currentBatsman1Score,
            currentBatsman2,
            currentBatsman2Score,
            currentBowler,
            currentBowlerFigures,
            lastWicket,
            recentOvers,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error processing SportMonk data:', error);

      // Try to get data from our database as a last resort
      try {
        const localData = await getLiveMatchData(match.id);
        if (localData?.success) {
          return NextResponse.json(
            {
              success: true,
              data: localData.data,
              note: 'Using cached data due to API error',
            },
            { status: 200 }
          );
        }
      } catch (dbError) {
        console.error('Error retrieving database data:', dbError);
      }

      // If all else fails, return fallback data
      return NextResponse.json(
        {
          success: true,
          data: {
            teamAScore: '0/0',
            teamBScore: 'Yet to bat',
            overs: '0.0',
            currentInnings: 1,
            currentBatsman1: 'Waiting for data...',
            currentBatsman1Score: '0 (0)',
            currentBatsman2: 'Waiting for data...',
            currentBatsman2Score: '0 (0)',
            currentBowler: 'Waiting for data...',
            currentBowlerFigures: '0/0 (0.0)',
            lastWicket: 'No wickets yet',
            recentOvers: '',
          },
          note: 'Using fallback data due to API error',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error fetching live match data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live match data' },
      { status: 500 }
    );
  }
}
