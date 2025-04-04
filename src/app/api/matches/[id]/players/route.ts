import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define player interfaces for type safety
interface PlayerBase {
  id: string;
  name: string;
  image: string | null;
  teamId: string;
  role: string;
  credits: number;
  points: number;
  selected: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

// Standard player roles
const ROLES = ['WK', 'BAT', 'AR', 'BOWL'];

// GET /api/matches/[id]/players
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    console.log(`Fetching players for match: ${matchId}`);

    // First try to get match players from the MatchPlayer table
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: {
        matchId: matchId,
      },
      include: {
        player: true,
      },
    });

    console.log(
      `Found ${matchPlayers.length} players in the MatchPlayer table`
    );

    if (matchPlayers && matchPlayers.length > 0) {
      // We have players in the MatchPlayer table, process them
      let players: PlayerBase[] = matchPlayers.map((mp) => ({
        id: mp.player.id,
        name: mp.player.name,
        image: mp.player.image,
        teamId: mp.teamId,
        // Clean the role to ensure it's one of the standard roles
        role: standardizeRole(mp.player.role),
        points: mp.points || 0,
        credits: calculatePlayerCredits(standardizeRole(mp.player.role)),
        selected: mp.selected || false,
        isCaptain: mp.isCaptain || false,
        isViceCaptain: mp.isViceCaptain || false,
      }));

      // Ensure we have a balanced distribution of roles
      players = ensureBalancedRoles(players);

      return NextResponse.json({
        success: true,
        data: players,
      });
    }

    // If no match players found, get the match to find team details
    console.log('No match players found, fetching from match teams');
    const match = await prisma.match.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: 'Match not found',
        },
        { status: 404 }
      );
    }

    // Get players from both teams
    let players: PlayerBase[] = [];

    // Get team A players with roles
    if (match.teamAId) {
      // Get players for team A
      const teamAPlayers = await prisma.player.findMany({
        where: {
          teamId: match.teamAId,
          isActive: true,
        },
      });

      console.log(
        `Found ${teamAPlayers.length} players for team A: ${match.teamAName}`
      );

      // Process team A players with proper roles
      const processedTeamAPlayers: PlayerBase[] = teamAPlayers.map((player) => {
        // Clean the role to ensure it's one of the standard roles
        const role = standardizeRole(player.role);

        return {
          id: player.id,
          name: player.name,
          image: player.image,
          teamId: match.teamAId,
          role: role,
          credits: calculatePlayerCredits(role),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        };
      });

      players = [...players, ...processedTeamAPlayers];
    }

    // Get team B players with roles
    if (match.teamBId) {
      // Get players for team B
      const teamBPlayers = await prisma.player.findMany({
        where: {
          teamId: match.teamBId,
          isActive: true,
        },
      });

      console.log(
        `Found ${teamBPlayers.length} players for team B: ${match.teamBName}`
      );

      // Process team B players with proper roles
      const processedTeamBPlayers: PlayerBase[] = teamBPlayers.map((player) => {
        // Clean the role to ensure it's one of the standard roles
        const role = standardizeRole(player.role);

        return {
          id: player.id,
          name: player.name,
          image: player.image,
          teamId: match.teamBId,
          role: role,
          credits: calculatePlayerCredits(role),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        };
      });

      players = [...players, ...processedTeamBPlayers];
    }

    // If we still don't have players, create dummy players
    if (players.length === 0) {
      console.log('No players found in teams, generating dummy players');

      // Create dummy players for both teams
      const createDummyPlayers = (
        teamId: string,
        teamName: string,
        count: number
      ): PlayerBase[] => {
        // Create a balanced distribution of roles
        return Array.from({ length: count }, (_, i) => {
          // Deterministic role assignment based on index
          let role;
          if (i % 11 === 0) role = 'WK';
          else if (i % 11 < 4) role = 'BAT';
          else if (i % 11 < 7) role = 'AR';
          else role = 'BOWL';

          return {
            id: `dummy-${teamId}-${i}`,
            name: `${teamName} Player ${i + 1}`,
            image: null,
            teamId: teamId,
            role: role,
            credits: calculatePlayerCredits(role),
            points: 0,
            selected: false,
            isCaptain: false,
            isViceCaptain: false,
          };
        });
      };

      // Create 15 players for each team
      const teamADummies = createDummyPlayers(
        match.teamAId,
        match.teamAName,
        15
      );
      const teamBDummies = createDummyPlayers(
        match.teamBId,
        match.teamBName,
        15
      );

      players = [...teamADummies, ...teamBDummies];
    }

    // Ensure we have a balanced distribution of roles
    players = ensureBalancedRoles(players);

    console.log('Role distribution after balancing:');
    console.log(`WK: ${players.filter((p) => p.role === 'WK').length}`);
    console.log(`BAT: ${players.filter((p) => p.role === 'BAT').length}`);
    console.log(`AR: ${players.filter((p) => p.role === 'AR').length}`);
    console.log(`BOWL: ${players.filter((p) => p.role === 'BOWL').length}`);

    return NextResponse.json({
      success: true,
      data: players,
    });
  } catch (error) {
    console.error('Error fetching players for match:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch players for match',
      },
      { status: 500 }
    );
  }
}

