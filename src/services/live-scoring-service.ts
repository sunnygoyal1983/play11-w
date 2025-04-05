import { prisma } from '@/lib/prisma';
import * as pointsSystem from '@/lib/points-system';
import axios from 'axios';

/**
 * Interface for SportMonk player innings data
 */
interface PlayerInnings {
  player_id: number;
  score: number;
  ball: number;
  four_x: number;
  six_x: number;
  rate: number;
  out_by?: {
    id: number;
    name: string;
  };
  batsman_id: number;
  batsman: {
    id: number;
    fullname: string;
    image_path: string;
  };
  bowling?: {
    overs: number;
    medians: number;
    runs: number;
    wickets: number;
    wide: number;
    noball: number;
    rate: number;
  };
  catch?: {
    id: number;
    fullname: string;
  }[];
  runout?: {
    id: number;
    fullname: string;
  }[];
  stumping?: {
    id: number;
    fullname: string;
  }[];
  wicket_type?: string;
}

/**
 * Interface for SportMonk match scorecard
 */
interface Scorecard {
  id: number;
  name: string;
  team_id: number;
  teamInnings: {
    id: number;
    overs: number;
    score: number;
    wickets: number;
  };
  batting: PlayerInnings[];
  bowling: {
    player_id: number;
    overs: number;
    medians: number;
    runs: number;
    wickets: number;
    rate: number;
    bowler: {
      id: number;
      fullname: string;
      image_path: string;
    };
  }[];
}

