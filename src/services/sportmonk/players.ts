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
