'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import {
  FaTrophy,
  FaCheckCircle,
  FaSpinner,
  FaExclamationCircle,
  FaSync,
} from 'react-icons/fa';

interface ContestEntry {
  id: string;
  contestId: string;
  fantasyTeamId: string;
  rank?: number;
  winAmount?: number;
  points?: number;
  fantasyTeam: {
    name: string;
    points?: number;
  };
  contest: {
    id: string;
    name: string;
    entryFee: number;
    totalSpots: number;
    filledSpots: number;
    totalPrize: number;
    firstPrize: number;
    match: {
      id: string;
      name: string;
      teamAName: string;
      teamBName: string;
      startTime: string;
      status: string;
    };
  };
}

export default function MyContestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contests, setContests] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all'); // all, upcoming, live, completed
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchMyContests();
    }
  }, [status, router]);

  const fetchMyContests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/contests');

      if (!response.ok) {
        throw new Error('Failed to fetch contests');
      }

      const data = await response.json();
      setContests(data);
    } catch (err) {
      console.error('Error fetching contests:', err);
      setError('Failed to load your contests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh points for a specific match
  const refreshMatchPoints = async (matchId: string) => {
    if (refreshing) return;

    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/matches/${matchId}/update-contest-points`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update points`);
      }

      // Refetch contests to get updated points
      await fetchMyContests();
    } catch (err) {
      console.error('Error updating points:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredContests = contests.filter((entry) => {
    const matchStatus = entry.contest.match.status.toLowerCase();

    if (activeTab === 'all') return true;
    if (activeTab === 'upcoming') return matchStatus === 'upcoming';
    if (activeTab === 'live') return matchStatus === 'live';
    if (activeTab === 'completed') return matchStatus === 'completed';

    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Add a header section with refresh button for live contests when tab is 'live'
  const renderLiveHeader = () => {
    if (activeTab !== 'live' || filteredContests.length === 0) return null;

    // Get unique match IDs from live contests
    const liveMatchIds = [
      ...new Set(
        filteredContests
          .filter((entry) => entry.contest.match.status === 'live')
          .map((entry) => entry.contest.match.id)
      ),
    ];

    return (
      <div className="mb-4 flex justify-between items-center bg-green-50 p-3 rounded-lg">
        <div>
          <h3 className="font-medium text-green-800">Live Matches</h3>
          <p className="text-sm text-green-600">
            Points update automatically every 2 minutes
          </p>
        </div>
        <button
          onClick={() =>
            liveMatchIds.forEach((matchId) => refreshMatchPoints(matchId))
          }
          disabled={refreshing}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center space-x-2 disabled:opacity-50"
        >
          {refreshing ? (
            <FaSpinner className="animate-spin mr-1" />
          ) : (
            <FaSync className="mr-1" />
          )}
          <span>Refresh All</span>
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-3xl text-indigo-600" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <div className="flex">
              <FaExclamationCircle className="mt-1 mr-2" />
              <p>{error}</p>
            </div>
            <button
              onClick={fetchMyContests}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">My Contests</h1>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 ${
              activeTab === 'all'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'upcoming'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'live'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('live')}
          >
            Live
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === 'completed'
                ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        {renderLiveHeader()}

        {filteredContests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              You haven't joined any {activeTab !== 'all' ? activeTab : ''}{' '}
              contests yet.
            </p>
            <Link
              href="/matches"
              className="mt-4 inline-block py-2 px-4 bg-indigo-600 text-white rounded-lg"
            >
              Browse Matches
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredContests.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
              >
                {/* Match Info */}
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">
                      {entry.contest.match.teamAName} vs{' '}
                      {entry.contest.match.teamBName}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        entry.contest.match.status === 'upcoming'
                          ? 'bg-yellow-100 text-yellow-800'
                          : entry.contest.match.status === 'live'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {entry.contest.match.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(entry.contest.match.startTime)}
                  </p>
                </div>

                {/* Contest Info */}
                <div className="p-4">
                  <Link
                    href={`/contests/${entry.contest.id}?matchId=${entry.contest.match.id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {entry.contest.name}
                  </Link>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Entry</p>
                      <p className="font-medium">₹{entry.contest.entryFee}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Prize Pool</p>
                      <p className="font-medium">₹{entry.contest.totalPrize}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Spots</p>
                      <p className="font-medium">
                        {entry.contest.filledSpots}/{entry.contest.totalSpots}
                      </p>
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Your Team</p>
                        <Link
                          href={`/teams/${entry.fantasyTeamId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {entry.fantasyTeam.name}
                        </Link>
                        {entry.contest.match.status === 'live' && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs font-medium text-gray-500">
                              Points: {entry.points || 0}
                            </span>
                          </div>
                        )}
                      </div>

                      {entry.contest.match.status === 'completed' ? (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Rank</p>
                          <p className="font-semibold">
                            {entry.rank || '-'}
                            {entry.rank === 1 && (
                              <FaTrophy className="text-yellow-500 ml-1 inline" />
                            )}
                          </p>
                        </div>
                      ) : entry.contest.match.status === 'live' ? (
                        <div className="text-right flex items-center">
                          <div>
                            <p className="text-sm text-gray-500">Points</p>
                            <p className="font-semibold">
                              {entry.points || entry.fantasyTeam.points || 0}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              refreshMatchPoints(entry.contest.match.id)
                            }
                            disabled={refreshing}
                            className="ml-2 text-indigo-600 hover:text-indigo-800 p-1"
                            title="Refresh points"
                          >
                            {refreshing ? (
                              <FaSpinner className="animate-spin" />
                            ) : (
                              <FaSync />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <FaCheckCircle className="text-green-500" />
                          <span className="text-xs text-green-600 ml-1">
                            Joined
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Winnings */}
                    {entry.winAmount && entry.winAmount > 0 && (
                      <div className="mt-2 bg-green-50 p-2 rounded text-green-700 flex justify-between items-center">
                        <span className="text-sm font-medium">You won</span>
                        <span className="font-bold">₹{entry.winAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
