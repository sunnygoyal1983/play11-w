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
  matchId?: string;
  playerId?: string;
  name: string;
  playerImage?: string;
  image?: string;
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
  isSubstitute: boolean;
  role?: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof PlayerStatistic>('points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Function to handle table header clicks for sorting
  const handleSortClick = (field: keyof PlayerStatistic) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default direction based on field type
      setSortField(field);
      // Default to descending for most stats (higher is better)
      setSortDirection('desc');
    }
  };

  // Function to sort playerStats based on current sortField and sortDirection
  const getSortedPlayerStats = () => {
    return [...playerStats].sort((a, b) => {
      if (a[sortField] === b[sortField]) return 0;

      // Handle null values
      if (a[sortField] === null) return sortDirection === 'asc' ? -1 : 1;
      if (b[sortField] === null) return sortDirection === 'asc' ? 1 : -1;

      // Sort by field value and handle possible undefined with type assertion
      const aValue = a[sortField] as number | string;
      const bValue = b[sortField] as number | string;

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      } else {
        return sortDirection === 'asc' ? 1 : -1;
      }
    });
  };

  // Get sorted player stats
  const sortedPlayerStats = getSortedPlayerStats();

  // Sort indicator component
  const SortIndicator = ({ field }: { field: keyof PlayerStatistic }) => {
    if (sortField !== field) return null;

    return (
      <span className="ml-1 inline-block text-indigo-600">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Helper function to get header class based on sort field
  const getHeaderClass = (field: keyof PlayerStatistic) => {
    const baseClass =
      'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100';
    const position = ['name', 'teamName'].includes(field)
      ? 'text-left'
      : 'text-right';
    const active = sortField === field ? 'bg-gray-100 text-indigo-700' : '';

    return `${baseClass} ${position} ${active}`;
  };

  // Function to fetch player stats only
  const fetchPlayerStats = async (forceUpdate = false) => {
    try {
      setRefreshing(true);
      setStatusMessage(
        forceUpdate
          ? 'Requesting backend data update...'
          : 'Refreshing player data...'
      );

      let updated = false;

      // If forceUpdate is true, first trigger a backend update
      if (forceUpdate) {
        try {
          console.log('Triggering backend data update...');
          setStatusMessage('Updating player statistics from source...');
          const updateResponse = await fetch(
            `/api/matches/${matchId}/update-scores`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (updateResponse.ok) {
            console.log('Backend update triggered successfully');
            setStatusMessage(
              'Backend update successful, fetching latest data...'
            );
            updated = true;
          } else {
            console.warn(
              'Backend update request failed:',
              await updateResponse.text()
            );
            setStatusMessage(
              'Backend update failed, trying to fetch existing data...'
            );
          }
        } catch (error) {
          console.error('Error triggering backend update:', error);
          setStatusMessage(
            'Error updating data, trying to fetch existing data...'
          );
        }
      }

      // Now fetch the latest stats
      setStatusMessage('Retrieving player statistics...');
      const statsResponse = await fetch(
        `/api/matches/${matchId}/stats?_t=${new Date().getTime()}`
      );

      if (statsResponse && statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.data) {
          console.log(
            'Refreshed player stats data:',
            statsData.data.length,
            'players'
          );
          setStatusMessage(`Found ${statsData.data.length} player records`);

          // Add debug logging for the first few players
          if (statsData.data.length > 0) {
            console.log('Sample player data:');
            statsData.data.slice(0, 3).forEach((player: any, index: number) => {
              console.log(`Player ${index + 1}:`, {
                id: player.id,
                name: player.name,
                teamName: player.teamName,
                keys: Object.keys(player),
              });
            });
          }

          // Update state without causing a navigation
          setPlayerStats((prevStats) => {
            // Only update if we actually have new data
            if (statsData.data.length > 0) {
              setStatusMessage('Updating player data on screen...');
              return statsData.data;
            }
            setStatusMessage('No new data found');
            return prevStats;
          });

          // Update refresh indicators
          setLastRefreshed(new Date());
          setRefreshCount((prev) => prev + 1);
          updated = true;
        } else {
          setStatusMessage('Received response but no valid data');
        }
      } else {
        setStatusMessage('Failed to get response from server');
      }

      if (!updated) {
        console.log('No data was updated during refresh');
        setStatusMessage('No data was updated');
      } else {
        setStatusMessage('Data refresh complete');
        // Clear status message after a delay
        setTimeout(() => setStatusMessage(null), 2000);
      }
    } catch (error) {
      console.error('Error refreshing player stats:', error);
      setStatusMessage('Error refreshing data');
    } finally {
      setRefreshing(false);
    }
  };

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
              console.log('Player stats data sample:');
              if (statsData.data.length > 0) {
                const sample = statsData.data[0];
                console.log('First player data:', {
                  id: sample.id,
                  playerId: sample.playerId,
                  name: sample.name,
                  image: sample.image,
                  playerImage: sample.playerImage,
                  teamName: sample.teamName,
                  points: sample.points,
                });
              }
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
  const getDefaultPlayerImage = (name: string | undefined) => {
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Player Performance</h2>
                <div className="text-xs text-gray-500 mt-1 h-4">
                  {statusMessage ? (
                    <span className="text-indigo-600">{statusMessage}</span>
                  ) : lastRefreshed ? (
                    <span>
                      Last updated: {lastRefreshed.toLocaleTimeString()} ·
                      Version: {refreshCount}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchPlayerStats(false)}
                  disabled={refreshing}
                  className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 text-sm"
                  title="Refresh data from server"
                >
                  {refreshing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Working...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
                      </svg>
                      Refresh
                    </>
                  )}
                </button>

                <button
                  onClick={() => fetchPlayerStats(true)}
                  disabled={refreshing}
                  className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 text-sm"
                  title="Update player data from source and refresh"
                >
                  {refreshing ? (
                    'Working...'
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                      Get Latest Data
                    </>
                  )}
                </button>
              </div>
            </div>

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
                          onClick={() => handleSortClick('name')}
                          className={getHeaderClass('name') + ' w-1/4'}
                        >
                          Player
                          <SortIndicator field="name" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('teamName')}
                          className={getHeaderClass('teamName')}
                        >
                          Team
                          <SortIndicator field="teamName" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('runs')}
                          className={getHeaderClass('runs')}
                        >
                          Runs
                          <SortIndicator field="runs" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('balls')}
                          className={getHeaderClass('balls')}
                        >
                          Balls
                          <SortIndicator field="balls" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('fours')}
                          className={getHeaderClass('fours')}
                        >
                          4s
                          <SortIndicator field="fours" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('sixes')}
                          className={getHeaderClass('sixes')}
                        >
                          6s
                          <SortIndicator field="sixes" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('strikeRate')}
                          className={getHeaderClass('strikeRate')}
                        >
                          SR
                          <SortIndicator field="strikeRate" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('wickets')}
                          className={getHeaderClass('wickets')}
                        >
                          Wickets
                          <SortIndicator field="wickets" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('overs')}
                          className={getHeaderClass('overs')}
                        >
                          Overs
                          <SortIndicator field="overs" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('economy')}
                          className={getHeaderClass('economy')}
                        >
                          Economy
                          <SortIndicator field="economy" />
                        </th>
                        <th
                          scope="col"
                          onClick={() => handleSortClick('points')}
                          className={getHeaderClass('points')}
                        >
                          Points
                          <SortIndicator field="points" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedPlayerStats.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-12 w-12 relative">
                                <Image
                                  src={
                                    player.playerImage ||
                                    player.image ||
                                    getDefaultPlayerImage(player.name)
                                  }
                                  alt={player.name || 'Player'}
                                  width={48}
                                  height={48}
                                  className="rounded-full"
                                />
                              </div>
                              <div className="ml-4 group relative">
                                <div className="text-base font-semibold text-gray-900">
                                  {player.name ||
                                    (player.id && player.id.substring(0, 8)) ||
                                    'Player Data Missing'}
                                </div>
                                {player.isSubstitute && (
                                  <div className="text-xs text-gray-500 italic">
                                    (Substitute)
                                  </div>
                                )}
                                {!player.name && (
                                  <div className="text-xs text-red-500">
                                    ID: {player.id || 'Unknown'}
                                  </div>
                                )}
                                {player.role && (
                                  <div className="text-xs text-gray-500">
                                    {player.role}
                                  </div>
                                )}

                                {/* Debug tooltip */}
                                <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 left-0 mt-2 min-w-[200px] shadow-lg">
                                  <div className="font-bold border-b pb-1 mb-1">
                                    Player Debug Info:
                                  </div>
                                  <div>
                                    <span className="font-semibold">ID:</span>{' '}
                                    {player.id}
                                  </div>
                                  {player.playerId && (
                                    <div>
                                      <span className="font-semibold">
                                        Player ID:
                                      </span>{' '}
                                      {player.playerId}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold">Name:</span>{' '}
                                    {player.name || 'Missing'}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Team:</span>{' '}
                                    {player.teamName}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Role:</span>{' '}
                                    {player.role || 'Unknown'}
                                  </div>
                                  <div>
                                    <span className="font-semibold">
                                      Fields:
                                    </span>{' '}
                                    {Object.keys(player).join(', ')}
                                  </div>
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
                            {player.fours}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {player.sixes}
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
