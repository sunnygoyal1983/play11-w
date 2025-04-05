import { prisma } from '@/lib/prisma';
import { fetchLiveMatchDetails } from './live-scoring-service';

interface PlayerLineup {
  id: string;
  name: string;
  role: string;
  image?: string;
  isSubstitute?: boolean;
}

/**
 * Fetch lineup data for a match, either from the database or from the SportMonks API
 */
export async function getMatchLineup(matchId: string) {
  try {
    // Get match details from database
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // First check if we already have lineup data in the database
    const existingLineup = await prisma.matchLineup.findUnique({
      where: { matchId },
    });

    if (existingLineup && existingLineup.isTossComplete) {
      console.log(`Retrieved lineup data from database for match ${matchId}`);

      // Parse JSON data from the database
      const teamAPlayers = JSON.parse(
        existingLineup.teamAPlayers as string
      ) as PlayerLineup[];
      const teamBPlayers = JSON.parse(
        existingLineup.teamBPlayers as string
      ) as PlayerLineup[];

      // Parse substitute players if available
      const teamASubstitutes = existingLineup.teamASubstitutes
        ? (JSON.parse(
            existingLineup.teamASubstitutes as string
          ) as PlayerLineup[])
        : [];
      const teamBSubstitutes = existingLineup.teamBSubstitutes
        ? (JSON.parse(
            existingLineup.teamBSubstitutes as string
          ) as PlayerLineup[])
        : [];

      return {
        success: true,
        tossComplete: true,
        teamA: teamAPlayers,
        teamB: teamBPlayers,
        teamASubstitutes,
        teamBSubstitutes,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        tossWinner: existingLineup.tossWinner,
        fromDatabase: true,
      };
    }

    // If not in database, fetch from SportMonk API
    console.log(
      `Fetching lineup data from API for match ${matchId} (SportMonk ID: ${match.sportMonkId})`
    );

    const matchData = await fetchLiveMatchDetails(match.sportMonkId);

    // Check if lineup data exists (will only be available after toss)
    const hasLineupData =
      matchData.lineup &&
      Array.isArray(matchData.lineup) &&
      matchData.lineup.length > 0;

    console.log('Has lineup data:', hasLineupData);
    if (hasLineupData) {
      console.log('Lineup data length:', matchData.lineup.length);
    }

    if (!hasLineupData) {
      console.log('No lineup data available from API for this match');
      return {
        success: false,
        message: 'Lineup not available yet',
        tossComplete: false,
      };
    }

    // Log toss information
    if (matchData.toss) {
      console.log(`Toss won by team ID: ${matchData.toss}`);
    }

    // Process lineup data
    console.log(`Found ${matchData.lineup.length} players in lineup`);

    // Separate players by team
    const teamAPlayers: PlayerLineup[] = [];
    const teamBPlayers: PlayerLineup[] = [];
    const teamASubstitutes: PlayerLineup[] = [];
    const teamBSubstitutes: PlayerLineup[] = [];

    for (const player of matchData.lineup) {
      if (!player.player) continue;

      // Check if player is a substitute
      const isSubstitute =
        player.substitute === true ||
        player.position?.name?.toLowerCase().includes('substitute');

      const playerData: PlayerLineup = {
        id: player.player.id?.toString() || '',
        name: player.player.fullname || player.player.name || 'Unknown Player',
        role: player.player.position?.name || 'Unknown',
        image: player.player.image_path,
        isSubstitute: isSubstitute,
      };

      // Determine which team the player belongs to
      if (player.team_id?.toString() === match.teamAId) {
        if (isSubstitute) {
          teamASubstitutes.push(playerData);
        } else {
          teamAPlayers.push(playerData);
        }
      } else if (player.team_id?.toString() === match.teamBId) {
        if (isSubstitute) {
          teamBSubstitutes.push(playerData);
        } else {
          teamBPlayers.push(playerData);
        }
      }
    }

    // Check if we have enough players in each team
    if (teamAPlayers.length === 0 && teamBPlayers.length === 0) {
      console.log('No players found in lineup data');
      return {
        success: false,
        message: 'Lineup not available yet',
        tossComplete: false,
      };
    }

    // Save lineup data to database
    await saveLineupToDatabase(
      match.id,
      teamAPlayers,
      teamBPlayers,
      teamASubstitutes,
      teamBSubstitutes,
      matchData.toss?.toString() || null
    );

    return {
      success: true,
      tossComplete: true,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      teamASubstitutes,
      teamBSubstitutes,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      tossWinner: matchData.toss?.toString() || null,
      fromApi: true,
    };
  } catch (error) {
    console.error('Error fetching lineup data:', error);
    throw error;
  }
}

