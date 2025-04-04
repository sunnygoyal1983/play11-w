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
  role: string | null;
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
        const response = await fetch(`/api/user/teams/${teamId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch team details');
        }

        const data = await response.json();
        if (data.success && data.data) {
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

  // Group players by role
  const playersByRole = team.players.reduce((acc, player) => {
    const role = player.role?.toUpperCase() || 'OTHER';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

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
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-500 text-sm">Total Points</p>
              <p className="font-medium text-2xl">{team.totalPoints}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-500 text-sm">Captain</p>
              <p className="font-medium">
                {team.players.find((p) => p.isCaptain)?.name || 'None'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-500 text-sm">Vice Captain</p>
              <p className="font-medium">
                {team.players.find((p) => p.isViceCaptain)?.name || 'None'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-500 text-sm">Contests Joined</p>
              <p className="font-medium">{team.contests.length}</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Players</h2>

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
                            {player.isCaptain && (
                              <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs px-1 rounded">
                                C
                              </span>
                            )}
                            {player.isViceCaptain && (
                              <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 rounded">
                                VC
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {player.team || 'Unknown Team'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {player.totalPoints} pts
                          </p>
                          <p className="text-xs text-gray-500">
                            {player.points} × {player.multiplier}
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
                    {/* Same player card as above */}
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
                        {player.isCaptain && (
                          <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs px-1 rounded">
                            C
                          </span>
                        )}
                        {player.isViceCaptain && (
                          <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 rounded">
                            VC
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {player.team || 'Unknown Team'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{player.totalPoints} pts</p>
                      <p className="text-xs text-gray-500">
                        {player.points} × {player.multiplier}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contest.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{contest.winAmount}
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
