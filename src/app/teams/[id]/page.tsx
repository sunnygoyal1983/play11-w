'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';

interface Player {
  id: string;
  name: string;
  image: string | null;
  role: string;
  country: string | null;
  team: string | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  points: number;
  multiplier: number;
  totalPoints: number;
}

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  rank: string;
  winAmount: number;
}

interface Match {
  id: string;
  name: string;
  teamA: string;
  teamALogo: string | null;
  teamB: string;
  teamBLogo: string | null;
  startTime: string;
  status: string;
}

interface TeamDetails {
  id: string;
  name: string;
  matchId: string;
  match: Match;
  players: Player[];
  totalPoints: number;
  status: string;
  contests: Contest[];
  createdAt: string;
}

export default function TeamDetailsPage() {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching team details for ID:', teamId);
        const response = await fetch(`/api/user/teams/${teamId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch team details');
        }

        const data = await response.json();
        console.log('Team API response:', data);

        if (data.success && data.data) {
          console.log('Team data structure:', {
            id: data.data.id,
            name: data.data.name,
            playersArray: Array.isArray(data.data.players),
            playersCount: data.data.players?.length || 0,
          });

          // Detailed player data logging
          if (data.data.players && data.data.players.length > 0) {
            console.log('First player sample:', data.data.players[0]);
          } else {
            console.log('No players found in API response');
          }

          setTeam(data.data);
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => router.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
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
            title="Please sign in to view team details"
            description="Sign in to view your team details and join contests"
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
            description="The team you're looking for doesn't exist or you don't have permission to view it."
            actionLabel="Go to My Teams"
            actionUrl="/teams"
          />
        </div>
      </MainLayout>
    );
  }

  // Make sure players array exists
  if (!team.players || !Array.isArray(team.players)) {
    console.error('Players array is missing or not an array:', team.players);
    team.players = [];
  }

  // Group players by role
  const playersByRole = team.players.reduce((acc, player) => {
    console.log('Processing player for grouping:', {
      id: player.id,
      name: player.name,
      role: player.role,
      roleType: typeof player.role,
    });

    // Make sure role is properly capitalized and defaulted
    const role =
      typeof player.role === 'string' ? player.role.toUpperCase() : 'OTHER';

    // Create the role category if it doesn't exist
    if (!acc[role]) {
      acc[role] = [];
    }

    // Add the player to that role
    acc[role].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  // Debug the grouped players
  console.log('Players grouped by role:', {
    totalPlayers: team.players.length,
    roleCount: Object.keys(playersByRole).length,
    roles: Object.keys(playersByRole),
    playersByRoleWK: playersByRole['WK'] ? playersByRole['WK'].length : 0,
    playersByRoleBAT: playersByRole['BAT'] ? playersByRole['BAT'].length : 0,
    playersByRoleAR: playersByRole['AR'] ? playersByRole['AR'].length : 0,
    playersByRoleBOWL: playersByRole['BOWL'] ? playersByRole['BOWL'].length : 0,
    otherPlayers: playersByRole['OTHER'] ? playersByRole['OTHER'].length : 0,
  });

  // Define role order and labels
  const roleOrder = ['WK', 'BAT', 'AR', 'BOWL'];
  const roleLabels: Record<string, string> = {
    WK: 'Wicket Keepers',
    BAT: 'Batsmen',
    AR: 'All Rounders',
    BOWL: 'Bowlers',
    OTHER: 'Other Players',
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
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
          <h1 className="text-3xl font-bold">{team.name}</h1>
        </div>

        {/* Match Info */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-xl font-semibold">{team.match.name}</h2>
              <p className="text-gray-600">
                {new Date(team.match.startTime).toLocaleDateString()} |{' '}
                {team.status.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {team.status === 'upcoming' && (
                <Link
                  href={`/teams/${team.id}/edit`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Edit Team
                </Link>
              )}
              {team.status === 'live' && (
                <Link
                  href={`/matches/${team.matchId}/live`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Live Score
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Team Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Total Points</p>
              <p className="font-medium text-2xl text-indigo-600">
                {typeof team.totalPoints === 'number'
                  ? parseFloat(team.totalPoints.toString()).toFixed(1)
                  : '0.0'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Captain</p>
              <div className="flex justify-center items-center">
                {team.players.find((p) => p.isCaptain)?.image ? (
                  <img
                    src={team.players.find((p) => p.isCaptain)?.image || ''}
                    alt="Captain"
                    className="w-6 h-6 rounded-full mr-2"
                  />
                ) : null}
                <p className="font-medium">
                  {team.players.find((p) => p.isCaptain)?.name || 'None'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Vice Captain</p>
              <div className="flex justify-center items-center">
                {team.players.find((p) => p.isViceCaptain)?.image ? (
                  <img
                    src={team.players.find((p) => p.isViceCaptain)?.image || ''}
                    alt="Vice Captain"
                    className="w-6 h-6 rounded-full mr-2"
                  />
                ) : null}
                <p className="font-medium">
                  {team.players.find((p) => p.isViceCaptain)?.name || 'None'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Contests Joined</p>
              <p className="font-medium text-xl">{team.contests.length}</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Players</h2>

          {team.players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No players found for this team.</p>
              <p className="text-sm">
                There might be an issue with the team data or the players
                haven&apos;t been loaded yet.
              </p>
              {team.status === 'upcoming' && (
                <Link
                  href={`/teams/${team.id}/edit`}
                  className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                >
                  Edit Team
                </Link>
              )}
            </div>
          ) : (
            <>
              {roleOrder.map(
                (role) =>
                  playersByRole[role] &&
                  playersByRole[role].length > 0 && (
                    <div key={role} className="mb-6">
                      <h3 className="text-lg font-medium mb-3 text-gray-700 flex items-center">
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 ${
                            role === 'WK'
                              ? 'bg-yellow-500'
                              : role === 'BAT'
                              ? 'bg-blue-500'
                              : role === 'AR'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        {roleLabels[role]} ({playersByRole[role].length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {playersByRole[role].map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center bg-gray-50 p-3 rounded hover:shadow-md transition-shadow"
                          >
                            <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3 relative">
                              {player.image ? (
                                <Image
                                  src={player.image}
                                  alt={player.name}
                                  width={48}
                                  height={48}
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
                              {player.isCaptain && (
                                <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                                  C
                                </span>
                              )}
                              {player.isViceCaptain && (
                                <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                                  VC
                                </span>
                              )}
                            </div>
                            <div className="flex-grow">
                              <div className="flex flex-col">
                                <p className="font-medium text-gray-900">
                                  {player.name}
                                </p>
                                <div className="flex items-center">
                                  <p className="text-xs text-gray-500 inline-flex items-center">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                        player.team === team.match.teamA
                                          ? 'bg-blue-500'
                                          : 'bg-yellow-500'
                                      }`}
                                    ></span>
                                    {player.team || 'Unknown Team'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg text-green-600">
                                {player.totalPoints.toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {player.points.toFixed(1)} × {player.multiplier}
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
                  <h3 className="text-lg font-medium mb-3 text-gray-700 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full mr-2 bg-gray-500"></span>
                    Other Players ({playersByRole['OTHER'].length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playersByRole['OTHER'].map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center bg-gray-50 p-3 rounded hover:shadow-md transition-shadow"
                      >
                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mr-3 relative">
                          {player.image ? (
                            <Image
                              src={player.image}
                              alt={player.name}
                              width={48}
                              height={48}
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
                          {player.isCaptain && (
                            <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                              C
                            </span>
                          )}
                          {player.isViceCaptain && (
                            <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                              VC
                            </span>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex flex-col">
                            <p className="font-medium text-gray-900">
                              {player.name}
                            </p>
                            <div className="flex items-center">
                              <p className="text-xs text-gray-500 inline-flex items-center">
                                <span
                                  className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                    player.team === team.match.teamA
                                      ? 'bg-blue-500'
                                      : 'bg-yellow-500'
                                  }`}
                                ></span>
                                {player.team || 'Unknown Team'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-green-600">
                            {player.totalPoints.toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {player.points.toFixed(1)} × {player.multiplier}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Contests */}
        {team.contests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Contests Joined</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Contest
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Entry Fee
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Prize Pool
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Rank
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Winnings
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {team.contests.map((contest) => (
                    <tr key={contest.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contest.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{contest.entryFee}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{contest.prizePool}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {contest.rank === 'TBD' ? (
                          <span className="text-gray-400">TBD</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {contest.rank}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {contest.winAmount > 0 ? `₹${contest.winAmount}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
