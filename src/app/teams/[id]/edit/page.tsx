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
