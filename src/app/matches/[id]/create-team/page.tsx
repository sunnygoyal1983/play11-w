'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { FaInfoCircle, FaCrown, FaStar, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Player roles
const ROLES = {
  WK: 'Wicket Keeper',
  BAT: 'Batsman',
  AR: 'All Rounder',
  BOWL: 'Bowler',
};

// Team constraints
const CONSTRAINTS = {
  TOTAL_PLAYERS: 11,
  MAX_PLAYERS_PER_TEAM: 7,
  MIN_PLAYERS_PER_TEAM: 3,
  CREDITS: 100,
  MIN_WK: 1,
  MAX_WK: 4,
  MIN_BAT: 3,
  MAX_BAT: 6,
  MIN_AR: 1,
  MAX_AR: 4,
  MIN_BOWL: 3,
  MAX_BOWL: 6,
};

// Final player type with proper structure
interface Player {
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

export default function CreateTeam() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'WK' | 'BAT' | 'AR' | 'BOWL'>(
    'WK'
  );
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [showCaptainSelection, setShowCaptainSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  // Add dedicated state for captain and vice-captain
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  const [showLineupInfo, setShowLineupInfo] = useState(false);
  const [lineupAvailable, setLineupAvailable] = useState(false);
  const [officialLineups, setOfficialLineups] = useState<{
    teamA: Array<{
      id: string;
      name: string;
      role: string;
      image?: string;
      isSubstitute?: boolean;
    }>;
    teamB: Array<{
      id: string;
      name: string;
      role: string;
      image?: string;
      isSubstitute?: boolean;
    }>;
    teamASubstitutes: Array<{
      id: string;
      name: string;
      role: string;
      image?: string;
      isSubstitute?: boolean;
    }>;
    teamBSubstitutes: Array<{
      id: string;
      name: string;
      role: string;
      image?: string;
      isSubstitute?: boolean;
    }>;
  }>({
    teamA: [],
    teamB: [],
    teamASubstitutes: [],
    teamBSubstitutes: [],
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(
        '/auth/signin?callbackUrl=' +
          encodeURIComponent(`/matches/${matchId}/create-team`)
      );
    }
  }, [status, router, matchId]);

  // Helper function to create and use dummy players if API fails
  function createAndUseDummyPlayers(matchData: any) {
    console.log('Creating dummy players as fallback...');
    if (matchData && matchData.teamAId && matchData.teamBId) {
      const dummyPlayers = createDummyPlayers(
        matchData.teamAId,
        matchData.teamBId,
        matchData.teamAName,
        matchData.teamBName
      );
      setPlayers(dummyPlayers);

      // Set filtered players to WK role initially
      const wkPlayers = dummyPlayers.filter((p: Player) => p.role === 'WK');
      setFilteredPlayers(wkPlayers);
      setActiveTab('WK');

      console.log('Created dummy players:', dummyPlayers.length);
    } else {
      setError('Failed to load match details');
    }
  }

