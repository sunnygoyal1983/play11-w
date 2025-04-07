'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import {
  FaTrophy,
  FaUsers,
  FaClock,
  FaExclamationCircle,
  FaChevronRight,
  FaListOl,
  FaComments,
  FaChartBar,
  FaInfoCircle,
  FaSpinner,
  FaSync,
} from 'react-icons/fa';
import ContestDetails from '@/components/contests/ContestDetails';
import PrizeBreakupTable from '@/components/contests/PrizeBreakupTable';

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  filledSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  isGuaranteed: boolean;
  winnerCount: number;
  isActive: boolean;
  matchId: string;
  match?: {
    id: string;
    name: string;
    startTime: string;
    teamAName: string;
    teamBName: string;
    format?: string;
    status: string;
  };
}

interface ContestEntry {
  id: string;
  rank?: number;
  points: number;
  userId: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  fantasyTeam: {
    id: string;
    name: string;
  };
}

interface Commentary {
  id: string;
  over: string;
  description: string;
  timestamp: string;
  isWicket?: boolean;
  isBoundary?: boolean;
}

// Define interfaces for type safety
interface PlayerStat {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  playerImage?: string;
  teamName: string;
  role?: string;
  points: number;
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  strikeRate?: number;
  wickets?: number;
  overs?: number;
  maidens?: number;
  economy?: number;
  runsConceded?: number;
  catches?: number;
  stumpings?: number;
  runOuts?: number;
}

interface MatchStats {
  teamA: {
    score: string;
    overs: string;
    runRate: string | number;
    topBatsman?: string;
    topBowler?: string;
  };
  teamB: {
    score: string;
    overs: string;
    runRate: string | number;
    topBatsman?: string;
    topBowler?: string;
  };
  matchStatus: string;
  playerStats: PlayerStat[];
}