/**
 * Save lineup data to the database
 */
export async function saveLineupToDatabase(
  matchId: string,
  teamAPlayers: PlayerLineup[],
  teamBPlayers: PlayerLineup[],
  teamASubstitutes: PlayerLineup[] = [],
  teamBSubstitutes: PlayerLineup[] = [],
  tossWinner: string | null
) {
  try {
    await prisma.matchLineup.upsert({
      where: { matchId },
      update: {
        teamAPlayers: JSON.stringify(teamAPlayers),
        teamBPlayers: JSON.stringify(teamBPlayers),
        teamASubstitutes: JSON.stringify(teamASubstitutes),
        teamBSubstitutes: JSON.stringify(teamBSubstitutes),
        tossWinner: tossWinner,
        isTossComplete: true,
        lastUpdated: new Date(),
      },
      create: {
        matchId,
        teamAPlayers: JSON.stringify(teamAPlayers),
        teamBPlayers: JSON.stringify(teamBPlayers),
        teamASubstitutes: JSON.stringify(teamASubstitutes),
        teamBSubstitutes: JSON.stringify(teamBSubstitutes),
        tossWinner: tossWinner,
        isTossComplete: true,
      },
    });
    console.log(`Saved lineup data to database for match ${matchId}`);
    return true;
  } catch (error) {
    console.error('Error saving lineup data to database:', error);
    return false;
  }
}

/**
 * Manually refresh the lineup data for a match by fetching from the API
 * and updating the database
 */
export async function refreshLineupFromApi(matchId: string) {
  try {
    // Get match details from database
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    console.log(`Refreshing lineup data from API for match ${matchId}`);
    const matchData = await fetchLiveMatchDetails(match.sportMonkId);

    // Check if lineup data exists
    const hasLineupData =
      matchData.lineup &&
      Array.isArray(matchData.lineup) &&
      matchData.lineup.length > 0;

    if (!hasLineupData) {
      return {
        success: false,
        message: 'Lineup not available yet',
        tossComplete: false,
      };
    }

    // Process lineup data
    const teamAPlayers: PlayerLineup[] = [];
    const teamBPlayers: PlayerLineup[] = [];
    const teamASubstitutes: PlayerLineup[] = [];
    const teamBSubstitutes: PlayerLineup[] = [];

    for (const player of matchData.lineup) {
      if (!player.player) continue;

      // Check if player is a substitute
      const isSubstitute =
        player.substitute === true ||
        player.position?.name?.toLowerCase().includes('substitute');

      const playerData: PlayerLineup = {
        id: player.player.id?.toString() || '',
        name: player.player.fullname || player.player.name || 'Unknown Player',
        role: player.player.position?.name || 'Unknown',
        image: player.player.image_path,
        isSubstitute: isSubstitute,
      };

      // Determine which team the player belongs to
      if (player.team_id?.toString() === match.teamAId) {
        if (isSubstitute) {
          teamASubstitutes.push(playerData);
        } else {
          teamAPlayers.push(playerData);
        }
      } else if (player.team_id?.toString() === match.teamBId) {
        if (isSubstitute) {
          teamBSubstitutes.push(playerData);
        } else {
          teamBPlayers.push(playerData);
        }
      }
    }

    // Save lineup data to database
    await saveLineupToDatabase(
      match.id,
      teamAPlayers,
      teamBPlayers,
      teamASubstitutes,
      teamBSubstitutes,
      matchData.toss?.toString() || null
    );

    return {
      success: true,
      tossComplete: true,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      teamASubstitutes,
      teamBSubstitutes,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      tossWinner: matchData.toss?.toString() || null,
      refreshed: true,
    };
  } catch (error) {
    console.error('Error refreshing lineup data:', error);
    throw error;
  }
}
