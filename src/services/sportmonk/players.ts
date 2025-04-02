import { buildApiUrl, rateLimitedFetch, prisma, logApiRequest } from './utils';
import { createTeam } from './teams';

/**
 * Create a player from API data
 */
export const createPlayer = async (player: any) => {
  try {
    // Use a transaction to ensure the team exists before creating the player
    return await prisma.$transaction(async (tx) => {
      // 1. Ensure team exists if available
      if (player.team?.id) {
        const team = await tx.team.findUnique({
          where: { sportMonkId: player.team.id.toString() },
        });

        if (!team) {
          console.log(`Team ${player.team.id} not found, creating it first...`);
          await tx.team.create({
            data: {
              id: player.team.id.toString(),
              sportMonkId: player.team.id.toString(),
              name: player.team.name || 'Unknown Team',
              shortName: player.team.code || '',
              image: player.team.image_path || '',
              country: '',
              isActive: true,
            },
          });
        }
      }

      // 2. Create player with guaranteed team reference
      return await tx.player.upsert({
        where: { sportMonkId: player.id?.toString() || '' },
        update: {
          name: player.fullname || 'Unknown Player',
          image: player.image_path || '',
          country: player.country?.id?.toString() || '',
          teamId: player.team?.id?.toString() || '',
          teamName: player.team?.name || 'Unknown Team',
          role: (player.position?.name || 'unknown').toLowerCase(),
          battingStyle: player.batting_style || '',
          bowlingStyle: player.bowling_style || '',
          isActive: true,
        },
        create: {
          id: player.id?.toString() || '',
          sportMonkId: player.id?.toString() || '',
          name: player.fullname || 'Unknown Player',
          image: player.image_path || '',
          country: player.country?.id?.toString() || '',
          teamId: player.team?.id?.toString() || '',
          teamName: player.team?.name || 'Unknown Team',
          role: (player.position?.name || 'unknown').toLowerCase(),
          battingStyle: player.batting_style || '',
          bowlingStyle: player.bowling_style || '',
          isActive: true,
        },
      });
    });
  } catch (error) {
    console.error(`Error creating player ${player.id}:`, error);
    throw error;
  }
};

/**
 * Fetch player details and store in database
 */