// Helper function to standardize role strings
function standardizeRole(role: string | null): string {
  if (!role) return determineRoleFromNull();

  const upperRole = role.toUpperCase();

  // Check for wicket keeper variations
  if (
    upperRole === 'WK' ||
    upperRole === 'WICKET KEEPER' ||
    upperRole === 'WICKETKEEPER' ||
    upperRole.includes('KEEP')
  ) {
    return 'WK';
  }

  // Check for batsman variations
  if (
    upperRole === 'BAT' ||
    upperRole === 'BATSMAN' ||
    upperRole === 'BATTER' ||
    upperRole.includes('BAT')
  ) {
    return 'BAT';
  }

  // Check for all-rounder variations
  if (
    upperRole === 'AR' ||
    upperRole === 'ALL ROUNDER' ||
    upperRole === 'ALLROUNDER' ||
    upperRole.includes('ALL') ||
    upperRole.includes('ROUND')
  ) {
    return 'AR';
  }

  // Check for bowler variations
  if (
    upperRole === 'BOWL' ||
    upperRole === 'BOWLER' ||
    upperRole.includes('BOWL')
  ) {
    return 'BOWL';
  }

  // If no match, determine a role randomly but deterministically
  return determineRandomRole(role);
}

// If role is null, determine a random role with a weighted distribution
function determineRoleFromNull(): string {
  // Generate a random number between 0 and 1
  const rand = Math.random();

  // Weighted distribution: 10% WK, 40% BAT, 20% AR, 30% BOWL
  if (rand < 0.1) return 'WK';
  if (rand < 0.5) return 'BAT';
  if (rand < 0.7) return 'AR';
  return 'BOWL';
}

// Calculate player credits based on role
function calculatePlayerCredits(role: string): number {
  // Base credit values for each role
  const baseCredits = {
    WK: 8.0,
    BAT: 9.0,
    AR: 9.0,
    BOWL: 8.5,
  };

  // Get base credit for role
  const base = baseCredits[role as keyof typeof baseCredits] || 8.5;

  // Add small random variation (0.0 to 1.5)
  const variation = Math.floor(Math.random() * 16) / 10;

  return base + variation;
}

// Determine a random role based on player name (deterministic)
function determineRandomRole(name: string): string {
  // Use the sum of char codes in the name to get a deterministic "random" value
  const charSum = name
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  // Ensure we get a value between 0 and 3
  const roleIndex = charSum % 4;

  // Map to roles
  const roles = ['WK', 'BAT', 'AR', 'BOWL'];
  return roles[roleIndex];
}

