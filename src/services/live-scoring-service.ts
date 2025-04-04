import { prisma } from '@/lib/prisma';
import * as pointsSystem from '@/lib/points-system';
import { rateLimitedFetch, buildApiUrl } from '@/services/sportmonk/utils';

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

/**
 * Fetch live match details from SportMonk API
 */
export async function fetchLiveMatchDetails(matchId: string): Promise<any> {
  try {
    console.log(`🔍 Fetching live match details for match ID: ${matchId}`);

    // Use the SportMonk fixture API with only supported includes
    const url = buildApiUrl(`/fixtures/${matchId}`, {
      include:
        'localteam,visitorteam,batting,bowling,lineup,runs,manofmatch,balls',
    });

    console.log(
      `📡 API Request: ${url.replace(/api_token=[^&]+/, 'api_token=***')}`
    );

    const startTime = Date.now();
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const fetchTime = Date.now() - startTime;
    console.log(`⏱️ API Response time: ${fetchTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error Response for match ${matchId}:`);
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Body: ${errorText.substring(0, 200)}...`);
      return null;
    }

    const data = await response.json();

    if (!data || !data.data) {
      console.error(
        `❌ Invalid API response format for match ${matchId}:`,
        data
      );
      return null;
    }

    // Log data summary
    console.log(`✅ Received match data for ${matchId}:`);
    console.log(`   Status: ${data.data.status}`);
    console.log(
      `   Teams: ${data.data.localteam?.name} vs ${data.data.visitorteam?.name}`
    );
    console.log(`   Players: ${data.data.lineup?.length || 0} in lineup`);
    console.log(`   Batting records: ${data.data.batting?.length || 0}`);
    console.log(`   Bowling records: ${data.data.bowling?.length || 0}`);
    console.log(`   Ball-by-ball records: ${data.data.balls?.length || 0}`);

    // If no player data found, log a warning
    if (!data.data.lineup || data.data.lineup.length === 0) {
      console.warn(`⚠️ No lineup data found for match ${matchId}`);
    }

    return data.data;
  } catch (error) {
    console.error(
      `❌ Error fetching live match details for ${matchId}:`,
      error
    );
    return null;
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

        await prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'live',
            result: matchResult,
          },
        });

        console.log(`Updated match status and result: ${matchResult}`);
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