export const fetchPlayerDetails = async (playerId: number) => {
  try {
    const url = buildApiUrl(`/players/${playerId}`, {
      include: 'team,country,position',
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for player details:`, errorText);
      return null;
    }

    const data = await response.json();
    const player = data.data;

    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    // Create the player in the database
    await createPlayer(player);

    return data;
  } catch (error) {
    console.error(
      `Error fetching player details for player ${playerId}:`,
      error
    );
    throw error;
  }
};

/**
 * Store player lineup data from a match
 */
export const storeMatchLineup = async (matchId: number, lineup: any[]) => {
  try {
    if (!lineup || !Array.isArray(lineup) || lineup.length === 0) {
      console.warn(`No lineup data available for match ${matchId}`);
      return null;
    }

    // Use a transaction to ensure all related entities exist
    await prisma.$transaction(async (tx) => {
      for (const player of lineup) {
        if (!player.id) continue;

        // Skip players with missing team_id
        if (!player.team_id) {
          console.warn(`Skipping player ${player.id} with missing team_id`);
          continue;
        }

        // Verify the team exists before creating the player
        const team = await tx.team.findUnique({
          where: { sportMonkId: player.team_id.toString() },
        });

        if (!team) {
          console.log(
            `Team ${player.team_id} for player ${player.id} not found, creating it first...`
          );
          try {
            await tx.team.create({
              data: {
                id: player.team_id.toString(),
                sportMonkId: player.team_id.toString(),
                name: player.team_name || 'Unknown Team',
                shortName: '',
                image: '',
                country: '',
                isActive: true,
              },
            });
          } catch (teamError) {
            console.error(
              `Failed to create team ${player.team_id}, skipping player ${player.id}:`,
              teamError
            );
            continue; // Skip this player if team creation fails
          }
        }

        try {
          await tx.player.upsert({
            where: { sportMonkId: player.id?.toString() || '' },
            update: {
              name: player.fullname || '',
              image: player.image_path || '',
              country: player.country_id?.toString() || '',
              teamId: player.team_id?.toString() || '',
              teamName: player.team_name || '',
              role: (player.position?.name || '').toLowerCase(),
              battingStyle: player.batting_style || '',
              bowlingStyle: player.bowling_style || '',
            },
            create: {
              id: player.id?.toString() || '',
              sportMonkId: player.id?.toString() || '',
              name: player.fullname || '',
              image: player.image_path || '',
              country: player.country_id?.toString() || '',
              teamId: player.team_id?.toString() || '',
              teamName: player.team_name || '',
              role: (player.position?.name || '').toLowerCase(),
              battingStyle: player.batting_style || '',
              bowlingStyle: player.bowling_style || '',
            },
          });
        } catch (playerError) {
          console.error(
            `Error creating/updating player ${player.id}:`,
            playerError
          );
          // Continue with other players
        }
      }
    });

    return lineup.length;
  } catch (error) {
    console.error(`Error storing match lineup for match ${matchId}:`, error);
    throw error;
  }
};

/**
 * Fetch match players for upcoming matches using the squad API
 * This fetches players for both teams in a match using the team squad API endpoint
 */
export const fetchMatchPlayersFromSquad = async (
  matchId?: string,
  limit: number = 10
) => {
  try {
    // Get upcoming matches that don't have players yet
    const matches = await prisma.match.findMany({
      where: {
        ...(matchId ? { id: matchId } : {}),
        status: 'upcoming',
        players: {
          none: {},
        },
      },
      include: {
        tournament: true,
      },
      take: limit,
      orderBy: {
        startTime: 'asc',
      },
    });

    if (matches.length === 0) {
      console.log('No upcoming matches without players found');
      return {
        success: true,
        processed: 0,
        matchesWithPlayers: 0,
        errors: [],
      };
    }

    console.log(`Found ${matches.length} upcoming matches without players`);

    const results = {
      success: true,
      processed: matches.length,
      matchesWithPlayers: 0,
      errors: [] as { matchId: string; name?: string; error: string }[],
    };

    // Process each match
    for (const match of matches) {
      try {
        if (!match.tournament?.seasonId) {
          throw new Error(
            `Match ${match.id} (${match.name}) has no season ID in its tournament data`
          );
        }

        const seasonId = match.tournament.seasonId;
        const teamIds = [match.teamAId, match.teamBId].filter(Boolean);

        if (teamIds.length < 2) {
          throw new Error(
            `Match ${match.id} (${match.name}) is missing team information`
          );
        }

        console.log(
          `Processing match ${match.id} (${
            match.name
          }), Season: ${seasonId}, Teams: ${teamIds.join(', ')}`
        );

        let totalAddedPlayers = 0;

        // Process each team's squad
        for (const teamId of teamIds) {
          try {
            let addedPlayers = 0;

            // Call the squad API endpoint
            const url = buildApiUrl(`/teams/${teamId}/squad/${seasonId}`, {
              include: 'player',
            });

            logApiRequest(url);
            console.log('Players URL', url); // Log complete URL for debugging

            const response = await rateLimitedFetch(url, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
              cache: 'no-store',
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`API Error Response for team squad:`, errorText);
              throw new Error(`Failed to fetch squad data: ${response.status}`);
            }

            const data = await response.json();

            // Log squad data structure for debugging
            console.log(`Squad data structure for team ${teamId}:`, {
              hasData: !!data?.data,
              squadType: data?.data?.squad
                ? typeof data.data.squad
                : 'undefined',
              squadLength: Array.isArray(data?.data?.squad)
                ? data.data.squad.length
                : 0,
              keys: data?.data ? Object.keys(data.data) : [],
            });

            // Handle different possible data structures
            let squad = [];

            if (data?.data?.squad && Array.isArray(data.data.squad)) {
              squad = data.data.squad;
            } else if (data?.data && Array.isArray(data.data)) {
              // Some endpoints might return array at the top level
              squad = data.data;
            } else {
              console.warn(
                `Unexpected squad data structure for team ${teamId}`
              );
            }

            if (squad.length === 0) {
              console.warn(`Empty squad returned for team ${teamId}`);
              continue;
            }

            console.log(
              `Processing ${squad.length} players in squad for team ${teamId}`
            );

            // Process each player in the squad
            for (const squadMember of squad) {
              try {
                // Different possible squad data structures
                let player;
                if (squadMember.player) {
                  // Normal structure: { player: { id, name, ... } }
                  player = squadMember.player;
                } else if (squadMember.id) {
                  // Player info directly in the squad item
                  player = squadMember;
                } else {
                  console.warn(
                    'Invalid player data in squad, skipping...',
                    squadMember
                  );
                  continue;
                }

                if (!player.id) {
                  console.warn('Player missing ID, skipping...');
                  continue;
                }

                console.log(
                  `Processing player: ${player.id} - ${
                    player.fullname || player.firstname
                  }`
                );

                // Get or set player name
                const playerName =
                  player.fullname ||
                  (player.firstname && player.lastname
                    ? `${player.firstname} ${player.lastname}`
                    : null) ||
                  `Player ${player.id}`;

                // Create or update the player record
                const createdPlayer = await prisma.player.upsert({
                  where: { sportMonkId: player.id.toString() },
                  update: {
                    name: playerName,
                    image: player.image_path || '',
                    country: player.country_id?.toString() || '',
                    teamId: teamId,
                    teamName: data.data.name || '',
                    role: (player.position?.name || '').toLowerCase(),
                    battingStyle: player.batting_style || '',
                    bowlingStyle: player.bowling_style || '',
                    isActive: true,
                  },
                  create: {
                    id: player.id.toString(),
                    sportMonkId: player.id.toString(),
                    name: playerName,
                    image: player.image_path || '',
                    country: player.country_id?.toString() || '',
                    teamId: teamId,
                    teamName: data.data.name || '',
                    role: (player.position?.name || '').toLowerCase(),
                    battingStyle: player.batting_style || '',
                    bowlingStyle: player.bowling_style || '',
                    isActive: true,
                  },
                });

                // Create the match player connection
                await prisma.matchPlayer.upsert({
                  where: {
                    matchId_playerId: {
                      matchId: match.id,
                      playerId: createdPlayer.id,
                    },
                  },
                  update: {
                    teamId: teamId,
                    // Keep existing values
                  },
                  create: {
                    matchId: match.id,
                    playerId: createdPlayer.id,
                    teamId: teamId,
                    selected: false, // Will be updated when lineup is available
                    points: 0,
                    isCaptain: false,
                    isViceCaptain: false,
                  },
                });

                addedPlayers++;
                console.log(
                  `Added player ${player.id} (${playerName}) to match ${match.id}`
                );
              } catch (playerError) {
                console.error(
                  `Error processing player for match ${match.id}:`,
                  playerError
                );
              }
            }

            totalAddedPlayers += addedPlayers;
            console.log(
              `Added ${addedPlayers} players from team ${teamId} to match ${match.id}`
            );
          } catch (teamError) {
            console.error(
              `Error processing team ${teamId} for match ${match.id}:`,
              teamError
            );
            results.errors.push({
              matchId: match.id,
              name: match.name,
              error: `Team ${teamId} error: ${
                teamError instanceof Error
                  ? teamError.message
                  : String(teamError)
              }`,
            });
          }
        }

        if (totalAddedPlayers > 0) {
          results.matchesWithPlayers++;
        }
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
        results.errors.push({
          matchId: match.id,
          name: match.name,
          error:
            matchError instanceof Error
              ? matchError.message
              : String(matchError),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching match players from squad:', error);
    throw error;
  }
};
