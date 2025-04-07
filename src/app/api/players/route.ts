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

// GET /api/players
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('team_id');
    const matchId = searchParams.get('matchId');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '100');

    // If matchId is provided, fetch players for that match
    if (matchId) {
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

        return NextResponse.json(players);
      }

      // If no match players found, get the match to find team details
      console.log('No match players found, fetching from match teams');
      const match = await prisma.match.findUnique({
        where: {
          id: matchId,
        },
      });

      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
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
        const processedTeamAPlayers: PlayerBase[] = teamAPlayers.map(
          (player) => {
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
          }
        );

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
        const processedTeamBPlayers: PlayerBase[] = teamBPlayers.map(
          (player) => {
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
          }
        );

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

      return NextResponse.json(players);
    }

    // If team_id is provided, fetch players for that team
    if (teamId) {
      const dbPlayers = await prisma.player.findMany({
        where: {
          teamId: teamId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        take: perPage,
        skip: (page - 1) * perPage,
      });

      // Process players with proper roles
      const playersWithCredits = dbPlayers.map((player) => ({
        ...player,
        role: standardizeRole(player.role),
        credits: calculatePlayerCredits(standardizeRole(player.role)),
      }));

      return NextResponse.json(playersWithCredits);
    }

    // If no parameters, get all players from database
    const players = await prisma.player.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: perPage,
      skip: (page - 1) * perPage,
    });

    // Process all players with proper roles
    const playersWithCredits = players.map((player) => ({
      ...player,
      role: standardizeRole(player.role),
      credits: calculatePlayerCredits(standardizeRole(player.role)),
    }));

    return NextResponse.json(playersWithCredits);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// Function to standardize player role to one of the 4 standard roles
function standardizeRole(role: string | null): string {
  if (!role) return determineRoleFromNull();

  // Clean up the role string
  const cleanRole = role.trim().toUpperCase();

  // Check for wicket keeper variations
  if (
    cleanRole === 'WK' ||
    cleanRole === 'WICKET-KEEPER' ||
    cleanRole === 'WICKETKEEPER' ||
    cleanRole === 'KEEPER' ||
    cleanRole.includes('KEEP')
  ) {
    return 'WK';
  }

  // Check for batsman variations
  if (
    cleanRole === 'BAT' ||
    cleanRole === 'BATSMAN' ||
    cleanRole === 'BATTER' ||
    cleanRole.includes('BAT')
  ) {
    return 'BAT';
  }

  // Check for all-rounder variations
  if (
    cleanRole === 'AR' ||
    cleanRole === 'ALL-ROUNDER' ||
    cleanRole === 'ALLROUNDER' ||
    cleanRole.includes('ALL') ||
    cleanRole.includes('ROUND')
  ) {
    return 'AR';
  }

  // Check for bowler variations
  if (
    cleanRole === 'BOWL' ||
    cleanRole === 'BOWLER' ||
    cleanRole.includes('BOWL')
  ) {
    return 'BOWL';
  }

  // If we couldn't match, determine a role randomly
  return determineRoleFromNull();
}

// Function to randomly determine a role when none is specified
function determineRoleFromNull(): string {
  // Random balanced distribution
  const rand = Math.random();
  if (rand < 0.15) return 'WK';
  if (rand < 0.45) return 'BAT';
  if (rand < 0.7) return 'AR';
  return 'BOWL';
}

// Function to calculate player credits based on role
function calculatePlayerCredits(role: string): number {
  // Default credits based on role
  switch (role) {
    case 'WK':
      return 8 + Math.random() * 1;
    case 'BAT':
      return 9 + Math.random() * 1;
    case 'AR':
      return 9 + Math.random() * 1;
    case 'BOWL':
      return 8.5 + Math.random() * 1;
    default:
      return 8 + Math.random() * 1;
  }
}

