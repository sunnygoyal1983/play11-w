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

export default function CreateTeam() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const matchId = params?.id as string;

  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('WK');
  const [selectedPlayers, setSelectedPlayers] = useState<any[]>([]);
  const [teamName, setTeamName] = useState('');
  const [showCaptainSelection, setShowCaptainSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(
        '/auth/signin?callbackUrl=' +
          encodeURIComponent(`/matches/${matchId}/create-team`)
      );
    }
  }, [status, router, matchId]);

  // Fetch match and players data
  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId) return;

      try {
        setLoading(true);

        // Fetch match details
        const matchResponse = await fetch(`/api/matches/${matchId}`);
        if (!matchResponse.ok) {
          throw new Error('Failed to load match');
        }
        const matchData = await matchResponse.json();
        setMatch(matchData);

        // Fetch players for the match
        const playersResponse = await fetch(`/api/players?matchId=${matchId}`);
        if (!playersResponse.ok) {
          throw new Error('Failed to load players');
        }
        const playersData = await playersResponse.json();

        // Transform player data and add selected state
        const transformedPlayers = playersData.map((player: any) => ({
          ...player,
          selected: false,
          isCaptain: false,
          isViceCaptain: false,
          team: player.teamId, // Ensure team property for filtering
        }));

        setPlayers(transformedPlayers);
      } catch (error) {
        console.error('Error loading match data:', error);
        toast.error('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId]);

  // Calculate team statistics
  const teamStats = {
    totalPlayers: selectedPlayers.length,
    totalCredits: selectedPlayers.reduce(
      (sum, player) => sum + player.credits,
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

  // Group players by role
  const playersByRole = {
    WK: players.filter((player) => player.role === 'WK'),
    BAT: players.filter((player) => player.role === 'BAT'),
    AR: players.filter((player) => player.role === 'AR'),
    BOWL: players.filter((player) => player.role === 'BOWL'),
  };

  // Check if player can be selected based on team constraints
  const canSelectPlayer = (player: any) => {
    if (teamStats.totalPlayers >= CONSTRAINTS.TOTAL_PLAYERS) {
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
    if (playerIndex === -1) return;

    const player = players[playerIndex];

    if (player.selected) {
      // Deselect player
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
        const updatedPlayers = players.map((p) =>
          p.id === playerId ? { ...p, selected: true } : p
        );
        setPlayers(updatedPlayers);
        setSelectedPlayers([...selectedPlayers, { ...player, selected: true }]);
      } else {
        // Show error message
        toast.error('Cannot select this player due to team constraints');
      }
    }
  };

  // Set captain and vice-captain
  const setCaptain = (playerId: string) => {
    const updatedPlayers = players.map((p) =>
      p.id === playerId
        ? { ...p, isCaptain: true, isViceCaptain: false }
        : { ...p, isCaptain: false }
    );
    setPlayers(updatedPlayers);
    setSelectedPlayers(
      selectedPlayers.map((p) =>
        p.id === playerId
          ? { ...p, isCaptain: true, isViceCaptain: false }
          : { ...p, isCaptain: false }
      )
    );
  };

  const setViceCaptain = (playerId: string) => {
    const updatedPlayers = players.map((p) =>
      p.id === playerId
        ? { ...p, isViceCaptain: true, isCaptain: false }
        : { ...p, isViceCaptain: false }
    );
    setPlayers(updatedPlayers);
    setSelectedPlayers(
      selectedPlayers.map((p) =>
        p.id === playerId
          ? { ...p, isViceCaptain: true, isCaptain: false }
          : { ...p, isViceCaptain: false }
      )
    );
  };

  // Check if team is valid for submission
  const isTeamValid = () => {
    if (teamStats.totalPlayers !== CONSTRAINTS.TOTAL_PLAYERS) return false;
    if (teamStats.roleCounts.WK < CONSTRAINTS.MIN_WK) return false;
    if (teamStats.roleCounts.BAT < CONSTRAINTS.MIN_BAT) return false;
    if (teamStats.roleCounts.AR < CONSTRAINTS.MIN_AR) return false;
    if (teamStats.roleCounts.BOWL < CONSTRAINTS.MIN_BOWL) return false;
    if (teamStats.teamACounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) return false;
    if (teamStats.teamBCounts < CONSTRAINTS.MIN_PLAYERS_PER_TEAM) return false;

    // Check if captain and vice-captain are selected
    if (showCaptainSelection) {
      const hasCaptain = selectedPlayers.some((p) => p.isCaptain);
      const hasViceCaptain = selectedPlayers.some((p) => p.isViceCaptain);
      if (!hasCaptain || !hasViceCaptain) return false;
      if (!teamName.trim()) return false;
    }

    return true;
  };

  // Handle team submission
  const handleSubmitTeam = async () => {
    if (!isTeamValid()) {
      toast.error('Please complete your team selection');
      return;
    }

    try {
      setIsSaving(true);

      // Find the selected captain and vice-captain
      const captain = selectedPlayers.find((p) => p.isCaptain);
      const viceCaptain = selectedPlayers.find((p) => p.isViceCaptain);

      if (!captain || !viceCaptain) {
        toast.error('Please select a captain and vice-captain');
        setIsSaving(false);
        return;
      }

      // Create team object
      const teamData = {
        name: teamName,
        matchId: matchId,
        captainId: captain.id,
        viceCaptainId: viceCaptain.id,
        players: selectedPlayers.map((player) => ({
          playerId: player.id,
          isCaptain: player.isCaptain,
          isViceCaptain: player.isViceCaptain,
        })),
      };

      // Submit to API
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create team');
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
                      onClick={() => setCaptain(player.id)}
                      className={`flex-1 py-1 px-2 rounded text-sm font-medium ${
                        player.isCaptain
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Captain (2x)
                    </button>
                    <button
                      onClick={() => setViceCaptain(player.id)}
                      className={`flex-1 py-1 px-2 rounded text-sm font-medium ${
                        player.isViceCaptain
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
                    onClick={() => setActiveTab(role)}
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
                {playersByRole[activeTab as keyof typeof playersByRole]
                  ?.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No {ROLES[activeTab as keyof typeof ROLES]} players
                    available
                  </div>
                ) : (
                  // Group players by team
                  <div>
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-indigo-100 mr-1"></div>
                        {match.teamAName} Players
                      </div>
                      {playersByRole[activeTab as keyof typeof playersByRole]
                        .filter((p) => p.teamId === match.teamAId)
                        .map(renderPlayerCard)}
                    </div>

                    <div className="mb-2">
                      <div className="text-sm font-medium text-gray-500 mb-2 px-2 flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-100 mr-1"></div>
                        {match.teamBName} Players
                      </div>
                      {playersByRole[activeTab as keyof typeof playersByRole]
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
