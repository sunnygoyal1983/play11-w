'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';

interface Match {
  id: string;
  name: string;
  format: string | null;
  venue: string | null;
  startTime: string;
  status: string;
  teamAName: string;
  teamALogo: string | null;
  teamBName: string;
  teamBLogo: string | null;
  result: string | null;
}

interface PlayerStatistic {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  playerImage?: string;
  teamName: string;
  points: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number | null;
  wickets: number;
  overs: number;
  maidens: number;
  economy: number | null;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

interface UserTeam {
  id: string;
  name: string;
  captainId: string;
  viceCaptainId: string;
  points: number;
  rank: number | null;
  prize: number | null;
  players: {
    id: string;
    name: string;
    image?: string;
    role?: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    points: number;
  }[];
}

export default function MatchResultsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [activeTab, setActiveTab] = useState<'scorecard' | 'myTeams'>(
    'scorecard'
  );
  const [match, setMatch] = useState<Match | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStatistic[]>([]);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId) {
        setError('Invalid match ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch match details
        const matchResponse = await fetch(`/api/matches/${matchId}`);

        if (!matchResponse.ok) {
          if (matchResponse.status === 404) {
            throw new Error(
              "Match not found. It may have been removed or doesn't exist."
            );
          }
          throw new Error(
            `Failed to fetch match details: HTTP ${matchResponse.status}`
          );
        }

        const matchData = await matchResponse.json();

        if (matchData.success && matchData.data) {
          setMatch(matchData.data);

          // Only proceed if match is completed
          if (matchData.data.status !== 'completed') {
            setError('Match results are only available for completed matches.');
            setLoading(false);
            return;
          }

          // Fetch player statistics
          const statsResponse = await fetch(
            `/api/matches/${matchId}/stats`
          ).catch(() => null);

          if (statsResponse && statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success && statsData.data) {
              setPlayerStats(statsData.data);
            }
          }

          // Fetch user teams if logged in
          if (session?.user) {
            const teamsResponse = await fetch(
              `/api/user/matches/${matchId}/teams`
            ).catch(() => null);

            if (teamsResponse && teamsResponse.ok) {
              const teamsData = await teamsResponse.json();
              if (teamsData.success && teamsData.data) {
                setUserTeams(teamsData.data);
              }
            }
          }
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error fetching match results:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch match results'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId, session]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date not available';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Get default image when player image is not available
  const getDefaultPlayerImage = (name: string) => {
    if (!name)
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">NA</text></svg>`;

    // Generate initials from name
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  };

  // Get default image when team logo is not available
  const getDefaultTeamLogo = (teamName: string) => {
    if (!teamName)
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">NA</text></svg>`;

    // Generate initials from team name
    const initials = teamName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
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
                <div className="mt-2">
                  <button
                    className="text-red-700 underline mr-4"
                    onClick={() => router.back()}
                  >
                    Go Back
                  </button>
                  <Link href="/matches" className="text-indigo-600 underline">
                    View All Matches
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Match not found
  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Match not found"
            description="The match you're looking for doesn't exist or has been removed."
            actionLabel="Browse Matches"
            actionUrl="/matches"
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button and match name */}
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
          <h1 className="text-2xl md:text-3xl font-bold">{match.name}</h1>
        </div>

        {/* Match info card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Match status banner */}
          <div className="bg-blue-600 text-white py-2 px-4 text-center font-medium">
            Match Completed
          </div>

          {/* Match details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold mb-2">Match Details</h2>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Format:</span>{' '}
                    {match.format || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Venue:</span>{' '}
                    {match.venue || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Date:</span>{' '}
                    {formatDate(match.startTime)}
                  </p>
                  {match.result && (
                    <p className="text-gray-700">
                      <span className="font-medium">Result:</span>{' '}
                      {match.result}
                    </p>
                  )}
                </div>
              </div>

              {/* Teams view */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                      <Image
                        src={
                          match.teamALogo || getDefaultTeamLogo(match.teamAName)
                        }
                        alt={match.teamAName}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 font-medium text-center">
                      {match.teamAName}
                    </p>
                  </div>

                  <div className="text-lg font-bold mx-4">VS</div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                      <Image
                        src={
                          match.teamBLogo || getDefaultTeamLogo(match.teamBName)
                        }
                        alt={match.teamBName}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 font-medium text-center">
                      {match.teamBName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`py-4 px-1 ${
                activeTab === 'scorecard'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Player Scorecard
            </button>
            {session?.user && (
              <button
                onClick={() => setActiveTab('myTeams')}
                className={`py-4 px-1 ${
                  activeTab === 'myTeams'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Teams
              </button>
            )}
          </nav>
        </div>

        {/* Player Scorecard */}
        {activeTab === 'scorecard' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Player Performance</h2>

            {playerStats.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No player statistics available
                </h3>
                <p className="text-gray-500">
                  Player statistics for this match have not been recorded yet.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Player
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Team
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Runs
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Balls
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          4s/6s
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          SR
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Wickets
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Overs
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Economy
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {playerStats.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 relative">
                                <Image
                                  src={
                                    player.playerImage ||
                                    getDefaultPlayerImage(player.playerName)
                                  }
                                  alt={player.playerName}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {player.playerName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.teamName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.runs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.balls}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.fours}/{player.sixes}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.strikeRate?.toFixed(2) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.wickets}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.overs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.economy?.toFixed(1) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                            {player.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Teams */}
        {activeTab === 'myTeams' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Your Fantasy Teams</h2>

            {!session?.user ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Sign in to view your teams
                </h3>
                <Link
                  href="/api/auth/signin"
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium mt-4"
                >
                  Sign In
                </Link>
              </div>
            ) : userTeams.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No teams created
                </h3>
                <p className="text-gray-500 mb-4">
                  You did not create any fantasy teams for this match.
                </p>
                <Link
                  href="/matches"
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Browse Matches
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {userTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
                      <h3 className="font-semibold">{team.name}</h3>
                      <div className="text-white">
                        <span className="text-sm mr-2">Points:</span>
                        <span className="font-bold text-xl">
                          {team.points || 0}
                        </span>
                      </div>
                    </div>

                    {team.rank && (
                      <div className="bg-green-50 px-6 py-2 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-green-800 font-medium">
                              Rank: #{team.rank}
                            </span>
                          </div>
                          {team.prize && team.prize > 0 && (
                            <div>
                              <span className="text-green-800 font-medium">
                                Prize: ₹{team.prize.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {team.players.map((player) => {
                          const isCaptain = player.isCaptain;
                          const isViceCaptain = player.isViceCaptain;

                          return (
                            <div
                              key={player.id}
                              className="bg-gray-50 rounded-lg p-3 text-center relative"
                            >
                              {(isCaptain || isViceCaptain) && (
                                <div
                                  className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold ${
                                    isCaptain ? 'bg-red-600' : 'bg-blue-600'
                                  }`}
                                >
                                  {isCaptain ? 'C' : 'VC'}
                                </div>
                              )}
                              <div className="relative mx-auto w-12 h-12 mb-2">
                                <Image
                                  src={
                                    player.image ||
                                    getDefaultPlayerImage(player.name)
                                  }
                                  alt={player.name}
                                  width={48}
                                  height={48}
                                  className="rounded-full"
                                />
                              </div>
                              <p className="text-sm font-medium truncate">
                                {player.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {player.role || 'Player'}
                              </p>
                              <p className="mt-1 font-medium text-indigo-600">
                                {isCaptain
                                  ? (player.points * 2).toFixed(1)
                                  : isViceCaptain
                                  ? (player.points * 1.5).toFixed(1)
                                  : player.points.toFixed(1)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