// Mock data for development when API doesn't return real data
const MOCK_LIVE_MATCH_DATA = {
  id: 65558,
  status: '1st Innings',
  localteam: {
    id: 52,
    name: 'Lucknow Super Giants',
    code: 'LSG',
  },
  visitorteam: {
    id: 64,
    name: 'Mumbai Indians',
    code: 'MI',
  },
  batting: [
    {
      id: 10483,
      batsman: {
        id: 473,
        fullname: 'KL Rahul',
        name: 'KL Rahul',
      },
      active: true,
      score: 72,
      ball: 48,
      four: 6,
      six: 2,
      out: false,
    },
    {
      id: 10484,
      batsman: {
        id: 474,
        fullname: 'Quinton de Kock',
        name: 'Quinton de Kock',
      },
      active: true,
      score: 54,
      ball: 37,
      four: 4,
      six: 1,
      out: false,
    },
  ],
  bowling: [
    {
      id: 10490,
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      active: true,
      overs: 3,
      medians: 0,
      runs: 24,
      wickets: 1,
    },
  ],
  scoreboards: [
    {
      id: 10492,
      team_id: 52,
      type: 'total',
      scoreboard: '1',
      total: 203,
      wickets: 8,
      overs: 20,
    },
    {
      id: 10493,
      team_id: 64,
      type: 'total',
      scoreboard: '2',
      total: 191,
      wickets: 4,
      overs: 18.2,
    },
  ],
  balls: [
    {
      id: 10494,
      ball: 1,
      score: 1,
      batsman: {
        id: 473,
        fullname: 'KL Rahul',
        name: 'KL Rahul',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: false,
      is_wicket: false,
      is_six: false,
    },
    {
      id: 10495,
      ball: 2,
      score: 4,
      batsman: {
        id: 474,
        fullname: 'Quinton de Kock',
        name: 'Quinton de Kock',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: true,
      is_wicket: false,
      is_six: false,
    },
    {
      id: 10496,
      ball: 3,
      score: 0,
      batsman: {
        id: 474,
        fullname: 'Quinton de Kock',
        name: 'Quinton de Kock',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: false,
      is_wicket: false,
      is_six: false,
    },
    {
      id: 10497,
      ball: 4,
      score: 0,
      batsman: {
        id: 474,
        fullname: 'Quinton de Kock',
        name: 'Quinton de Kock',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: false,
      is_wicket: true,
      is_six: false,
      out_batsman: {
        id: 477,
        fullname: 'Nicholas Pooran',
        name: 'Nicholas Pooran',
      },
      out_batsman_dismissal: 'bowled',
    },
    {
      id: 10498,
      ball: 5,
      score: 6,
      batsman: {
        id: 473,
        fullname: 'KL Rahul',
        name: 'KL Rahul',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: false,
      is_wicket: false,
      is_six: true,
    },
    {
      id: 10499,
      ball: 6,
      score: 1,
      batsman: {
        id: 473,
        fullname: 'KL Rahul',
        name: 'KL Rahul',
      },
      bowler: {
        id: 478,
        fullname: 'Jasprit Bumrah',
        name: 'Jasprit Bumrah',
      },
      is_boundary: false,
      is_wicket: false,
      is_six: false,
    },
  ],
};

/**
 * Fetch live match details from SportMonk API
 */
export async function fetchLiveMatchDetails(matchId: string) {
  const apiKey =
    process.env.SPORTMONK_API_KEY ||
    'OJwhjCV6g9xODzgOCaCgc1KrDhtv7cOlh6K5LW6OiL6JDdEtX7M7W7x62Uja';

  try {
    console.log(`Fetching match details for match ID: ${matchId}`);

    // Use comprehensive include parameters to get all required data
    const apiUrl = `https://cricket.sportmonks.com/api/v2.0/fixtures/${matchId}?api_token=${apiKey}&include=runs,batting,bowling,scoreboards,balls,visitorteam,localteam,lineup,venue,manofmatch`;

    console.log(`Making request to: ${apiUrl}`);

    // Log the API endpoint we're calling
    console.log(`Fetching live match details from SportMonks API: ${apiUrl}`);

    const response = await axios.get(apiUrl);

    // Log the response structure
    if (response.data && response.data.data) {
      const matchData = response.data.data;
      console.log('SportMonks API response structure:');
      console.log('- Has balls array:', !!matchData.balls);
      if (matchData.balls) {
        console.log('- Balls array type:', typeof matchData.balls);
        console.log(
          '- Balls array length:',
          Array.isArray(matchData.balls)
            ? matchData.balls.length
            : 'not an array'
        );
        if (Array.isArray(matchData.balls) && matchData.balls.length > 0) {
          console.log(
            '- First 2 ball elements:',
            JSON.stringify(matchData.balls.slice(0, 2))
          );
        }
      }
    }

    if (response.status === 200 && response.data && response.data.data) {
      console.log('Successfully fetched match data');

      // Process the raw data into a consistent format
      const rawData = response.data.data;

      // Transform nested data for easier access
      const transformedData = {
        id: rawData.id,
        status: rawData.status,
        note: rawData.note,

        // Teams
        localteam: rawData.localteam?.data || {
          id: rawData.localteam_id,
          name: '',
          code: '',
        },
        visitorteam: rawData.visitorteam?.data || {
          id: rawData.visitorteam_id,
          name: '',
          code: '',
        },

        // Extract batting data (already in array format in API)
        batting: rawData.batting || [],

        // Extract bowling data
        bowling: rawData.bowling || [],

        // Extract scoreboards
        scoreboards: rawData.scoreboards || [],

        // Handle ball-by-ball data if available
        balls: rawData.balls || [],

        // Extract runs data
        runs: rawData.runs || [],

        // Add lineup data
        lineup: rawData.lineup || [],

        // Add venue information
        venue: rawData.venue?.data,

        // Add toss information
        toss: rawData.toss_won_team_id,

        // Add man of the match
        manOfMatch: rawData.manofmatch?.data,
      };

      console.log(
        `Processing data: ${transformedData.scoreboards.length} scoreboards, ${
          transformedData.batting.length
        } batsmen, ${transformedData.bowling.length} bowlers, lineup: ${
          transformedData.lineup.length || 0
        }`
      );

      return transformedData;
    } else {
      console.log('No valid data received from API');
      throw new Error('Invalid API response format');
    }
  } catch (error: any) {
    console.error('Error fetching match data:', error.message);

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response error:', error.response.data);
    }

    throw error;
  }
}

/**
 * Extract and transform player statistics from match data
 */
function extractPlayerStats(matchData: any): Map<number, any> {
  const playerStats = new Map<number, any>();

  console.log('Extracting player stats from match data...');

  // Initialize stats for all players in lineup
  if (matchData.lineup && Array.isArray(matchData.lineup)) {
    console.log(`Processing ${matchData.lineup.length} players from lineup`);

    matchData.lineup.forEach((player: any) => {
      if (!player || !player.id) {
        console.warn('Found a player without ID in lineup');
        return;
      }

      // Create a base stats object for each player
      playerStats.set(player.id, {
        id: player.id,
        name: player.fullname || 'Unknown Player',
        team_id: player.lineup?.team_id,
        // Batting stats
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        strikeRate: 0,
        // Bowling stats
        wickets: 0,
        overs: 0,
        maidens: 0,
        runsConceded: 0,
        economy: 0,
        lbwBowledCount: 0,
        // Fielding stats
        catches: 0,
        stumpings: 0,
        directRunOuts: 0,
        indirectRunOuts: 0,
        // The role of the player (will be filled later)
        role: 'Unknown',
      });
    });
  } else {
    console.warn('No lineup data found in match data');
  }

  // Process batting stats
  if (matchData.batting && Array.isArray(matchData.batting)) {
    console.log(`Processing ${matchData.batting.length} batting records`);

    matchData.batting.forEach((innings: PlayerInnings) => {
      const playerId = innings.batsman_id || innings.player_id;

      if (!playerId) {
        console.warn('Found batting record without player ID');
        return;
      }

      // If player not in our map yet (might not be in lineup), add them
      if (!playerStats.has(playerId)) {
        console.log(
          `Adding new player ${
            innings.batsman?.fullname || 'Unknown'
          } (ID: ${playerId}) from batting data`
        );

        playerStats.set(playerId, {
          id: playerId,
          name: innings.batsman?.fullname || 'Unknown Player',
          team_id: null,
          // Initialize all stats to 0
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          strikeRate: 0,
          wickets: 0,
          overs: 0,
          maidens: 0,
          runsConceded: 0,
          economy: 0,
          lbwBowledCount: 0,
          catches: 0,
          stumpings: 0,
          directRunOuts: 0,
          indirectRunOuts: 0,
          role: 'Unknown',
        });
      }

      const player = playerStats.get(playerId);

      // Update batting stats
      player.runs = innings.score || 0;
      player.balls = innings.ball || 0;
      player.fours = innings.four_x || 0;
      player.sixes = innings.six_x || 0;
      player.isOut = !!innings.out_by;
      player.strikeRate = innings.rate || 0;

      playerStats.set(playerId, player);

      console.log(
        `Updated batting stats for ${player.name}: ${player.runs} runs, SR: ${player.strikeRate}`
      );
    });
  } else {
    console.warn('No batting data found in match data');
  }

  // Process bowling stats
  if (matchData.bowling && Array.isArray(matchData.bowling)) {
    console.log(`Processing ${matchData.bowling.length} bowling records`);

    matchData.bowling.forEach((bowling: any) => {
      const playerId = bowling.bowler?.id || bowling.player_id;

      if (!playerId) {
        console.warn('Found bowling record without player ID');
        return;
      }

      // If player not in our map yet, add them
      if (!playerStats.has(playerId)) {
        console.log(
          `Adding new player ${
            bowling.bowler?.fullname || 'Unknown'
          } (ID: ${playerId}) from bowling data`
        );

        playerStats.set(playerId, {
          id: playerId,
          name: bowling.bowler?.fullname || 'Unknown Player',
          team_id: null,
          // Initialize all stats to 0
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          strikeRate: 0,
          wickets: 0,
          overs: 0,
          maidens: 0,
          runsConceded: 0,
          economy: 0,
          lbwBowledCount: 0,
          catches: 0,
          stumpings: 0,
          directRunOuts: 0,
          indirectRunOuts: 0,
          role: 'Unknown',
        });
      }

      const player = playerStats.get(playerId);

      // Update bowling stats
      player.wickets = bowling.wickets || 0;
      player.overs = parseFloat(bowling.overs) || 0;
      player.maidens = bowling.medians || 0;
      player.runsConceded = bowling.runs || 0;
      player.economy = bowling.rate || 0;

      // Count LBW/Bowled wickets for bonus points (will be updated in ball-by-ball section)
      player.lbwBowledCount = 0;

      playerStats.set(playerId, player);

      console.log(
        `Updated bowling stats for ${player.name}: ${player.wickets} wickets, economy: ${player.economy}`
      );
    });
  } else {
    console.warn('No bowling data found in match data');
  }

  // Process fielding stats from ball-by-ball data
  if (matchData.balls && Array.isArray(matchData.balls)) {
    console.log(
      `Processing ${matchData.balls.length} ball-by-ball records for fielding stats`
    );

    // Track LBW/Bowled dismissals for bowling bonus
    let lbwBowledCount = new Map<number, number>();

    matchData.balls.forEach((ball: any) => {
      // Process catches
      if (ball.catch && ball.catch.id) {
        const playerId = ball.catch.id;
        if (playerStats.has(playerId)) {
          const player = playerStats.get(playerId);
          player.catches += 1;
          playerStats.set(playerId, player);
          console.log(`Added catch for ${player.name}`);
        }
      }

      // Process stumpings
      if (ball.stumped && ball.stumped.id) {
        const playerId = ball.stumped.id;
        if (playerStats.has(playerId)) {
          const player = playerStats.get(playerId);
          player.stumpings += 1;
          playerStats.set(playerId, player);
          console.log(`Added stumping for ${player.name}`);
        }
      }

      // Process run outs
      if (ball.runout && Array.isArray(ball.runout) && ball.runout.length > 0) {
        // Assuming first player in array made direct hit, others assisted
        if (ball.runout[0] && ball.runout[0].id) {
          const playerId = ball.runout[0].id;
          if (playerStats.has(playerId)) {
            const player = playerStats.get(playerId);
            player.directRunOuts += 1;
            playerStats.set(playerId, player);
            console.log(`Added direct runout for ${player.name}`);
          }
        }

        // Indirect run outs (teammates who assisted)
        for (let i = 1; i < ball.runout.length; i++) {
          if (ball.runout[i] && ball.runout[i].id) {
            const playerId = ball.runout[i].id;
            if (playerStats.has(playerId)) {
              const player = playerStats.get(playerId);
              player.indirectRunOuts += 1;
              playerStats.set(playerId, player);
              console.log(`Added indirect runout for ${player.name}`);
            }
          }
        }
      }

      // Count LBW and Bowled dismissals for bonus points
      if (
        ball.bowler &&
        ball.bowler.id &&
        (ball.score === 'lbw' || ball.score === 'bowled')
      ) {
        const playerId = ball.bowler.id;
        const currentCount = lbwBowledCount.get(playerId) || 0;
        lbwBowledCount.set(playerId, currentCount + 1);
        console.log(`Added LBW/Bowled dismissal for bowler ID ${playerId}`);
      }
    });

    // Update LBW/Bowled counts for all bowlers
    for (const [bowlerId, count] of Array.from(lbwBowledCount.entries())) {
      if (playerStats.has(bowlerId)) {
        const player = playerStats.get(bowlerId);
        player.lbwBowledCount = count;
        playerStats.set(bowlerId, player);
        console.log(`Updated LBW/Bowled count for ${player.name}: ${count}`);
      }
    }
  } else {
    console.warn('No ball-by-ball data found for fielding stats');
  }

  console.log(`Final player stats map contains ${playerStats.size} players`);
  return playerStats;
}

/**
 * Update player statistics in the database
 */
export async function updateLiveMatchPlayerStats(
  matchId: string
): Promise<boolean> {
  try {
    console.log(`Updating live match player stats for match ${matchId}...`);

    // Fetch match data from SportMonk API
    const matchData = await fetchLiveMatchDetails(matchId);

    if (!matchData) {
      console.error(`No match data found for match ID ${matchId}`);
      return false;
    }

    // Log raw match data summary to help with debugging
    console.log(`Raw match data received:`, {
      id: matchData.id,
      status: matchData.status,
      batting_players: matchData.batting?.length || 0,
      bowling_players: matchData.bowling?.length || 0,
      lineup_players: matchData.lineup?.length || 0,
    });

    // Extract player statistics from match data
    const playerStatsMap = extractPlayerStats(matchData);

    if (playerStatsMap.size === 0) {
      console.warn(`No player statistics found for match ID ${matchId}`);
      return false;
    }

    console.log(`Found statistics for ${playerStatsMap.size} players`);

    // Get all player IDs from the statistics
    const sportMonkPlayerIds = Array.from(playerStatsMap.keys());

    // Ensure all players exist in our database and get mappings
    const playerIdMapping = await ensurePlayersExist(
      sportMonkPlayerIds,
      matchData
    );

    if (playerIdMapping.size === 0) {
      console.error(`Failed to map player IDs for match ${matchId}`);
      return false;
    }

    console.log(`Successfully mapped ${playerIdMapping.size} player IDs`);

    // Create or update player statistics in our database
    const operations = [];
    let playerPointsLog = [];

    // Log the total number of player statistics to update
    console.log(`Processing ${playerStatsMap.size} player statistics...`);

    // Convert Map.entries() to array before iterating
    for (const [sportMonkPlayerId, stats] of Array.from(
      playerStatsMap.entries()
    )) {
      const playerMapping = playerIdMapping.get(sportMonkPlayerId.toString());

      if (!playerMapping) {
        console.warn(
          `No database mapping found for player with SportMonk ID ${sportMonkPlayerId}`
        );
        continue;
      }

      const playerId = playerMapping.id;
      const playerRole = playerMapping.role;

      // Calculate fantasy points based on our points system
      const points = pointsSystem.calculateTotalPoints(
        stats.runs,
        stats.balls,
        stats.fours,
        stats.sixes,
        stats.isOut,
        stats.wickets,
        stats.overs,
        stats.maidens,
        stats.runsConceded,
        stats.lbwBowledCount,
        stats.catches,
        stats.stumpings,
        stats.directRunOuts,
        stats.indirectRunOuts,
        playerRole
      );

      // Ensure points calculation is working as expected
      console.log(
        `Player ${stats.name} (${playerId}): ${points.toFixed(1)} points`
      );
      console.log(
        `- Batting: ${stats.runs} runs, ${stats.fours} fours, ${stats.sixes} sixes`
      );
      console.log(`- Bowling: ${stats.wickets} wickets, ${stats.overs} overs`);
      console.log(
        `- Fielding: ${stats.catches} catches, ${stats.stumpings} stumpings, ${
          stats.directRunOuts + stats.indirectRunOuts
        } run outs`
      );

      // Log player points data for debugging
      playerPointsLog.push({
        name: stats.name,
        sportMonkId: sportMonkPlayerId,
        playerId,
        role: playerRole,
        runs: stats.runs,
        wickets: stats.wickets,
        points,
        batting: {
          runs: stats.runs,
          balls: stats.balls,
          fours: stats.fours,
          sixes: stats.sixes,
          isOut: stats.isOut,
        },
        bowling: {
          wickets: stats.wickets,
          overs: stats.overs,
          maidens: stats.maidens,
          runsConceded: stats.runsConceded,
        },
        fielding: {
          catches: stats.catches,
          stumpings: stats.stumpings,
          runOuts: stats.directRunOuts + stats.indirectRunOuts,
        },
      });

      // Create or update player statistics record
      operations.push(
        prisma.playerStatistic.upsert({
          where: {
            matchId_playerId: {
              matchId,
              playerId,
            },
          },
          update: {
            runs: stats.runs,
            balls: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            strikeRate: stats.strikeRate,
            wickets: stats.wickets,
            overs: stats.overs,
            maidens: stats.maidens,
            economy: stats.economy,
            runsConceded: stats.runsConceded,
            catches: stats.catches,
            stumpings: stats.stumpings,
            runOuts: stats.directRunOuts + stats.indirectRunOuts,
            points,
          },
          create: {
            matchId,
            playerId,
            runs: stats.runs,
            balls: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            strikeRate: stats.strikeRate,
            wickets: stats.wickets,
            overs: stats.overs,
            maidens: stats.maidens,
            economy: stats.economy,
            runsConceded: stats.runsConceded,
            catches: stats.catches,
            stumpings: stats.stumpings,
            runOuts: stats.directRunOuts + stats.indirectRunOuts,
            points,
          },
        })
      );
    }

    // Log the top 5 players by points for debugging
    console.log(
      'Top players by points:',
      playerPointsLog
        .sort((a, b) => b.points - a.points)
        .slice(0, 5)
        .map(
          (p) =>
            `${p.name}: ${p.points.toFixed(1)} pts (Runs: ${p.runs}, Wickets: ${
              p.wickets
            })`
        )
        .join('\n')
    );

    // Convert operations array to individual database calls for reliability
    if (operations.length > 0) {
      console.log(
        `Updating ${operations.length} player statistics in database...`
      );

      // Track successful and failed updates
      let successCount = 0;
      let errorCount = 0;

      // Process each player update individually instead of in a transaction
      // This is more reliable and easier to debug than a transaction
      for (let i = 0; i < operations.length; i++) {
        try {
          // Extract the operation details
          const operation = operations[i];

          // Log which player we're processing
          const playerDetails = playerPointsLog[i] || {
            name: 'Unknown',
            playerId: 'Unknown',
          };
          console.log(
            `Processing player #${i + 1}/${operations.length}: ${
              playerDetails.name
            } (${playerDetails.playerId})`
          );

          // Execute the operation
          await operation;

          // If successful, increment counter
          successCount++;

          // Log for debugging
          console.log(
            `✅ Successfully updated player ${playerDetails.name} (${
              playerDetails.playerId
            }): ${playerDetails.points.toFixed(1)} points`
          );
        } catch (error) {
          errorCount++;
          console.error(
            `❌ Error updating player #${i + 1}/${operations.length}:`,
            error
          );
        }
      }

      console.log(
        `Player statistics update complete: ${successCount} successful, ${errorCount} failed`
      );

      // If we updated any players, consider it a success
      const updateSuccess = successCount > 0;

      // Also update match status if needed
      try {
        const matchResult = matchData.note
          ? String(matchData.note)
          : `${matchData.runs?.[0]?.score || 0}/${
              matchData.runs?.[0]?.wickets || 0
            } vs ${matchData.runs?.[1]?.score || 0}/${
              matchData.runs?.[1]?.wickets || 0
            }`;

        // Check if match is actually completed
        let matchStatus = 'live';
        if (
          matchData.status === 'Finished' ||
          matchData.status === 'finished' ||
          matchData.status === 'completed' ||
          matchData.note?.includes('won by') ||
          (matchData.runs?.length === 2 &&
            matchData.runs[1]?.overs === matchData.runs[1]?.total_overs)
        ) {
          matchStatus = 'completed';
          console.log(
            `Match ${matchId} is detected as completed. Status: ${matchData.status}, Note: ${matchData.note}`
          );
        }

        await prisma.match.update({
          where: { id: matchId },
          data: {
            status: matchStatus,
            result: matchResult,
            endTime: matchStatus === 'completed' ? new Date() : undefined,
          },
        });

        console.log(
          `Updated match status to ${matchStatus} and result: ${matchResult}`
        );

        // If match is completed, trigger contest finalization
        if (matchStatus === 'completed') {
          try {
            const {
              triggerContestFinalization,
            } = require('./live-match-scheduler');
            await triggerContestFinalization(matchId);
            console.log(
              `Triggered contest finalization for completed match ${matchId}`
            );
          } catch (finalizationError) {
            console.error(
              `Error finalizing contests for match ${matchId}:`,
              finalizationError
            );
          }
        }
      } catch (matchUpdateError) {
        console.error(`Error updating match status:`, matchUpdateError);
        // Continue anyway, this shouldn't fail the whole operation
      }

      return updateSuccess;
    } else {
      console.warn(`No player statistics to update for match ${matchId}`);
      return false;
    }
  } catch (error) {
    console.error(
      `Error updating player statistics for match ${matchId}:`,
      error
    );
    return false;
  }
}

/**
 * Ensure all players from SportMonk API exist in our database
 * This function maps SportMonk player IDs to our database player IDs
 */
async function ensurePlayersExist(
  playerIds: number[],
  matchData: any
): Promise<Map<string, { id: string; role: string }>> {
  try {
    // Log the number of players we need to check
    console.log(
      `Ensuring ${playerIds.length} players exist in our database...`
    );

    // First, find existing players in our db
    const existingPlayers = await prisma.player.findMany({
      where: {
        sportMonkId: {
          in: playerIds.map((id) => id.toString()),
        },
      },
      select: {
        id: true,
        sportMonkId: true,
        role: true,
      },
    });

    console.log(`Found ${existingPlayers.length} existing players in database`);

    // Create a mapping for quick lookup
    const playerIdMapping = new Map<string, { id: string; role: string }>();
    existingPlayers.forEach((player) => {
      playerIdMapping.set(player.sportMonkId, {
        id: player.id,
        role: player.role || 'Unknown',
      });
    });

    // Find missing players (in API but not in our DB)
    const missingPlayerIds = playerIds.filter(
      (id) => !playerIdMapping.has(id.toString())
    );

    if (missingPlayerIds.length > 0) {
      console.log(
        `Found ${missingPlayerIds.length} players missing from our database`
      );

      // Process lineup to get player data
      const lineup = matchData.lineup || [];
      const playersToCreate = [];

      // Find player data from lineup
      for (const id of missingPlayerIds) {
        const playerData = lineup.find((p: any) => p.id === id);

        if (playerData) {
          // Determine team and role
          const teamId = playerData.lineup?.team_id?.toString();
          let teamName = '';
          let role = 'Unknown';

          // Try to determine team name
          if (matchData.localteam && matchData.localteam.id === teamId) {
            teamName = matchData.localteam.name;
          } else if (
            matchData.visitorteam &&
            matchData.visitorteam.id === teamId
          ) {
            teamName = matchData.visitorteam.name;
          }

          // Try to determine role from position
          if (playerData.position) {
            const pos = playerData.position.toLowerCase();
            if (pos.includes('bat')) role = 'BAT';
            else if (pos.includes('bowl')) role = 'BOWL';
            else if (pos.includes('all')) role = 'AR';
            else if (pos.includes('keep')) role = 'WK';
          }

          playersToCreate.push({
            sportMonkId: id.toString(),
            name: playerData.fullname || `Player ${id}`,
            image: playerData.image_path,
            country: null,
            teamId: teamId,
            teamName: teamName,
            role: role,
            isActive: true,
          });
        } else {
          // If player not found in lineup, create with minimal data
          console.log(
            `Player ID ${id} not found in lineup, creating with minimal data`
          );
          playersToCreate.push({
            sportMonkId: id.toString(),
            name: `Player ${id}`,
            isActive: true,
          });
        }
      }

      // Create missing players in database
      if (playersToCreate.length > 0) {
        console.log(
          `Creating ${playersToCreate.length} missing players in database...`
        );

        for (const playerData of playersToCreate) {
          try {
            const player = await prisma.player.create({
              data: playerData,
            });

            playerIdMapping.set(player.sportMonkId, {
              id: player.id,
              role: player.role || 'Unknown',
            });

            console.log(
              `Created player: ${player.name} (ID: ${player.id}, Sport ID: ${player.sportMonkId})`
            );
          } catch (error) {
            console.error(
              `Failed to create player with SportMonk ID ${playerData.sportMonkId}:`,
              error
            );
          }
        }
      }
    }

    return playerIdMapping;
  } catch (error) {
    console.error('Error ensuring players exist:', error);
    return new Map();
  }
}