// Ensure we have a balanced distribution of roles
function ensureBalancedRoles(players: PlayerBase[]): PlayerBase[] {
  // Count players by role
  const roleCounts = {
    WK: players.filter((p) => p.role === 'WK').length,
    BAT: players.filter((p) => p.role === 'BAT').length,
    AR: players.filter((p) => p.role === 'AR').length,
    BOWL: players.filter((p) => p.role === 'BOWL').length,
  };

  // Define minimum number of players we want per role
  const minWK = 2;
  const minBAT = 6;
  const minAR = 4;
  const minBOWL = 6;

  console.log('Initial role counts:', roleCounts);

  // Create a deep copy of players to avoid modifying the original array directly
  const balancedPlayers = [...players];

  // Check if we need to adjust wicket keepers (WK)
  if (roleCounts.WK < minWK) {
    console.log(`Need to add ${minWK - roleCounts.WK} WK players`);

    // Get players to convert (prefer BAT if we have excess)
    let playersToConvert;
    if (roleCounts.BAT > minBAT) {
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BAT')
        .slice(0, minWK - roleCounts.WK);
    } else {
      // If not enough BAT, convert BOWL
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BOWL')
        .slice(0, minWK - roleCounts.WK);
    }

    // Convert selected players to WK
    playersToConvert.forEach((player) => {
      player.role = 'WK';
      // Adjust credits for role
      player.credits = calculatePlayerCredits('WK');
    });
  }

  // Check if we need to adjust batsmen (BAT)
  if (roleCounts.BAT < minBAT) {
    console.log(`Need to add ${minBAT - roleCounts.BAT} BAT players`);

    // Get players to convert (prefer AR if we have excess)
    let playersToConvert;
    if (roleCounts.AR > minAR) {
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'AR')
        .slice(0, minBAT - roleCounts.BAT);
    } else {
      // If not enough AR, convert BOWL
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BOWL')
        .slice(0, minBAT - roleCounts.BAT);
    }

    // Convert selected players to BAT
    playersToConvert.forEach((player) => {
      player.role = 'BAT';
      // Adjust credits for role
      player.credits = calculatePlayerCredits('BAT');
    });
  }

  // Check if we need to adjust all-rounders (AR)
  if (roleCounts.AR < minAR) {
    console.log(`Need to add ${minAR - roleCounts.AR} AR players`);

    // Get players to convert (prefer BAT if we have excess)
    let playersToConvert;
    if (roleCounts.BAT > minBAT + 2) {
      // Only convert BAT if we have at least 2 more than minimum
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BAT')
        .slice(0, minAR - roleCounts.AR);
    } else {
      // If not enough BAT, convert BOWL
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BOWL')
        .slice(0, minAR - roleCounts.AR);
    }

    // Convert selected players to AR
    playersToConvert.forEach((player) => {
      player.role = 'AR';
      // Adjust credits for role
      player.credits = calculatePlayerCredits('AR');
    });
  }

  // Check if we need to adjust bowlers (BOWL)
  if (roleCounts.BOWL < minBOWL) {
    console.log(`Need to add ${minBOWL - roleCounts.BOWL} BOWL players`);

    // Get players to convert (prefer AR if we have excess)
    let playersToConvert;
    if (roleCounts.AR > minAR + 2) {
      // Only convert AR if we have at least 2 more than minimum
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'AR')
        .slice(0, minBOWL - roleCounts.BOWL);
    } else {
      // If not enough AR, convert BAT
      playersToConvert = balancedPlayers
        .filter((p) => p.role === 'BAT')
        .slice(0, minBOWL - roleCounts.BOWL);
    }

    // Convert selected players to BOWL
    playersToConvert.forEach((player) => {
      player.role = 'BOWL';
      // Adjust credits for role
      player.credits = calculatePlayerCredits('BOWL');
    });
  }

  // Update role counts after adjustments
  const newRoleCounts = {
    WK: balancedPlayers.filter((p) => p.role === 'WK').length,
    BAT: balancedPlayers.filter((p) => p.role === 'BAT').length,
    AR: balancedPlayers.filter((p) => p.role === 'AR').length,
    BOWL: balancedPlayers.filter((p) => p.role === 'BOWL').length,
  };

  console.log('Final role counts after balancing:', newRoleCounts);

  return balancedPlayers;
}