  // Fetch match data and players
  const fetchMatchData = async () => {
    try {
      if (!matchId) {
        console.error('Match ID is missing');
        setError('Match ID is missing');
        return;
      }

      // Fetch match details and players in parallel
      console.log('Fetching match data for ID:', matchId);
      setLoading(true);

      const [matchResponse, lineupResponse] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/lineup`),
      ]);

      if (!matchResponse.ok) {
        throw new Error(
          `Failed to fetch match data: ${matchResponse.statusText}`
        );
      }

      const matchData = await matchResponse.json();
      setMatch(matchData.data);
      console.log('Match data loaded:', matchData.data);

      // Check if lineup data was returned (available after toss)
      const hasLineup = lineupResponse.ok;
      let lineupData = null;

      if (hasLineup) {
        lineupData = await lineupResponse.json();
        console.log('Lineup data available:', lineupData);
        if (lineupData.success && lineupData.tossComplete) {
          setLineupAvailable(true);
          setOfficialLineups({
            teamA: lineupData.teamA || [],
            teamB: lineupData.teamB || [],
            teamASubstitutes: lineupData.teamASubstitutes || [],
            teamBSubstitutes: lineupData.teamBSubstitutes || [],
          });
        }
      }

      // Now directly fetch players from the API without complex processing
      console.log('Directly fetching players from match players API...');
      try {
        const matchPlayersResponse = await fetch(
          `/api/matches/${matchId}/players`
        );

        if (matchPlayersResponse.ok) {
          const matchPlayersData = await matchPlayersResponse.json();
          console.log('Match players API raw response:', matchPlayersData);

          if (
            matchPlayersData.success &&
            matchPlayersData.data &&
            Array.isArray(matchPlayersData.data) &&
            matchPlayersData.data.length > 0
          ) {
            // Directly use the players from the API with minimal processing
            const rawPlayers = matchPlayersData.data;
            console.log('Players from API:', rawPlayers.length);

            // IMPORTANT FIX: We need to explicitly normalize the role values
            // Many API responses use non-standard role values
            const validRoles = ['WK', 'BAT', 'AR', 'BOWL'];
            const normalizedPlayers = rawPlayers.map((p: any) => {
              // Force role to be one of the valid types
              let normalizedRole = 'BAT'; // Default role

              const roleUpper = (p.role || '').toUpperCase();
              if (
                roleUpper === 'WK' ||
                roleUpper.includes('KEEPER') ||
                roleUpper.includes('WICKET')
              ) {
                normalizedRole = 'WK';
              } else if (
                roleUpper === 'BAT' ||
                roleUpper.includes('BATS') ||
                roleUpper.includes('BATSMAN')
              ) {
                normalizedRole = 'BAT';
              } else if (
                roleUpper === 'AR' ||
                roleUpper.includes('ALL') ||
                roleUpper.includes('ROUNDER')
              ) {
                normalizedRole = 'AR';
              } else if (roleUpper === 'BOWL' || roleUpper.includes('BOWL')) {
                normalizedRole = 'BOWL';
              }

              console.log(
                `Normalized role for ${p.name}: ${p.role} -> ${normalizedRole}`
              );

              return {
                ...p,
                role: normalizedRole,
              };
            });

            // Count roles to ensure we have at least some of each type
            const roleCounts = {
              WK: normalizedPlayers.filter((p: any) => p.role === 'WK').length,
              BAT: normalizedPlayers.filter((p: any) => p.role === 'BAT')
                .length,
              AR: normalizedPlayers.filter((p: any) => p.role === 'AR').length,
              BOWL: normalizedPlayers.filter((p: any) => p.role === 'BOWL')
                .length,
            };

            console.log('Initial role counts after normalization:', roleCounts);

            // If any role type is missing, we need to create at least a few players of that role
            let balancedPlayers = [...normalizedPlayers];

            // Check if we need to balance roles
            const needsBalancing = validRoles.some(
              (role) =>
                balancedPlayers.filter((p) => p.role === role).length === 0
            );

            if (needsBalancing) {
              console.log('Needs role balancing - some roles are missing');

              // For each missing role, convert some players to that role
              for (const role of validRoles) {
                if (
                  balancedPlayers.filter((p) => p.role === role).length === 0
                ) {
                  // Take 3 random players and convert them to this role
                  const playersToConvert = balancedPlayers
                    .filter((p) => {
                      // Prefer to convert from roles that have many players
                      const currentRole = p.role;
                      const roleCount = balancedPlayers.filter(
                        (p2) => p2.role === currentRole
                      ).length;
                      return roleCount > 3; // Only convert from roles with enough players
                    })
                    .slice(0, 3);

                  if (playersToConvert.length > 0) {
                    console.log(
                      `Converting ${playersToConvert.length} players to ${role} role`
                    );

                    balancedPlayers = balancedPlayers.map((p) => {
                      if (playersToConvert.some((p2) => p2.id === p.id)) {
                        return { ...p, role };
                      }
                      return p;
                    });
                  } else {
                    // If we can't find enough players to convert, take any players
                    const anyPlayersToConvert = balancedPlayers.slice(0, 3);
                    console.log(
                      `Converting ${anyPlayersToConvert.length} players to ${role} role (fallback)`
                    );

                    balancedPlayers = balancedPlayers.map((p) => {
                      if (anyPlayersToConvert.some((p2) => p2.id === p.id)) {
                        return { ...p, role };
                      }
                      return p;
                    });
                  }
                }
              }

              // Log the new role counts
              const newRoleCounts = {
                WK: balancedPlayers.filter((p) => p.role === 'WK').length,
                BAT: balancedPlayers.filter((p) => p.role === 'BAT').length,
                AR: balancedPlayers.filter((p) => p.role === 'AR').length,
                BOWL: balancedPlayers.filter((p) => p.role === 'BOWL').length,
              };

              console.log('Role counts after balancing:', newRoleCounts);
            }

            // Simple player validation and default values
            const validPlayers = balancedPlayers.map((p: any) => ({
              id: p.id || `player-${Math.random().toString(36).substring(7)}`,
              name: p.name || 'Unknown Player',
              image: p.image || '/images/player-placeholder.png',
              teamId: p.teamId || '',
              role: p.role, // This is now guaranteed to be one of the valid roles
              credits: typeof p.credits === 'number' ? p.credits : 9.0,
              points: typeof p.points === 'number' ? p.points : 0,
              selected: false,
              isCaptain: false,
              isViceCaptain: false,
            }));

            // Set the players state
            setPlayers(validPlayers);

            // Set filtered players based on the first tab
            const wkPlayers = validPlayers.filter(
              (p: Player) => p.role === 'WK'
            );
            const batPlayers = validPlayers.filter(
              (p: Player) => p.role === 'BAT'
            );
            const arPlayers = validPlayers.filter(
              (p: Player) => p.role === 'AR'
            );
            const bowlPlayers = validPlayers.filter(
              (p: Player) => p.role === 'BOWL'
            );

            console.log('Role distribution:');
            console.log('WK:', wkPlayers.length);
            console.log('BAT:', batPlayers.length);
            console.log('AR:', arPlayers.length);
            console.log('BOWL:', bowlPlayers.length);

            // Use the active tab to filter players
            const initialFiltered = validPlayers.filter(
              (p: Player) => p.role === activeTab
            );

            if (initialFiltered.length > 0) {
              setFilteredPlayers(initialFiltered);
              console.log(
                `Set ${initialFiltered.length} players for ${activeTab} tab`
              );
            } else {
              // If no players for this role, fallback to the first role that has players
              if (wkPlayers.length > 0) {
                setFilteredPlayers(wkPlayers);
                setActiveTab('WK');
              } else if (batPlayers.length > 0) {
                setFilteredPlayers(batPlayers);
                setActiveTab('BAT');
              } else if (arPlayers.length > 0) {
                setFilteredPlayers(arPlayers);
                setActiveTab('AR');
              } else if (bowlPlayers.length > 0) {
                setFilteredPlayers(bowlPlayers);
                setActiveTab('BOWL');
              } else {
                // Final fallback to all players if role filtering returns nothing
                setFilteredPlayers(validPlayers);
              }
            }
          } else {
            console.error(
              'API returned success but no valid players data found'
            );
            createAndUseDummyPlayers(matchData.data);
          }
        } else {
          console.error(
            'Match players API returned error:',
            matchPlayersResponse.status
          );
          createAndUseDummyPlayers(matchData.data);
        }
      } catch (err) {
        console.error('Error fetching from match players API:', err);
        createAndUseDummyPlayers(matchData.data);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchMatchData:', error);
      setError(error.message || 'Failed to load match data');
      setLoading(false);
    }
  };

  // Helper to create dummy players as fallback
  const createDummyPlayers = (
    teamAId: string,
    teamBId: string,
    teamAName: string,
    teamBName: string
  ) => {
    const roles = ['WK', 'BAT', 'AR', 'BOWL'];
    const dummyPlayers = [];

    // Create a balanced set of players for each team
    for (let team of [
      { id: teamAId, name: teamAName },
      { id: teamBId, name: teamBName },
    ]) {
      // Create 2 WK
      for (let i = 0; i < 2; i++) {
        dummyPlayers.push({
          id: `dummy-${team.id}-wk-${i}`,
          name: `${team.name} WK ${i + 1}`,
          image: null,
          teamId: team.id,
          role: 'WK',
          credits: 8.0 + Math.random(),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        });
      }

      // Create 6 BAT
      for (let i = 0; i < 6; i++) {
        dummyPlayers.push({
          id: `dummy-${team.id}-bat-${i}`,
          name: `${team.name} BAT ${i + 1}`,
          image: null,
          teamId: team.id,
          role: 'BAT',
          credits: 8.5 + Math.random(),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        });
      }

      // Create 4 AR
      for (let i = 0; i < 4; i++) {
        dummyPlayers.push({
          id: `dummy-${team.id}-ar-${i}`,
          name: `${team.name} AR ${i + 1}`,
          image: null,
          teamId: team.id,
          role: 'AR',
          credits: 8.5 + Math.random(),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        });
      }

      // Create 6 BOWL
      for (let i = 0; i < 6; i++) {
        dummyPlayers.push({
          id: `dummy-${team.id}-bowl-${i}`,
          name: `${team.name} BOWL ${i + 1}`,
          image: null,
          teamId: team.id,
          role: 'BOWL',
          credits: 8.0 + Math.random(),
          points: 0,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
        });
      }
    }

    return dummyPlayers;
  };

  // Helper function to standardize roles
  const standardizeRole = (role: string | null) => {
    if (!role) return 'BAT'; // Default to batsman if no role

    const upperRole = role.toUpperCase().trim();

    console.log('Standardizing role:', upperRole);

    // Check for wicket keeper variations
    if (
      upperRole === 'WK' ||
      upperRole === 'WICKET KEEPER' ||
      upperRole === 'WICKETKEEPER' ||
      upperRole.includes('KEEP') ||
      upperRole.includes('KEEPER')
    ) {
      return 'WK';
    }
    // Check for batsman variations
    else if (
      upperRole === 'BAT' ||
      upperRole === 'BATSMAN' ||
      upperRole === 'BATTER' ||
      upperRole.includes('BAT') ||
      upperRole.includes('BATS')
    ) {
      return 'BAT';
    }
    // Check for all-rounder variations
    else if (
      upperRole === 'AR' ||
      upperRole === 'ALL ROUNDER' ||
      upperRole === 'ALLROUNDER' ||
      upperRole.includes('ALL') ||
      upperRole.includes('ROUND')
    ) {
      return 'AR';
    }
    // Check for bowler variations
    else if (
      upperRole === 'BOWL' ||
      upperRole === 'BOWLER' ||
      upperRole.includes('BOWL') ||
      upperRole.includes('BALLER')
    ) {
      return 'BOWL';
    }

    // If we can't determine the role, use a simple heuristic based on the player's name
    // This is a last resort fallback
    const roleMapping = {
      0: 'WK',
      1: 'BAT',
      2: 'BAT',
      3: 'AR',
      4: 'AR',
      5: 'BOWL',
      6: 'BOWL',
      7: 'BOWL',
    };

    // Use the player's name length as a simple hash to assign a role
    const roleIndex = role.length % 8;
    console.log(
      `Using fallback role assignment for "${role}" -> ${
        roleMapping[roleIndex as keyof typeof roleMapping]
      }`
    );

    return roleMapping[roleIndex as keyof typeof roleMapping] || 'BAT';
  };

  // Helper function to calculate player credits if not present
  const calculateCredits = (player: any) => {
    // Default credits based on role
    let baseCredits = 8;

    if (player.role === 'WK') baseCredits = 8;
    else if (player.role === 'BAT') baseCredits = 9;
    else if (player.role === 'AR') baseCredits = 9.5;
    else if (player.role === 'BOWL') baseCredits = 8.5;

    // Add a small random factor for variety
    const randomFactor = ((player.name.length % 3) + 1) * 0.5;

    return baseCredits + randomFactor;
  };

  // Calculate team statistics
  const teamStats = {
    totalPlayers: selectedPlayers.length,
    totalCredits: selectedPlayers.reduce(
      (sum, player) => sum + (player.credits || 9),
      0
    ),
    teamACounts: selectedPlayers.filter((p) => p.teamId === match?.teamAId)
      .length,
    teamBCounts: selectedPlayers.filter((p) => p.teamId === match?.teamBId)
      .length,
    roleCounts: {
      WK: selectedPlayers.filter((p) => p.role === 'WK').length,
      BAT: selectedPlayers.filter((p) => p.role === 'BAT').length,
      AR: selectedPlayers.filter((p) => p.role === 'AR').length,
      BOWL: selectedPlayers.filter((p) => p.role === 'BOWL').length,
    },
  };

  // Check if player can be selected based on team constraints
  const canSelectPlayer = (player: any) => {
    // Check if we already have 11 players (max allowed)
    if (teamStats.totalPlayers === CONSTRAINTS.TOTAL_PLAYERS) {
      return false;
    }

    // Check team limits
    if (
      player.teamId === match?.teamAId &&
      teamStats.teamACounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM
    ) {
      return false;
    }
    if (
      player.teamId === match?.teamBId &&
      teamStats.teamBCounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM
    ) {
      return false;
    }

    // Check role limits
    if (player.role === 'WK' && teamStats.roleCounts.WK >= CONSTRAINTS.MAX_WK) {
      return false;
    }
    if (
      player.role === 'BAT' &&
      teamStats.roleCounts.BAT >= CONSTRAINTS.MAX_BAT
    ) {
      return false;
    }
    if (player.role === 'AR' && teamStats.roleCounts.AR >= CONSTRAINTS.MAX_AR) {
      return false;
    }
    if (
      player.role === 'BOWL' &&
      teamStats.roleCounts.BOWL >= CONSTRAINTS.MAX_BOWL
    ) {
      return false;
    }

    // Check credits
    if (teamStats.totalCredits + player.credits > CONSTRAINTS.CREDITS) {
      return false;
    }

    return true;
  };

  // Handle player selection/deselection
  const togglePlayerSelection = (playerId: string) => {
    const playerIndex = players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      console.error(`Player with ID ${playerId} not found`);
      return;
    }

    const player = players[playerIndex];
    console.log(
      'Attempting to toggle player:',
      player.name,
      'Current total players:',
      teamStats.totalPlayers
    );

    if (player.selected) {
      // Deselect player
      console.log('Deselecting player:', player.name);
      const updatedPlayers = players.map((p) =>
        p.id === playerId
          ? { ...p, selected: false, isCaptain: false, isViceCaptain: false }
          : p
      );
      setPlayers(updatedPlayers);
      setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId));
    } else {
      // Select player if constraints allow
      if (canSelectPlayer(player)) {
        console.log(
          'Selecting player:',
          player.name,
          'New total will be:',
          teamStats.totalPlayers + 1
        );
        const updatedPlayers = players.map((p) =>
          p.id === playerId ? { ...p, selected: true } : p
        );
        setPlayers(updatedPlayers);
        setSelectedPlayers([...selectedPlayers, { ...player, selected: true }]);
      } else {
        // Show detailed error message
        console.log('Cannot select player due to constraints:', {
          totalPlayers: teamStats.totalPlayers,
          maxAllowed: CONSTRAINTS.TOTAL_PLAYERS,
          playerRole: player.role,
          currentRoleCounts: teamStats.roleCounts,
          maxRoleAllowed: {
            WK: CONSTRAINTS.MAX_WK,
            BAT: CONSTRAINTS.MAX_BAT,
            AR: CONSTRAINTS.MAX_AR,
            BOWL: CONSTRAINTS.MAX_BOWL,
          },
          teamACounts: teamStats.teamACounts,
          teamBCounts: teamStats.teamBCounts,
          maxPerTeam: CONSTRAINTS.MAX_PLAYERS_PER_TEAM,
          playerCredits: player.credits,
          currentCredits: teamStats.totalCredits,
          maxCredits: CONSTRAINTS.CREDITS,
        });

        let errorMessage = 'Cannot select this player: ';

        if (teamStats.totalPlayers === CONSTRAINTS.TOTAL_PLAYERS) {
          errorMessage += 'Team already has maximum 11 players.';
        } else if (
          player.teamId === match?.teamAId &&
          teamStats.teamACounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_PLAYERS_PER_TEAM} players from ${match.teamAName} allowed.`;
        } else if (
          player.teamId === match?.teamBId &&
          teamStats.teamBCounts >= CONSTRAINTS.MAX_PLAYERS_PER_TEAM
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_PLAYERS_PER_TEAM} players from ${match.teamBName} allowed.`;
        } else if (
          player.role === 'WK' &&
          teamStats.roleCounts.WK >= CONSTRAINTS.MAX_WK
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_WK} wicket keepers allowed.`;
        } else if (
          player.role === 'BAT' &&
          teamStats.roleCounts.BAT >= CONSTRAINTS.MAX_BAT
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_BAT} batsmen allowed.`;
        } else if (
          player.role === 'AR' &&
          teamStats.roleCounts.AR >= CONSTRAINTS.MAX_AR
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_AR} all rounders allowed.`;
        } else if (
          player.role === 'BOWL' &&
          teamStats.roleCounts.BOWL >= CONSTRAINTS.MAX_BOWL
        ) {
          errorMessage += `Maximum ${CONSTRAINTS.MAX_BOWL} bowlers allowed.`;
        } else if (
          teamStats.totalCredits + player.credits >
          CONSTRAINTS.CREDITS
        ) {
          errorMessage += `Not enough credits (${
            CONSTRAINTS.CREDITS - teamStats.totalCredits
          } left, need ${player.credits}).`;
        }

        toast.error(errorMessage);
      }
    }
  };

  // Set captain with a dedicated function
  const handleSetCaptain = (playerId: string) => {
    console.log('Setting captain:', playerId);

    // If this player was vice-captain, remove that role
    if (playerId === viceCaptainId) {
      setViceCaptainId(null);
    }

    // Set the captain ID
    setCaptainId(playerId);
  };

  // Set vice-captain with a dedicated function
  const handleSetViceCaptain = (playerId: string) => {
    console.log('Setting vice-captain:', playerId);

    // If this player was captain, remove that role
    if (playerId === captainId) {
      setCaptainId(null);
    }

    // Set the vice-captain ID
    setViceCaptainId(playerId);
  };

  // Check if team is valid for submission - modified for dedicated captain/vice-captain state
  const isTeamValid = () => {
    console.log('Checking team validity...');

    // Check total players count
    if (teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS) {
      console.log(
        'Invalid: Incorrect number of players',
        teamStats.totalPlayers
      );
      return false;
    }

    // Check role requirements
    if (teamStats.roleCounts.WK < CONSTRAINTS.MIN_WK) {
      console.log(
        'Invalid: Not enough WK',
        teamStats.roleCounts.WK,
        '<',
        CONSTRAINTS.MIN_WK
      );
      return false;
    }
    if (teamStats.roleCounts.BAT < CONSTRAINTS.MIN_BAT) {
      console.log(
        'Invalid: Not enough BAT',
        teamStats.roleCounts.BAT,
        '<',
        CONSTRAINTS.MIN_BAT
      );
      return false;
    }
    if (teamStats.roleCounts.AR < CONSTRAINTS.MIN_AR) {
      console.log(
        'Invalid: Not enough AR',
        teamStats.roleCounts.AR,
        '<',
        CONSTRAINTS.MIN_AR
      );
      return false;
    }
    if (teamStats.roleCounts.BOWL < CONSTRAINTS.MIN_BOWL) {
      console.log(
        'Invalid: Not enough BOWL',
        teamStats.roleCounts.BOWL,
        '<',
        CONSTRAINTS.MIN_BOWL
      );
      return false;
    }

    // Check team distribution
    if (teamStats.teamACounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) {
      console.log(
        'Invalid: Not enough players from team A',
        teamStats.teamACounts,
        '<',
        CONSTRAINTS.MIN_PLAYERS_PER_TEAM
      );
      return false;
    }
    if (teamStats.teamBCounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) {
      console.log(
        'Invalid: Not enough players from team B',
        teamStats.teamBCounts,
        '<',
        CONSTRAINTS.MIN_PLAYERS_PER_TEAM
      );
      return false;
    }

    // Check captain and vice-captain selection
    if (showCaptainSelection) {
      console.log('Captain selection check:', {
        showCaptainSelection,
        captainId,
        viceCaptainId,
        teamName: teamName.trim(),
      });

      if (!captainId) {
        console.log('Invalid: No captain selected');
        return false;
      }
      if (!viceCaptainId) {
        console.log('Invalid: No vice-captain selected');
        return false;
      }
      if (captainId === viceCaptainId) {
        console.log('Invalid: Captain and vice-captain cannot be the same');
        return false;
      }
      if (!teamName.trim()) {
        console.log('Invalid: No team name provided');
        return false;
      }
    }

    console.log('Team is valid!');
    return true;
  };

  // Handle team submission - modified for dedicated captain/vice-captain state
  const handleSubmitTeam = async () => {
    if (!isTeamValid()) {
      toast.error('Please complete your team selection');
      return;
    }

    try {
      setIsSaving(true);

      if (!captainId || !viceCaptainId) {
        toast.error('Please select a captain and vice-captain');
        setIsSaving(false);
        return;
      }

      // Create team object with the dedicated IDs
      const teamData = {
        name: teamName,
        matchId: matchId,
        captainId: captainId,
        viceCaptainId: viceCaptainId,
        players: selectedPlayers.map((player) => ({
          playerId: player.id,
          isCaptain: player.id === captainId,
          isViceCaptain: player.id === viceCaptainId,
        })),
      };

      console.log('Submitting team data:', JSON.stringify(teamData));

      // Submit to API
      const response = await fetch('/api/fantasy-teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      const result = await response.json();
      console.log('API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to create team');
      }

      toast.success('Team created successfully!');

      // Redirect based on referrer - if from contest page, go back there
      const referrer = document.referrer;
      if (referrer && referrer.includes('/contests/')) {
        const contestId = referrer.split('/contests/')[1].split('/')[0];
        router.push(`/contests/${contestId}/join`);
      } else {
        router.push(`/matches/${matchId}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team');
      console.error('Team creation error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Proceed to captain selection
  const proceedToCaptainSelection = () => {
    if (teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS) {
      toast.error(`Please select exactly ${CONSTRAINTS.TOTAL_PLAYERS} players`);
      return;
    }
    setShowCaptainSelection(true);
  };

  // Go back to player selection
  const backToPlayerSelection = () => {
    setShowCaptainSelection(false);
  };

  // Render player card
  const renderPlayerCard = (player: any) => (
    <div
      key={player.id}
      className={`border rounded-lg overflow-hidden mb-3 ${
        player.selected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'
      }`}
    >
      <div className="p-3 flex justify-between items-center">
        <div className="flex items-center flex-1">
          <div className="mr-3">
            {player.image ? (
              <Image
                src={player.image}
                alt={player.name}
                width={40}
                height={40}
                className="rounded-full bg-gray-200"
                onError={(e) => {
                  // Fallback for broken images
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/images/player-placeholder.png';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                {player.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium flex items-center">
              {player.name}
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100">
                {player.teamId === match?.teamAId
                  ? match?.teamAName
                  : match?.teamBName}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {player.points || 0} pts
            </div>
          </div>
          <div className="text-right mr-3">
            <div className="font-semibold">{player.credits} Cr</div>
            <div className="text-xs text-indigo-600">
              {player.selected ? 'Selected' : ''}
            </div>
          </div>
        </div>
        <button
          onClick={() => togglePlayerSelection(player.id)}
          disabled={!player.selected && !canSelectPlayer(player)}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            player.selected
              ? 'bg-red-500 text-white'
              : canSelectPlayer(player)
              ? 'bg-green-500 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {player.selected ? '-' : '+'}
        </button>
      </div>
    </div>
  );

  // Update filtered players when active tab changes
  useEffect(() => {
    // Skip if no players are loaded yet
    if (!players || players.length === 0) return;

    console.log(`Setting filtered players for tab: ${activeTab}`);

    // Simply filter players by the selected role
    const filtered = players.filter((p) => p.role === activeTab);
    console.log(`Found ${filtered.length} players with role ${activeTab}`);

    if (filtered.length > 0) {
      setFilteredPlayers(filtered);
    } else {
      console.log(
        'No players found for current role tab, trying to find available players in other roles'
      );

      // If no players found for this role, find the first role that has players
      const wkPlayers = players.filter((p) => p.role === 'WK');
      const batPlayers = players.filter((p) => p.role === 'BAT');
      const arPlayers = players.filter((p) => p.role === 'AR');
      const bowlPlayers = players.filter((p) => p.role === 'BOWL');

      // If there are no players in the selected role tab, switch to a different tab with players
      if (wkPlayers.length > 0 && activeTab !== 'WK') {
        console.log('Switching to WK tab which has players');
        setActiveTab('WK');
        setFilteredPlayers(wkPlayers);
      } else if (batPlayers.length > 0 && activeTab !== 'BAT') {
        console.log('Switching to BAT tab which has players');
        setActiveTab('BAT');
        setFilteredPlayers(batPlayers);
      } else if (arPlayers.length > 0 && activeTab !== 'AR') {
        console.log('Switching to AR tab which has players');
        setActiveTab('AR');
        setFilteredPlayers(arPlayers);
      } else if (bowlPlayers.length > 0 && activeTab !== 'BOWL') {
        console.log('Switching to BOWL tab which has players');
        setActiveTab('BOWL');
        setFilteredPlayers(bowlPlayers);
      } else {
        // If no players in any role, show a message in UI that no players are available
        console.log('No players found for any role');
        setFilteredPlayers([]);
      }
    }
  }, [players, activeTab]);

  // Clean players data to fix roles and other issues
  const processPlayersData = (playersData: any[]): Player[] => {
    if (!playersData || !Array.isArray(playersData)) {
      console.error('Invalid players data:', playersData);
      return [];
    }

    const processedPlayers = playersData.map((p: any) => {
      // Make sure we standardize the role
      const standardizedRole = standardizeRole(p.role);

      console.log(
        `Processing player ${p.name}, original role: ${p.role}, standardized: ${standardizedRole}`
      );

      return {
        id: p.id || '',
        name: p.name || '',
        image: p.image || '/images/player-placeholder.png',
        teamId: p.teamId || '',
        role: standardizedRole,
        credits: typeof p.credits === 'number' ? p.credits : 9.0,
        points: typeof p.points === 'number' ? p.points : 0,
        selected: Boolean(p.selected),
        isCaptain: Boolean(p.isCaptain),
        isViceCaptain: Boolean(p.isViceCaptain),
      };
    });

    // Ensure we have a balanced distribution of roles
    const roles = Array.from(new Set(processedPlayers.map((p) => p.role)));
    console.log('Roles after processing:', roles);

    // Check balance of roles
    const roleCounts = {
      WK: processedPlayers.filter((p) => p.role === 'WK').length,
      BAT: processedPlayers.filter((p) => p.role === 'BAT').length,
      AR: processedPlayers.filter((p) => p.role === 'AR').length,
      BOWL: processedPlayers.filter((p) => p.role === 'BOWL').length,
    };
    console.log('Role balance:', roleCounts);

    return processedPlayers;
  };

  // Callback to update activeTab - ensure it's a valid role
  const handleTabChange = (tab: 'WK' | 'BAT' | 'AR' | 'BOWL') => {
    setActiveTab(tab);
  };

  // Call the fetchMatchData function when the component mounts
  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  // Add another useEffect to debug when filteredPlayers changes
  useEffect(() => {
    console.log('Filtered players updated:', filteredPlayers.length);
    console.log('Current tab:', activeTab);
    if (filteredPlayers.length === 0 && players.length > 0) {
      console.log('Warning: No players for current tab but players exist');
      // Use Array.from to fix the linter error
      const availableRoles = Array.from(new Set(players.map((p) => p.role)));
      console.log('Player roles available:', availableRoles);
    }
  }, [filteredPlayers]);

  // Add debugging effect to track captain/vice-captain selections
  useEffect(() => {
    console.log('Current selection status:', {
      totalPlayers: selectedPlayers.length,
      captain: selectedPlayers.find((p) => p.isCaptain)?.name || 'None',
      viceCaptain: selectedPlayers.find((p) => p.isViceCaptain)?.name || 'None',
      teamName: teamName.trim() ? 'Provided' : 'Empty',
    });

    // Check if the team is valid and log the reason if it's not
    const valid = isTeamValid();
    console.log('Team valid:', valid);
  }, [selectedPlayers, teamName]);

  // Add this section to your UI where appropriate
  const renderLineupInfoSection = () => {
    if (!lineupAvailable) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Official Team Lineups</h3>
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                // Add refresh=true to force a refresh from the API
                const lineupResponse = await fetch(
                  `/api/matches/${matchId}/lineup?refresh=true`
                );
                if (lineupResponse.ok) {
                  const lineupData = await lineupResponse.json();
                  if (lineupData.success && lineupData.tossComplete) {
                    setLineupAvailable(true);
                    setOfficialLineups({
                      teamA: lineupData.teamA || [],
                      teamB: lineupData.teamB || [],
                      teamASubstitutes: lineupData.teamASubstitutes || [],
                      teamBSubstitutes: lineupData.teamBSubstitutes || [],
                    });
                  }
                }
              }}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              Refresh Lineup
            </button>
            <button
              onClick={() => setShowLineupInfo(!showLineupInfo)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showLineupInfo ? 'Hide Lineups' : 'Show Lineups'}
            </button>
          </div>
        </div>

        {showLineupInfo && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {match.teamAName} Playing XI
                </h4>
                {officialLineups.teamA.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {officialLineups.teamA.map((player, index) => (
                      <li key={`team-a-${index}`} className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full mr-2 text-xs">
                          {index + 1}
                        </span>
                        {player.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No lineup available yet
                  </p>
                )}

                {officialLineups.teamASubstitutes &&
                  officialLineups.teamASubstitutes.length > 0 && (
                    <>
                      <h4 className="font-medium text-gray-900 mb-2 mt-4">
                        {match.teamAName} Substitutes
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {officialLineups.teamASubstitutes.map(
                          (player, index) => (
                            <li
                              key={`team-a-sub-${index}`}
                              className="flex items-center"
                            >
                              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full mr-2 text-xs">
                                S{index + 1}
                              </span>
                              {player.name}
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {match.teamBName} Playing XI
                </h4>
                {officialLineups.teamB.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {officialLineups.teamB.map((player, index) => (
                      <li key={`team-b-${index}`} className="flex items-center">
                        <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full mr-2 text-xs">
                          {index + 1}
                        </span>
                        {player.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No lineup available yet
                  </p>
                )}

                {officialLineups.teamBSubstitutes &&
                  officialLineups.teamBSubstitutes.length > 0 && (
                    <>
                      <h4 className="font-medium text-gray-900 mb-2 mt-4">
                        {match.teamBName} Substitutes
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {officialLineups.teamBSubstitutes.map(
                          (player, index) => (
                            <li
                              key={`team-b-sub-${index}`}
                              className="flex items-center"
                            >
                              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full mr-2 text-xs">
                                S{index + 1}
                              </span>
                              {player.name}
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-xl">Match not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create Your Team</h1>
          <div className="text-sm text-gray-600">
            {match.teamAName} vs {match.teamBName}
          </div>
        </div>

        {/* Team Stats */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between mb-4">
            <div>
              <span className="text-sm text-gray-600">Players</span>
              <div className="font-medium">{teamStats.totalPlayers}/11</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Credits Left</span>
              <div className="font-medium">
                {(CONSTRAINTS.CREDITS - teamStats.totalCredits).toFixed(1)}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">{match.teamAName}</span>
              <div className="font-medium">{teamStats.teamACounts}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">{match.teamBName}</span>
              <div className="font-medium">{teamStats.teamBCounts}</div>
            </div>
          </div>

          {/* Position counters */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div
              className={`p-2 rounded ${
                teamStats.roleCounts.WK < CONSTRAINTS.MIN_WK
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              <div className="text-xs">WK</div>
              <div className="font-medium">
                {teamStats.roleCounts.WK}/{CONSTRAINTS.MAX_WK}
              </div>
            </div>
            <div
              className={`p-2 rounded ${
                teamStats.roleCounts.BAT < CONSTRAINTS.MIN_BAT
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              <div className="text-xs">BAT</div>
              <div className="font-medium">
                {teamStats.roleCounts.BAT}/{CONSTRAINTS.MAX_BAT}
              </div>
            </div>
            <div
              className={`p-2 rounded ${
                teamStats.roleCounts.AR < CONSTRAINTS.MIN_AR
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              <div className="text-xs">AR</div>
              <div className="font-medium">
                {teamStats.roleCounts.AR}/{CONSTRAINTS.MAX_AR}
              </div>
            </div>
            <div
              className={`p-2 rounded ${
                teamStats.roleCounts.BOWL < CONSTRAINTS.MIN_BOWL
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
              }`}
            >
              <div className="text-xs">BOWL</div>
              <div className="font-medium">
                {teamStats.roleCounts.BOWL}/{CONSTRAINTS.MAX_BOWL}
              </div>
            </div>
          </div>
        </div>

        {/* Lineup Info Section */}
        {renderLineupInfoSection()}

        {showCaptainSelection ? (
          /* Captain Selection View */
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center mb-4">
              <button
                onClick={backToPlayerSelection}
                className="mr-2 p-2 rounded-full hover:bg-gray-100"
              >
                <FaArrowLeft />
              </button>
              <h2 className="text-lg font-semibold">
                Select Captain & Vice Captain
              </h2>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Captain gets 2x points, Vice Captain gets 1.5x points
              </p>

              <div className="mb-4">
                <label
                  htmlFor="teamName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Team Name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                      <span className="font-medium">{player.name}</span>
                      <div className="text-xs text-gray-500">
                        {ROLES[player.role as keyof typeof ROLES]}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      {player.credits} Cr
                    </div>
                  </div>

                  <div className="p-3 flex space-x-2">
                    <button
                      onClick={() => handleSetCaptain(player.id)}
                      className={`flex-1 py-1 px-2 rounded text-sm font-medium ${
                        player.id === captainId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Captain (2x)
                    </button>
                    <button
                      onClick={() => handleSetViceCaptain(player.id)}
                      className={`flex-1 py-1 px-2 rounded text-sm font-medium ${
                        player.id === viceCaptainId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Vice (1.5x)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmitTeam}
                disabled={!isTeamValid() || isSaving}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Creating Team...' : 'Create Team'}
              </button>
            </div>
          </div>
        ) : (
          /* Player Selection View */
          <>
            {/* Role Tabs */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex border-b mb-4">
                {Object.entries(ROLES).map(([role, label]) => (
                  <button
                    key={role}
                    className={`flex-1 py-3 px-2 text-center font-medium ${
                      activeTab === role
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500'
                    }`}
                    onClick={() =>
                      handleTabChange(role as 'WK' | 'BAT' | 'AR' | 'BOWL')
                    }
                  >
                    {label} (
                    {
                      teamStats.roleCounts[
                        role as keyof typeof teamStats.roleCounts
                      ]
                    }
                    /
                    {role === 'WK'
                      ? CONSTRAINTS.MAX_WK
                      : role === 'BAT'
                      ? CONSTRAINTS.MAX_BAT
                      : role === 'AR'
                      ? CONSTRAINTS.MAX_AR
                      : CONSTRAINTS.MAX_BOWL}
                    )
                  </button>
                ))}
              </div>

              {/* Team Filters */}
              <div className="flex mb-4 justify-center">
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 mr-1"></div>
                    <span className="text-sm">{match.teamAName}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-red-100 mr-1"></div>
                    <span className="text-sm">{match.teamBName}</span>
                  </div>
                </div>
              </div>

              {/* Player List */}
              <div className="max-h-[430px] overflow-y-auto pb-2">
                {filteredPlayers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <div>No {ROLES[activeTab]} players available</div>
                    <div className="mt-2 text-sm text-gray-400">
                      This might be due to missing role types or a loading issue
                    </div>
                    <div className="flex justify-center mt-4 space-x-2">
                      <button
                        onClick={fetchMatchData}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                      >
                        Refresh Players
                      </button>

                      {/* Force reload with dummy players button */}
                      <button
                        onClick={() => {
                          if (match?.teamAId && match?.teamBId) {
                            const dummies = createDummyPlayers(
                              match.teamAId,
                              match.teamBId,
                              match.teamAName,
                              match.teamBName
                            );

                            // Replace all players with dummies to force a consistent set of roles
                            setPlayers(dummies);

                            // Set the active tab to 'WK' and filter for WK players
                            setActiveTab('WK');
                            setFilteredPlayers(
                              dummies.filter((p) => p.role === 'WK')
                            );

                            toast.success('Loaded backup player data');
                          } else {
                            toast.error(
                              'Unable to load backup data - match information missing'
                            );
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm"
                      >
                        Use Backup Data
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Team A Players */}
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-indigo-100 mr-1"></div>
                        {match.teamAName} Players (
                        {
                          filteredPlayers.filter(
                            (p) => p.teamId === match.teamAId
                          ).length
                        }
                        )
                      </div>

                      {filteredPlayers
                        .filter((p) => p.teamId === match.teamAId)
                        .map((player) => (
                          <div
                            key={player.id}
                            className={`border rounded-lg overflow-hidden mb-3 ${
                              player.selected
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="p-3 flex justify-between items-center">
                              <div className="flex items-center flex-1">
                                <div className="mr-3">
                                  {player.image ? (
                                    <Image
                                      src={player.image}
                                      alt={player.name}
                                      width={40}
                                      height={40}
                                      className="rounded-full bg-gray-200"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src =
                                          '/images/player-placeholder.png';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                      {player.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium flex items-center">
                                    {player.name}
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100">
                                      {match.teamAName}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Role:{' '}
                                    {ROLES[player.role as keyof typeof ROLES]} |{' '}
                                    {player.points || 0} pts
                                  </div>
                                </div>
                                <div className="text-right mr-3">
                                  <div className="font-semibold">
                                    {player.credits} Cr
                                  </div>
                                  <div className="text-xs text-indigo-600">
                                    {player.selected ? 'Selected' : ''}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => togglePlayerSelection(player.id)}
                                disabled={
                                  !player.selected && !canSelectPlayer(player)
                                }
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  player.selected
                                    ? 'bg-red-500 text-white'
                                    : canSelectPlayer(player)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                {player.selected ? '-' : '+'}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Team B Players */}
                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-100 mr-1"></div>
                        {match.teamBName} Players (
                        {
                          filteredPlayers.filter(
                            (p) => p.teamId === match.teamBId
                          ).length
                        }
                        )
                      </div>

                      {filteredPlayers
                        .filter((p) => p.teamId === match.teamBId)
                        .map((player) => (
                          <div
                            key={player.id}
                            className={`border rounded-lg overflow-hidden mb-3 ${
                              player.selected
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="p-3 flex justify-between items-center">
                              <div className="flex items-center flex-1">
                                <div className="mr-3">
                                  {player.image ? (
                                    <Image
                                      src={player.image}
                                      alt={player.name}
                                      width={40}
                                      height={40}
                                      className="rounded-full bg-gray-200"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src =
                                          '/images/player-placeholder.png';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                      {player.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium flex items-center">
                                    {player.name}
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100">
                                      {match.teamBName}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Role:{' '}
                                    {ROLES[player.role as keyof typeof ROLES]} |{' '}
                                    {player.points || 0} pts
                                  </div>
                                </div>
                                <div className="text-right mr-3">
                                  <div className="font-semibold">
                                    {player.credits} Cr
                                  </div>
                                  <div className="text-xs text-indigo-600">
                                    {player.selected ? 'Selected' : ''}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => togglePlayerSelection(player.id)}
                                disabled={
                                  !player.selected && !canSelectPlayer(player)
                                }
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  player.selected
                                    ? 'bg-red-500 text-white'
                                    : canSelectPlayer(player)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                {player.selected ? '-' : '+'}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={proceedToCaptainSelection}
              disabled={teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {`Continue (${teamStats.totalPlayers}/${CONSTRAINTS.TOTAL_PLAYERS})`}
            </button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
