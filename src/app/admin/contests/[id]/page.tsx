'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  FaTrophy,
  FaEdit,
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaClipboardList,
  FaCalendarAlt,
  FaSpinner,
  FaLock,
  FaUnlock,
  FaPlay,
  FaStop,
} from 'react-icons/fa';

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  filledSpots: number;
  prizePool: number;
  status: string;
  matchId: string;
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
}

interface Match {
  id: string;
  name: string;
  startTime: string;
  team1: string;
  team2: string;
  status: string;
}

interface PrizeBreakup {
  rank: number;
  percentage: number;
  amount: number;
}

export default function ContestDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const contestId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<Contest | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [prizeBreakup, setPrizeBreakup] = useState<PrizeBreakup[]>([]);
  const [participants, setParticipants] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchContestDetails();
    }
  }, [status, router, contestId]);

  const fetchContestDetails = async () => {
    setLoading(true);
    try {
      // Fetch contest
      const contestResponse = await fetch(`/api/admin/contests/${contestId}`);
      if (!contestResponse.ok) {
        throw new Error('Failed to fetch contest details');
      }
      const contestData = await contestResponse.json();
      setContest(contestData);

      // Fetch match
      if (contestData.matchId) {
        const matchResponse = await fetch(
          `/api/admin/matches/${contestData.matchId}`
        );
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          setMatch(matchData);
        }
      }

      // Fetch prize breakup
      const prizeResponse = await fetch(
        `/api/admin/contests/${contestId}/prizes`
      );
      if (prizeResponse.ok) {
        const prizeData = await prizeResponse.json();
        setPrizeBreakup(prizeData);
      }

      // Fetch participants count
      const participantsResponse = await fetch(
        `/api/admin/contests/${contestId}/participants/count`
      );
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        setParticipants(participantsData.count);
      }
    } catch (err) {
      console.error('Error fetching contest details:', err);
      setError('Failed to load contest details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!contest) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(
        `/api/admin/contests/${contestId}/toggle-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !contest.isActive }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contest status');
      }

      // Update the contest with the new status
      setContest((prevContest) =>
        prevContest ? { ...prevContest, isActive: !prevContest.isActive } : null
      );
    } catch (err) {
      console.error('Error updating contest status:', err);
      setError('Failed to update contest status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'live':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 text-red-700 underline"
              onClick={() => fetchContestDetails()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-yellow-700">Contest not found</p>
            <Link
              href="/admin/contests"
              className="mt-2 text-yellow-700 underline"
            >
              Back to Contests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fillPercentage = Math.round(
    (contest.filledSpots / contest.totalSpots) * 100
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/contests"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Contests
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-800">{contest.name}</span>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/admin/contests/${contestId}/edit`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FaEdit className="mr-2" />
            Edit Contest
          </Link>
          <button
            onClick={handleToggleStatus}
            className={`${
              contest.isActive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded-md flex items-center`}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : contest.isActive ? (
              <FaLock className="mr-2" />
            ) : (
              <FaUnlock className="mr-2" />
            )}
            {contest.isActive ? 'Deactivate Contest' : 'Activate Contest'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contest Information */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaTrophy className="text-indigo-600 mr-2" />
            Contest Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Name</p>
              <p className="font-medium">{contest.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    contest.status
                  )}`}
                >
                  {contest.status}
                </span>
                <span
                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contest.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {contest.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Entry Fee</p>
              <p className="font-medium">₹{contest.entryFee.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Prize Pool</p>
              <p className="font-medium text-green-600">
                ₹{contest.prizePool.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Spots</p>
              <p className="font-medium">
                {contest.filledSpots} / {contest.totalSpots}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full"
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Match</p>
              <p className="font-medium">{match?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Start Time</p>
              <p className="font-medium">{formatDate(contest.startTime)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">End Time</p>
              <p className="font-medium">
                {contest.endTime
                  ? formatDate(contest.endTime)
                  : 'Not ended yet'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Created</p>
              <p className="font-medium">
                {formatDate(contest.createdAt)}(
                {formatDistanceToNow(new Date(contest.createdAt), {
                  addSuffix: true,
                })}
                )
              </p>
            </div>
          </div>
        </div>

        {/* Match Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaCalendarAlt className="text-indigo-600 mr-2" />
            Match Details
          </h2>

          {match ? (
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm">Name</p>
                <p className="font-medium">{match.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Teams</p>
                <p className="font-medium">
                  {match.team1} vs {match.team2}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Start Time</p>
                <p className="font-medium">{formatDate(match.startTime)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    match.status
                  )}`}
                >
                  {match.status}
                </span>
              </div>

              <Link
                href={`/admin/matches/${match.id}`}
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View Match Details →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">Match information not available</p>
          )}
        </div>

        {/* Prize Breakup */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaMoneyBillWave className="text-indigo-600 mr-2" />
              Prize Breakup
            </h2>
          </div>

          {prizeBreakup.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {prizeBreakup.map((prize) => (
                    <tr key={prize.rank}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {prize.rank === 1
                          ? '1st'
                          : prize.rank === 2
                          ? '2nd'
                          : prize.rank === 3
                          ? '3rd'
                          : `${prize.rank}th`}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {prize.percentage}%
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                        ₹{prize.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No prize breakup available</p>
          )}
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaUsers className="text-indigo-600 mr-2" />
              Participants
            </h2>
            <Link
              href={`/admin/contests/${contestId}/participants`}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All
            </Link>
          </div>

          <div className="text-center py-8">
            <p className="text-4xl font-bold text-indigo-600">{participants}</p>
            <p className="text-gray-500">Total Participants</p>

            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-indigo-600 h-4 rounded-full"
                  style={{ width: `${fillPercentage}%` }}
                ></div>
              </div>
              <p className="mt-2 text-gray-600">
                {fillPercentage}% Full ({contest.filledSpots}/
                {contest.totalSpots} spots)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
