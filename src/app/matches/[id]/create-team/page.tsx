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
      setMatch(matchData);

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

      // 1. First try to get players directly from the match players API
      console.log('Fetching players for match...');
      let playersData: any[] = [];
      let players: any[] = [];

      // 1. First try the new dedicated match players API
      try {
        console.log('Trying dedicated match players API endpoint...');
        const matchPlayersResponse = await fetch(
          `/api/matches/${matchId}/players`
        );
        if (matchPlayersResponse.ok) {
          const matchPlayersData = await matchPlayersResponse.json();
          if (
            matchPlayersData.success &&
            matchPlayersData.data &&
            matchPlayersData.data.length > 0
          ) {
            console.log(
              'Successfully fetched players from dedicated API:',
              matchPlayersData.data.length
            );
            playersData = matchPlayersData.data;
            players = processPlayersData(playersData);
          }
        }
      } catch (err) {
        console.error('Error fetching from dedicated match players API:', err);
      }

      // 2. If the dedicated API didn't return players, try the generic players API
      if (players.length === 0) {
        try {
          console.log('Trying generic players API with matchId...');
          const playersResponse = await fetch(
            `/api/players?matchId=${matchId}`
          );
          if (playersResponse.ok) {
            const playersResponseData = await playersResponse.json();
            if (
              playersResponseData.success &&
              playersResponseData.data &&
              playersResponseData.data.length > 0
            ) {
              console.log(
                'Successfully fetched players from generic API:',
                playersResponseData.data.length
              );
              playersData = playersResponseData.data;
              players = processPlayersData(playersData);
            }
          }
        } catch (err) {
          console.error('Error fetching from generic players API:', err);
        }
      }

      // 3. As a last resort, use a fallback with dummy data
      if (players.length === 0) {
        console.log('No players found from APIs. Creating fallback data.');
        const teamA = match.teamAName || 'Team A';
        const teamB = match.teamBName || 'Team B';

        // Create dummy players with balanced roles
        const dummyPlayers = createDummyPlayers(
          match.teamAId,
          match.teamBId,
          teamA,
          teamB
        );
        players = processPlayersData(dummyPlayers);
      }

      console.log('Final players after all attempts:', players.length);
      console.log('Players by role:');
      console.log('WK:', players.filter((p: Player) => p.role === 'WK').length);
      console.log(
        'BAT:',
        players.filter((p: Player) => p.role === 'BAT').length
      );
      console.log('AR:', players.filter((p: Player) => p.role === 'AR').length);
      console.log(
        'BOWL:',
        players.filter((p: Player) => p.role === 'BOWL').length
      );

      setPlayers(players);
      setFilteredPlayers(players);
    } catch (err) {
      console.error('Error fetching match data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch match data'
      );
    } finally {
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
    if (!role) return 'BAT';

    const upperRole = role.toUpperCase();

    if (
      upperRole.includes('WICKET') ||
      upperRole.includes('KEEPER') ||
      upperRole === 'WK'
    ) {
      return 'WK';
    } else if (upperRole.includes('BAT') || upperRole.includes('BATTER')) {
      return 'BAT';
    } else if (
      upperRole.includes('ALL') ||
      upperRole.includes('ROUNDER') ||
      upperRole === 'AR'
    ) {
      return 'AR';
    } else if (upperRole.includes('BOWL') || upperRole.includes('BALLER')) {
      return 'BOWL';
    }

    // Default to batsman if unknown
    return 'BAT';
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

  // Clean players data to fix roles and other issues
  const processPlayersData = (playersData: any[]): Player[] => {
    if (!playersData || !Array.isArray(playersData)) {
      console.error('Invalid players data:', playersData);
      return [];
    }

    return playersData.map((p: any) => ({
      id: p.id || '',
      name: p.name || '',
      image: p.image || '/images/player-placeholder.png',
      teamId: p.teamId || '',
      role: standardizeRole(p.role),
      credits: typeof p.credits === 'number' ? p.credits : 9.0,
      points: typeof p.points === 'number' ? p.points : 0,
      selected: Boolean(p.selected),
      isCaptain: Boolean(p.isCaptain),
      isViceCaptain: Boolean(p.isViceCaptain),
    }));
  };

  // Callback to update activeTab - ensure it's a valid role
  const handleTabChange = (tab: 'WK' | 'BAT' | 'AR' | 'BOWL') => {
    setActiveTab(tab);
  };

  // Call the fetchMatchData function when the component mounts
  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  // Update filtered players when active tab changes
  useEffect(() => {
    const filtered = players.filter((player) => player.role === activeTab);
    setFilteredPlayers(filtered);
  }, [activeTab, players]);

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
                    No {ROLES[activeTab]} players available
                  </div>
                ) : (
                  // Group players by team
                  <div>
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-indigo-100 mr-1"></div>
                        {match.teamAName} Players
                      </div>
                      {filteredPlayers
                        .filter((p) => p.teamId === match.teamAId)
                        .map(renderPlayerCard)}
                    </div>

                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-100 mr-1"></div>
                        {match.teamBName} Players
                      </div>
                      {filteredPlayers
                        .filter((p) => p.teamId === match.teamBId)
                        .map(renderPlayerCard)}
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