// Function to determine a random role based on player name
function determineRandomRole(name: string): string {
  const hash = name.split('').reduce((a: number, b: string) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const mod = Math.abs(hash) % 100;

  if (mod < 15) return 'WK';
  if (mod < 45) return 'BAT';
  if (mod < 70) return 'AR';
  return 'BOWL';
}

// Function to ensure balanced roles in the team
function ensureBalancedRoles(players: PlayerBase[]): PlayerBase[] {
  // Count current roles
  const roleCounts = {
    WK: players.filter((p) => p.role === 'WK').length,
    BAT: players.filter((p) => p.role === 'BAT').length,
    AR: players.filter((p) => p.role === 'AR').length,
    BOWL: players.filter((p) => p.role === 'BOWL').length,
  };

  const totalPlayers = players.length;

  // Minimum requirements for each role
  const minWK = 2;
  const minBAT = Math.ceil(totalPlayers * 0.25);
  const minAR = Math.ceil(totalPlayers * 0.2);
  const minBOWL = Math.ceil(totalPlayers * 0.25);

  // Create a copy to modify
  const playersCopy = [...players];

  // First, ensure minimum wicket keepers (always need at least 2)
  if (roleCounts.WK < minWK) {
    // Find players to convert to WK, preferring BATs first
    const wkDeficit = minWK - roleCounts.WK;
    let candidatesToConvert = playersCopy.filter((p) => p.role === 'BAT');

    // If not enough batsmen, look at other roles
    if (candidatesToConvert.length < wkDeficit) {
      candidatesToConvert = playersCopy.filter((p) => p.role !== 'WK');
    }

    // Convert the needed number of players to WK
    for (let i = 0; i < wkDeficit && i < candidatesToConvert.length; i++) {
      playersCopy[playersCopy.indexOf(candidatesToConvert[i])].role = 'WK';
    }
  }

  // Update role counts after WK adjustments
  let updatedRoleCounts = {
    WK: playersCopy.filter((p) => p.role === 'WK').length,
    BAT: playersCopy.filter((p) => p.role === 'BAT').length,
    AR: playersCopy.filter((p) => p.role === 'AR').length,
    BOWL: playersCopy.filter((p) => p.role === 'BOWL').length,
  };

  // Ensure minimum BATs
  if (updatedRoleCounts.BAT < minBAT) {
    const batDeficit = minBAT - updatedRoleCounts.BAT;
    // Prefer converting AR or BOWL to BAT, but not WK
    const candidatesToConvert = playersCopy.filter(
      (p) => p.role !== 'WK' && p.role !== 'BAT'
    );

    for (let i = 0; i < batDeficit && i < candidatesToConvert.length; i++) {
      playersCopy[playersCopy.indexOf(candidatesToConvert[i])].role = 'BAT';
    }
  }

  // Update role counts after BAT adjustments
  updatedRoleCounts = {
    WK: playersCopy.filter((p) => p.role === 'WK').length,
    BAT: playersCopy.filter((p) => p.role === 'BAT').length,
    AR: playersCopy.filter((p) => p.role === 'AR').length,
    BOWL: playersCopy.filter((p) => p.role === 'BOWL').length,
  };

  // Ensure minimum ARs
  if (updatedRoleCounts.AR < minAR) {
    const arDeficit = minAR - updatedRoleCounts.AR;
    // Prefer converting BOWL to AR, but not WK or BAT
    const candidatesToConvert = playersCopy.filter((p) => p.role === 'BOWL');

    for (let i = 0; i < arDeficit && i < candidatesToConvert.length; i++) {
      playersCopy[playersCopy.indexOf(candidatesToConvert[i])].role = 'AR';
    }
  }

  // Update role counts after AR adjustments
  updatedRoleCounts = {
    WK: playersCopy.filter((p) => p.role === 'WK').length,
    BAT: playersCopy.filter((p) => p.role === 'BAT').length,
    AR: playersCopy.filter((p) => p.role === 'AR').length,
    BOWL: playersCopy.filter((p) => p.role === 'BOWL').length,
  };

  // Ensure minimum BOWLs
  if (updatedRoleCounts.BOWL < minBOWL) {
    const bowlDeficit = minBOWL - updatedRoleCounts.BOWL;
    // Prefer converting AR to BOWL, but not WK or BAT
    const candidatesToConvert = playersCopy.filter((p) => p.role === 'AR');

    for (let i = 0; i < bowlDeficit && i < candidatesToConvert.length; i++) {
      playersCopy[playersCopy.indexOf(candidatesToConvert[i])].role = 'BOWL';
    }
  }

  // Update credits based on new roles
  return playersCopy.map((player) => ({
    ...player,
    credits: calculatePlayerCredits(player.role),
  }));
}

// GET /api/players/:id
export async function getById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check if player exists in database
    const player = await prisma.player.findUnique({
      where: { id: params.id },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Add credits to player data and ensure role is standardized
    const playerWithCredits = {
      ...player,
      role: standardizeRole(player.role),
      credits: calculatePlayerCredits(standardizeRole(player.role)),
    };

    return NextResponse.json(playerWithCredits);
  } catch (error) {
    console.error(`Error fetching player details:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch player details' },
      { status: 500 }
    );
  }
}

// This is a handler map for dynamic routes
export { getById as GET_PARAM_ID };

export async function POST(req: Request) {
  try {
    const {
      name,
      role,
      country,
      teamName,
      battingStyle,
      bowlingStyle,
      imageUrl,
    } = await req.json();

    // Validate required fields
    if (!name || !role || !country || !teamName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new player
    const player = await prisma.player.create({
      data: {
        name,
        role,
        country,
        teamName,
        battingStyle,
        bowlingStyle,
        imageUrl,
        isActive: true,
      },
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