export default function ContestPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams?.get('matchId') || '';
  const [activeTab, setActiveTab] = useState('contest'); // contest, winnings, leaderboard, commentary, stats

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [prizeBreakup, setPrizeBreakup] = useState<any[]>([]);
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);

  const contestId = params.id;

  // Fetch contest details
  useEffect(() => {
    const fetchContest = async () => {
      try {
        setLoading(true);
        console.log(`[Contest Page] Fetching contest with ID: ${contestId}`);
        const response = await fetch(`/api/contests/${contestId}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`[Contest Page] Failed to fetch contest:`, {
            status: response.status,
            error: errorData,
          });
          throw new Error(errorData.error || 'Failed to fetch contest');
        }

        const data = await response.json();
        console.log(`[Contest Page] Successfully fetched contest:`, {
          id: data.id,
          name: data.name,
          matchId: data.matchId,
          filledSpots: data.filledSpots,
        });

        setContest(data);

        // Fetch prize breakup
        console.log(
          `[Contest Page] Fetching prize breakup for contest: ${contestId}`
        );
        const prizeResponse = await fetch(`/api/contests/${contestId}/prizes`);
        if (prizeResponse.ok) {
          const prizeData = await prizeResponse.json();
          console.log(
            `[Contest Page] Successfully fetched prize breakup with ${prizeData.length} prizes`
          );
          setPrizeBreakup(prizeData);
        } else {
          console.error(`[Contest Page] Failed to fetch prize breakup:`, {
            status: prizeResponse.status,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('[Contest Page] Error fetching contest:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load contest details'
        );
        setLoading(false);
      }
    };

    fetchContest();
  }, [contestId]);

  // Fetch leaderboard entries
  useEffect(() => {
    if (activeTab === 'leaderboard' && contest) {
      fetchLeaderboard();
    }
  }, [activeTab, contest]);

  // Fetch commentary when tab is active
  useEffect(() => {
    if (activeTab === 'commentary' && contest?.matchId) {
      fetchCommentary();
    }
  }, [activeTab, contest]);

  // Fetch match stats when tab is active
  useEffect(() => {
    if (activeTab === 'stats' && contest?.matchId) {
      fetchMatchStats();
    }
  }, [activeTab, contest]);

  const fetchLeaderboard = async () => {
    try {
      setRefreshingLeaderboard(true);
      const response = await fetch(`/api/contests/${contestId}/entries`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
      setRefreshingLeaderboard(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setRefreshingLeaderboard(false);
    }
  };

  const fetchCommentary = async () => {
    if (!contest?.matchId) return;

    try {
      const response = await fetch(
        `/api/matches/${contest.matchId}/commentary`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCommentary(
            data.data.map((item: any) => ({
              id: item.id,
              over: item.over,
              description: item.text,
              timestamp: item.timestamp,
              isWicket: item.isWicket,
              isBoundary: item.isBoundary,
            }))
          );
        }
      } else {
        console.error('Failed to fetch commentary');
      }
    } catch (err) {
      console.error('Error fetching commentary:', err);
    }
  };

  const fetchMatchStats = async () => {
    if (!contest?.matchId) return;

    try {
      const response = await fetch(`/api/matches/${contest.matchId}/stats`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const playerStats = result.data || [];
          const matchDetails = result.matchDetails || {};

          // Use team names from match details if available
          const teamAName =
            matchDetails.teams?.teamA?.name || contest.match?.teamAName || '';
          const teamBName =
            matchDetails.teams?.teamB?.name || contest.match?.teamBName || '';

          // If no player stats are available, show minimal data
          if (playerStats.length === 0) {
            setMatchStats({
              teamA: {
                score: 'N/A',
                overs: 'N/A',
                runRate: 'N/A',
                topBatsman: 'N/A',
                topBowler: 'N/A',
              },
              teamB: {
                score: 'N/A',
                overs: 'N/A',
                runRate: 'N/A',
                topBatsman: 'N/A',
                topBowler: 'N/A',
              },
              matchStatus:
                matchDetails.status === 'completed'
                  ? 'Match completed'
                  : matchDetails.status === 'live'
                  ? 'Match in progress'
                  : 'Match not started',
              playerStats: [], // Add player stats to the structure
            });
            return;
          }

          // Group players by team
          const teamAPlayers = playerStats.filter(
            (p: any) => p.teamName === teamAName
          );
          const teamBPlayers = playerStats.filter(
            (p: any) => p.teamName === teamBName
          );

          // Calculate totals for each team
          const teamAScore = teamAPlayers.reduce(
            (sum: number, p: any) => sum + (p.runs || 0),
            0
          );
          const teamBScore = teamBPlayers.reduce(
            (sum: number, p: any) => sum + (p.runs || 0),
            0
          );

          // Find top performers for Team A
          const teamABatsmen = [...teamAPlayers].sort(
            (a: any, b: any) => (b.runs || 0) - (a.runs || 0)
          );
          const teamABowlers = [...teamAPlayers].sort(
            (a: any, b: any) => (b.wickets || 0) - (a.wickets || 0)
          );
          const topBatsmanA = teamABatsmen.length > 0 ? teamABatsmen[0] : null;
          const topBowlerA = teamABowlers.length > 0 ? teamABowlers[0] : null;

          // Find top performers for Team B
          const teamBBatsmen = [...teamBPlayers].sort(
            (a: any, b: any) => (b.runs || 0) - (a.runs || 0)
          );
          const teamBBowlers = [...teamBPlayers].sort(
            (a: any, b: any) => (b.wickets || 0) - (a.wickets || 0)
          );
          const topBatsmanB = teamBBatsmen.length > 0 ? teamBBatsmen[0] : null;
          const topBowlerB = teamBBowlers.length > 0 ? teamBBowlers[0] : null;

          // Set the match stats
          setMatchStats({
            teamA: {
              score: `${teamAScore}/${
                teamAPlayers.filter((p: any) => (p.wickets || 0) > 0).length
              }`,
              overs: '20.0', // Default for T20
              runRate: (teamAScore / 20).toFixed(1),
              topBatsman: topBatsmanA
                ? `${topBatsmanA.playerName} (${topBatsmanA.runs || 0})`
                : 'N/A',
              topBowler: topBowlerA
                ? `${topBowlerA.playerName} (${topBowlerA.wickets || 0}/${
                    topBowlerA.runsConceded || 0
                  })`
                : 'N/A',
            },
            teamB: {
              score: `${teamBScore}/${
                teamBPlayers.filter((p: any) => (p.wickets || 0) > 0).length
              }`,
              overs: '20.0', // Default for T20
              runRate: (teamBScore / 20).toFixed(1),
              topBatsman: topBatsmanB
                ? `${topBatsmanB.playerName} (${topBatsmanB.runs || 0})`
                : 'N/A',
              topBowler: topBowlerB
                ? `${topBowlerB.playerName} (${topBowlerB.wickets || 0}/${
                    topBowlerB.runsConceded || 0
                  })`
                : 'N/A',
            },
            matchStatus:
              matchDetails.status === 'completed'
                ? `${
                    teamAScore > teamBScore ? teamAName : teamBName
                  } won the match`
                : matchDetails.status === 'live'
                ? 'Match in progress'
                : 'Match not started',
            playerStats: playerStats, // Add player stats to the structure
          });
        } else {
          // Fallback to mock data if API response doesn't have expected structure
          setDefaultMatchStats();
        }
      } else {
        // API call failed, set default mock data
        setDefaultMatchStats();
      }
    } catch (err) {
      console.error('Error fetching match stats:', err);
      // Fallback to mock data
      setDefaultMatchStats();
    }
  };

  // Function to set default mock stats data
  const setDefaultMatchStats = () => {
    setMatchStats({
      teamA: {
        score: '186/4',
        overs: '20.0',
        runRate: 9.3,
        topBatsman: 'Virat Kohli',
        topBowler: 'Jasprit Bumrah',
      },
      teamB: {
        score: '174/8',
        overs: '20.0',
        runRate: 8.7,
        topBatsman: 'Rohit Sharma',
        topBowler: 'Rashid Khan',
      },
      matchStatus: 'Team A won by 12 runs',
      playerStats: [], // Add empty player stats
    });
  };

  // Helper function to get the prize amount for a given rank
  function getPrizeForRank(
    rank: number,
    prizeBreakup: any[]
  ): number | undefined {
    if (!rank || !prizeBreakup || prizeBreakup.length === 0) return undefined;

    // First check for direct rank match
    const directMatch = prizeBreakup.find((p) => p.rank === rank);
    if (directMatch) return directMatch.amount || directMatch.prize;

    // Then check for range matches (e.g. "101-200")
    const rangeMatch = prizeBreakup.find((p) => {
      if (typeof p.rank === 'string' && p.rank.includes('-')) {
        const [start, end] = p.rank.split('-').map(Number);
        return rank >= start && rank <= end;
      }
      return false;
    });

    return rangeMatch ? rangeMatch.amount || rangeMatch.prize : undefined;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-3xl text-indigo-600" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !contest) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <p>{error || 'Failed to load contest. Please try again later.'}</p>
            <Link href="/matches" className="underline">
              Browse Matches
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href={`/matches/${matchId || contest.matchId}`}
            className="text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <span className="mr-1">←</span> Back to Match
          </Link>
        </div>

        {/* Contest Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold">{contest.name}</h1>
            <div className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
              {contest.match && (
                <>
                  <span>
                    {contest.match.teamAName} vs {contest.match.teamBName}
                  </span>
                  <span>•</span>
                </>
              )}
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  contest.match?.status === 'live'
                    ? 'bg-green-100 text-green-800'
                    : contest.match?.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {contest.match?.status || 'Upcoming'}
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="px-6 py-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-600 text-sm">Entry</p>
              <p className="font-semibold">₹{contest.entryFee}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Prize Pool</p>
              <p className="font-semibold">
                ₹{contest.totalPrize.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Spots</p>
              <p className="font-semibold">
                {contest.filledSpots}/{contest.totalSpots}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b">
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'contest'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('contest')}
            >
              <FaInfoCircle className="mr-2" />
              Contest Info
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'winnings'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('winnings')}
            >
              <FaTrophy className="mr-2" />
              Winnings
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'leaderboard'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <FaListOl className="mr-2" />
              Leaderboard
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'commentary'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('commentary')}
            >
              <FaComments className="mr-2" />
              Commentary
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'stats'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('stats')}
            >
              <FaChartBar className="mr-2" />
              Stats
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Contest Info Tab */}
            {activeTab === 'contest' && (
              <div>
                <ContestDetails contest={contest} />

                {contest.match?.status !== 'completed' && (
                  <div className="mt-6">
                    <Link
                      href={`/contests/${contestId}/join?matchId=${
                        matchId || contest.matchId
                      }`}
                      className="inline-block w-full py-3 px-6 rounded-lg bg-indigo-600 text-white font-medium text-center shadow-md hover:bg-indigo-700 transition duration-200"
                    >
                      Join Contest
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Winnings Tab */}
            {activeTab === 'winnings' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Prize Breakup</h2>
                <PrizeBreakupTable prizeBreakup={prizeBreakup} />
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Leaderboard</h2>
                  <button
                    onClick={fetchLeaderboard}
                    disabled={refreshingLeaderboard}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm"
                  >
                    {refreshingLeaderboard ? (
                      <FaSpinner className="animate-spin mr-1" />
                    ) : (
                      <FaSync className="mr-1" />
                    )}
                    Refresh
                  </button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No entries yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm">
                          <th className="py-2 px-4 text-left">Rank</th>
                          <th className="py-2 px-4 text-left">Team</th>
                          <th className="py-2 px-4 text-left">Player</th>
                          <th className="py-2 px-4 text-right">Points</th>
                          <th className="py-2 px-4 text-right">Prize</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => (
                          <tr key={entry.id} className="border-t">
                            <td className="py-3 px-4">
                              {entry.rank || index + 1}
                              {(entry.rank === 1 || index === 0) && (
                                <FaTrophy className="text-yellow-500 ml-1 inline" />
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={`/teams/${entry.fantasyTeam.id}`}
                                className="text-indigo-600 hover:underline"
                              >
                                {entry.fantasyTeam.name}
                              </Link>
                            </td>
                            <td className="py-3 px-4 flex items-center">
                              {entry.user.image && (
                                <div className="w-7 h-7 rounded-full overflow-hidden mr-2 bg-gray-200">
                                  <img
                                    src={entry.user.image}
                                    alt={entry.user.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <span>{entry.user.name}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {entry.points.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {entry.rank &&
                              contest.match?.status === 'completed'
                                ? `₹${
                                    getPrizeForRank(entry.rank, prizeBreakup) ||
                                    0
                                  }`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Commentary Tab */}
            {activeTab === 'commentary' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Live Commentary</h2>

                {commentary.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No commentary available yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commentary.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg ${
                          item.isWicket
                            ? 'bg-red-50 border-l-4 border-red-500'
                            : item.isBoundary
                            ? 'bg-green-50 border-l-4 border-green-500'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{item.over}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Match Statistics</h2>

                {!matchStats ? (
                  <div className="text-center py-10 text-gray-500">
                    No statistics available yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Team Summary */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Team A Stats */}
                      {matchStats.teamA && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">
                            {contest.match?.teamAName || 'Team A'}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Score:</span>
                              <span className="font-medium">
                                {matchStats.teamA.score || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Overs:</span>
                              <span>{matchStats.teamA.overs || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Run Rate:</span>
                              <span>{matchStats.teamA.runRate || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Team B Stats */}
                      {matchStats.teamB && (
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">
                            {contest.match?.teamBName || 'Team B'}
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Score:</span>
                              <span className="font-medium">
                                {matchStats.teamB.score || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Overs:</span>
                              <span>{matchStats.teamB.overs || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Run Rate:</span>
                              <span>{matchStats.teamB.runRate || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Match Result */}
                    {matchStats.matchStatus && (
                      <div className="bg-indigo-50 rounded-lg p-4 text-center mb-6">
                        <span className="font-medium">
                          {matchStats.matchStatus}
                        </span>
                      </div>
                    )}

                    {/* Player Stats Section */}
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-4">
                        Player Statistics
                      </h3>

                      {/* Batting Stats */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                          <span className="bg-green-100 p-1 rounded mr-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-green-700"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          Batting
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Player
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Team
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Runs
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Balls
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  4s
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  6s
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  SR
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Points
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {matchStats.playerStats &&
                                matchStats.playerStats
                                  .filter(
                                    (player: PlayerStat) =>
                                      (player.runs ?? 0) > 0
                                  )
                                  .sort(
                                    (a: PlayerStat, b: PlayerStat) =>
                                      (b.runs ?? 0) - (a.runs ?? 0)
                                  )
                                  .slice(0, 10)
                                  .map((player: PlayerStat, idx: number) => (
                                    <tr
                                      key={player.id}
                                      className={
                                        idx % 2 === 0
                                          ? 'bg-white'
                                          : 'bg-gray-50'
                                      }
                                    >
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {player.playerImage ? (
                                            <img
                                              src={player.playerImage}
                                              alt={player.playerName}
                                              className="w-6 h-6 rounded-full mr-2"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
                                          )}
                                          <span className="text-sm font-medium text-gray-900">
                                            {player.playerName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.teamName ===
                                        contest.match?.teamAName ? (
                                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">
                                        {player.runs}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.balls}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.fours}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.sixes}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.strikeRate?.toFixed(1) || '-'}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold text-green-600">
                                        {player.points.toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}

                              {(!matchStats.playerStats ||
                                matchStats.playerStats.filter(
                                  (player: PlayerStat) => player.runs > 0
                                ).length === 0) && (
                                <tr>
                                  <td
                                    colSpan={8}
                                    className="px-3 py-4 text-center text-sm text-gray-500"
                                  >
                                    No batting data available yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Bowling Stats */}
                      <div>
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                          <span className="bg-red-100 p-1 rounded mr-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-red-700"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          Bowling
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Player
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Team
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Overs
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Maidens
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Runs
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Wickets
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Economy
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Points
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {matchStats.playerStats &&
                                matchStats.playerStats
                                  .filter(
                                    (player: PlayerStat) =>
                                      (player.wickets ?? 0) > 0 ||
                                      (player.overs ?? 0) > 0
                                  )
                                  .sort(
                                    (a: PlayerStat, b: PlayerStat) =>
                                      (b.wickets ?? 0) - (a.wickets ?? 0)
                                  )
                                  .slice(0, 10)
                                  .map((player: PlayerStat, idx: number) => (
                                    <tr
                                      key={`bowl-${player.id}`}
                                      className={
                                        idx % 2 === 0
                                          ? 'bg-white'
                                          : 'bg-gray-50'
                                      }
                                    >
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {player.playerImage ? (
                                            <img
                                              src={player.playerImage}
                                              alt={player.playerName}
                                              className="w-6 h-6 rounded-full mr-2"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
                                          )}
                                          <span className="text-sm font-medium text-gray-900">
                                            {player.playerName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.teamName ===
                                        contest.match?.teamAName ? (
                                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.overs}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.maidens}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.runsConceded}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">
                                        {player.wickets}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.economy?.toFixed(1) || '-'}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold text-green-600">
                                        {player.points.toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}

                              {(!matchStats.playerStats ||
                                matchStats.playerStats.filter(
                                  (player: PlayerStat) =>
                                    (player.wickets ?? 0) > 0 ||
                                    (player.overs ?? 0) > 0
                                ).length === 0) && (
                                <tr>
                                  <td
                                    colSpan={8}
                                    className="px-3 py-4 text-center text-sm text-gray-500"
                                  >
                                    No bowling data available yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Fielding Stats */}
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                          <span className="bg-blue-100 p-1 rounded mr-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-blue-700"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          Fielding
                        </h4>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Player
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Team
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Catches
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Stumpings
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Run Outs
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Points
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {matchStats.playerStats &&
                                matchStats.playerStats
                                  .filter(
                                    (player: PlayerStat) =>
                                      (player.catches ?? 0) > 0 ||
                                      (player.stumpings ?? 0) > 0 ||
                                      (player.runOuts ?? 0) > 0
                                  )
                                  .sort(
                                    (a: PlayerStat, b: PlayerStat) =>
                                      (b.catches ?? 0) +
                                      (b.stumpings ?? 0) +
                                      (b.runOuts ?? 0) -
                                      ((a.catches ?? 0) +
                                        (a.stumpings ?? 0) +
                                        (a.runOuts ?? 0))
                                  )
                                  .slice(0, 10)
                                  .map((player: PlayerStat, idx: number) => (
                                    <tr
                                      key={`field-${player.id}`}
                                      className={
                                        idx % 2 === 0
                                          ? 'bg-white'
                                          : 'bg-gray-50'
                                      }
                                    >
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {player.playerImage ? (
                                            <img
                                              src={player.playerImage}
                                              alt={player.playerName}
                                              className="w-6 h-6 rounded-full mr-2"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 mr-2"></div>
                                          )}
                                          <span className="text-sm font-medium text-gray-900">
                                            {player.playerName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                                        {player.teamName ===
                                        contest.match?.teamAName ? (
                                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs">
                                            {player.teamName}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">
                                        {player.catches}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">
                                        {player.stumpings}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">
                                        {player.runOuts}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center font-bold text-green-600">
                                        {(
                                          (player.catches ?? 0) * 4 +
                                          (player.stumpings ?? 0) * 6 +
                                          (player.runOuts ?? 0) * 4
                                        ).toFixed(1)}
                                      </td>
                                    </tr>
                                  ))}

                              {(!matchStats.playerStats ||
                                matchStats.playerStats.filter(
                                  (player: PlayerStat) =>
                                    (player.catches ?? 0) > 0 ||
                                    (player.stumpings ?? 0) > 0 ||
                                    (player.runOuts ?? 0) > 0
                                ).length === 0) && (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="px-3 py-4 text-center text-sm text-gray-500"
                                  >
                                    No fielding data available yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
