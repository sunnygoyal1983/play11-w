'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';
import Image from 'next/image';

// Player types
interface Player {
  id: string;
  name: string;
  image: string | null;
  role: string | null;
  country: string | null;
  team: string | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  points: number;
}

interface TeamDetails {
  id: string;
  name: string;
  matchId: string;
  match: {
    id: string;
    name: string;
    teamA: string;
    teamB: string;
    startTime: string;
  };
  players: Player[];
  status: string;
  createdAt: string;
}

export default function EditTeamPage() {
  const params = useParams();
  const teamId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [captain, setCaptain] = useState<string | null>(null);
  const [viceCaptain, setViceCaptain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [showLineupInfo, setShowLineupInfo] = useState(false);
  const [lineupAvailable, setLineupAvailable] = useState(false);
  const [officialLineups, setOfficialLineups] = useState<{
    teamA: Array<{ id: string; name: string; role: string; image?: string }>;
    teamB: Array<{ id: string; name: string; role: string; image?: string }>;
  }>({ teamA: [], teamB: [] });

  // Fetch team details
  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/teams/${teamId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch team details');
        }

        const data = await response.json();
        if (data.success && data.data) {
          const teamData = data.data;
          setTeam(teamData);
          setTeamName(teamData.name);

          // Set selected players
          setSelectedPlayers(teamData.players);

          // Set captain and vice captain
          const captainPlayer = teamData.players.find(
            (p: Player) => p.isCaptain
          );
          const viceCaptainPlayer = teamData.players.find(
            (p: Player) => p.isViceCaptain
          );

          if (captainPlayer) setCaptain(captainPlayer.id);
          if (viceCaptainPlayer) setViceCaptain(viceCaptainPlayer.id);

          // Fetch lineup data for the match
          if (teamData.matchId) {
            try {
              const lineupResponse = await fetch(
                `/api/matches/${teamData.matchId}/lineup`
              );
              if (lineupResponse.ok) {
                const lineupData = await lineupResponse.json();
                if (lineupData.success && lineupData.tossComplete) {
                  setLineupAvailable(true);
                  setOfficialLineups({
                    teamA: lineupData.teamA || [],
                    teamB: lineupData.teamB || [],
                  });
                }
              }
            } catch (lineupError) {
              console.error('Error fetching lineup data:', lineupError);
              // Don't set an error - lineup is optional
            }
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching team details:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch team details'
        );
      } finally {
        setLoading(false);
      }
    };

    if (sessionStatus === 'authenticated' && teamId) {
      fetchTeamDetails();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [teamId, sessionStatus]);

  // Save team changes
  const handleSaveTeam = async () => {
    try {
      setSaving(true);

      if (!captain || !viceCaptain) {
        setError('Please select both captain and vice captain');
        setSaving(false);
        return;
      }

      if (captain === viceCaptain) {
        setError('Captain and vice captain cannot be the same player');
        setSaving(false);
        return;
      }

      if (!teamName.trim()) {
        setError('Please enter a team name');
        setSaving(false);
        return;
      }

      // Update player roles
      const updatedPlayers = selectedPlayers.map((player) => ({
        id: player.id,
        isCaptain: player.id === captain,
        isViceCaptain: player.id === viceCaptain,
      }));

      const payload = {
        name: teamName,
        players: updatedPlayers,
      };

      const response = await fetch(`/api/user/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update team');
      }

      // Redirect to team details page
      router.push(`/teams/${teamId}`);
    } catch (error) {
      console.error('Error saving team:', error);
      setError(error instanceof Error ? error.message : 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  // Group players by role for display
  const getPlayersByRole = () => {
    if (!team) return {};

    return selectedPlayers.reduce((acc, player) => {
      const role = player.role?.toUpperCase() || 'OTHER';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(player);
      return acc;
    }, {} as Record<string, Player[]>);
  };

  const playersByRole = getPlayersByRole();
  const roleOrder = ['WK', 'BAT', 'AR', 'BOWL'];
  const roleLabels: Record<string, string> = {
    WK: 'Wicket Keepers',
    BAT: 'Batsmen',
    AR: 'All Rounders',
    BOWL: 'Bowlers',
    OTHER: 'Other Players',
  };

  // Check if match has started
  const isMatchLocked = () => {
    if (!team) return false;
    const matchStartTime = new Date(team.match.startTime);
    const now = new Date();
    return now >= matchStartTime;
  };

  // Function to manually fetch lineup data
  const fetchLineupData = async () => {
    if (!team?.matchId) return;

    try {
      console.log(`Manually fetching lineup data for match ${team.matchId}`);
      // Add refresh=true to force a refresh from the API
      const lineupResponse = await fetch(
        `/api/matches/${team.matchId}/lineup?refresh=true`
      );

      if (lineupResponse.ok) {
        const lineupData = await lineupResponse.json();
        console.log('Lineup data response:', lineupData);

        if (lineupData.success && lineupData.tossComplete) {
          setLineupAvailable(true);
          setOfficialLineups({
            teamA: lineupData.teamA || [],
            teamB: lineupData.teamB || [],
          });
          console.log(
            'Updated lineup with refreshed data from the database/API'
          );
        } else {
          // Handle case where lineup is not available
          setLineupAvailable(false);
          // Still show the section, but with a message
          setShowLineupInfo(true);
        }
      } else {
        console.error(
          'Failed to fetch lineup data:',
          lineupResponse.statusText
        );
        setLineupAvailable(false);
      }
    } catch (error) {
      console.error('Error fetching lineup data:', error);
      setLineupAvailable(false);
    }
  };

  // Render lineup info section
  const renderLineupInfoSection = () => {
    // Always show the section, even if lineupAvailable is false
    if (!team) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Official Team Lineups</h3>
          <div className="flex space-x-2">
            <button
              onClick={fetchLineupData}
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
          <div className="bg-gray-50 rounded-lg p-4">
            {!lineupAvailable ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h4 className="text-lg font-medium">Lineup Not Available</h4>
                  <p className="text-sm mt-1">
                    Official team lineups will be available after the toss
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {team.match.teamA} Playing XI
                  </h4>
                  {officialLineups.teamA.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {officialLineups.teamA.map((player, index) => (
                        <li
                          key={`team-a-${index}`}
                          className="flex items-center"
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full mr-2 text-xs">
                            {index + 1}
                          </span>
                          {player.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No players available
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {team.match.teamB} Playing XI
                  </h4>
                  {officialLineups.teamB.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {officialLineups.teamB.map((player, index) => (
                        <li
                          key={`team-b-${index}`}
                          className="flex items-center"
                        >
                          <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-800 rounded-full mr-2 text-xs">
                            {index + 1}
                          </span>
                          {player.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No players available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
          >
            Go Back
          </button>
        </div>
      </MainLayout>
    );
  }

  // Not authenticated state
  if (sessionStatus === 'unauthenticated') {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Please sign in to edit your team"
            description="Sign in to manage your fantasy teams"
            imageUrl="/empty-teams.svg"
            actionLabel="Sign In"
            actionUrl="/auth/signin"
          />
        </div>
      </MainLayout>
    );
  }

  // Team not found
  if (!team) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Team not found"
            description="The team you're looking for doesn't exist or you don't have permission to edit it."
            actionLabel="Go to My Teams"
            actionUrl="/teams"
          />
        </div>
      </MainLayout>
    );
  }

  // Match locked/started
  if (isMatchLocked()) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="This team cannot be edited"
            description="You cannot edit a team after the match has started."
            actionLabel="View Team"
            actionUrl={`/teams/${teamId}`}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 md:mb-0 bg-gray-100 hover:bg-gray-200 p-2 rounded-full inline-flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="text-3xl font-bold">Edit Team</h1>
            <p className="text-gray-600">{team.match.name}</p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={() => router.push(`/teams/${teamId}`)}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTeam}
              disabled={saving}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center ${
                saving ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              )}
              Save Changes
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Details Form */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
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
              className="w-full md:w-1/2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter team name"
              maxLength={30}
            />
          </div>
        </div>

        {/* Lineup Info Section */}
        {renderLineupInfoSection()}

        {/* Captain & Vice Captain Selection */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Choose Captain & Vice Captain
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Captain (2x Points)</h3>
              <div className="space-y-2">
                {selectedPlayers.map((player) => (
                  <div
                    key={`c-${player.id}`}
                    className={`flex items-center p-3 rounded cursor-pointer ${
                      captain === player.id
                        ? 'bg-indigo-100 border border-indigo-300'
                        : 'bg-gray-50 border border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setCaptain(player.id)}
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3">
                      {player.image ? (
                        <Image
                          src={player.image}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              '/default-player.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-gray-500">
                        {player.role} • {player.team}
                      </p>
                    </div>
                    {captain === player.id && (
                      <span className="ml-auto bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                        C
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                Vice Captain (1.5x Points)
              </h3>
              <div className="space-y-2">
                {selectedPlayers.map((player) => (
                  <div
                    key={`vc-${player.id}`}
                    className={`flex items-center p-3 rounded cursor-pointer ${
                      viceCaptain === player.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-gray-50 border border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setViceCaptain(player.id)}
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3">
                      {player.image ? (
                        <Image
                          src={player.image}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              '/default-player.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <p className="text-xs text-gray-500">
                        {player.role} • {player.team}
                      </p>
                    </div>
                    {viceCaptain === player.id && (
                      <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        VC
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Your Team */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Team</h2>

          {roleOrder.map(
            (role) =>
              playersByRole[role] &&
              playersByRole[role].length > 0 && (
                <div key={role} className="mb-6">
                  <h3 className="text-lg font-medium mb-3 text-gray-700">
                    {roleLabels[role]} ({playersByRole[role].length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playersByRole[role].map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center bg-gray-50 p-3 rounded"
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3">
                          {player.image ? (
                            <Image
                              src={player.image}
                              alt={player.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  '/default-player.png';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              {player.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center">
                            <p className="font-medium">{player.name}</p>
                            {player.id === captain && (
                              <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs px-1 rounded">
                                C
                              </span>
                            )}
                            {player.id === viceCaptain && (
                              <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 rounded">
                                VC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {player.team || 'Unknown Team'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
          )}

          {/* Handle "OTHER" category if it exists */}
          {playersByRole['OTHER'] && playersByRole['OTHER'].length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-700">
                Other Players ({playersByRole['OTHER'].length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playersByRole['OTHER'].map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center bg-gray-50 p-3 rounded"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3">
                      {player.image ? (
                        <Image
                          src={player.image}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              '/default-player.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center">
                        <p className="font-medium">{player.name}</p>
                        {player.id === captain && (
                          <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs px-1 rounded">
                            C
                          </span>
                        )}
                        {player.id === viceCaptain && (
                          <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 rounded">
                            VC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {player.team || 'Unknown Team'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => router.push(`/teams/${teamId}`)}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTeam}
            disabled={saving}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center ${
              saving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            )}
            Save Changes
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
