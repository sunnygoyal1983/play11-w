'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FaUsers,
  FaSearch,
  FaDownload,
  FaTrophy,
  FaSyncAlt,
  FaSpinner,
} from 'react-icons/fa';

interface Participant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamName: string;
  joinTime: string;
  points: number;
  rank: number;
}

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  filledSpots: number;
  status: string;
}

export default function ContestParticipantsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const contestId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [contest, setContest] = useState<Contest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchContest();
      fetchParticipants();
    }
  }, [status, router, contestId, page, pageSize, searchQuery]);

  const fetchContest = async () => {
    try {
      const response = await fetch(`/api/admin/contests/${contestId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contest details');
      }
      const contestData = await response.json();
      setContest(contestData);
    } catch (err) {
      console.error('Error fetching contest:', err);
      setError('Failed to load contest details. Please try again.');
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', pageSize.toString());

      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await fetch(
        `/api/admin/contests/${contestId}/participants?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }

      const data = await response.json();
      setParticipants(data.participants || data);

      // If pagination info is provided in the response
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to load participants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParticipants();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };

  const handleDownloadCSV = () => {
    // In a real app, you would implement CSV export functionality
    alert('In a real app, this would download a CSV of all participants');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (status === 'loading' || (loading && !refreshing)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !contest) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 text-red-700 underline"
              onClick={() => {
                setError(null);
                fetchContest();
                fetchParticipants();
              }}
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

  const filteredParticipants = searchQuery
    ? participants.filter(
        (p) =>
          p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.teamName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : participants;

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
          <Link
            href={`/admin/contests/${contestId}`}
            className="text-indigo-600 hover:text-indigo-800"
          >
            {contest.name}
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-800">Participants</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center">
              <FaUsers className="text-indigo-600 mr-2" />
              Contest Participants
            </h1>
            <div className="flex space-x-2">
              <button
                onClick={handleRefresh}
                className="text-gray-600 hover:text-indigo-600"
                disabled={refreshing}
              >
                {refreshing ? (
                  <FaSpinner className="animate-spin h-5 w-5" />
                ) : (
                  <FaSyncAlt className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleDownloadCSV}
                className="text-gray-600 hover:text-indigo-600"
              >
                <FaDownload className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <FaTrophy className="text-indigo-600" />
                <span className="font-medium">{contest.name}</span>
              </div>
              <div className="px-2 py-1 bg-gray-200 rounded-full text-xs font-medium">
                {contest.filledSpots} / {contest.totalSpots} Participants
              </div>
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  contest.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : contest.status === 'closed'
                    ? 'bg-red-100 text-red-800'
                    : contest.status === 'live'
                    ? 'bg-purple-100 text-purple-800'
                    : contest.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {contest.status}
              </div>
            </div>

            <form onSubmit={handleSearch} className="w-full md:w-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email or team..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 block w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Participants Table */}
        <div className="overflow-x-auto">
          {filteredParticipants.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Join Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${
                          participant.rank === 1
                            ? 'text-yellow-600 font-bold'
                            : participant.rank === 2
                            ? 'text-gray-500 font-bold'
                            : participant.rank === 3
                            ? 'text-amber-700 font-bold'
                            : 'text-gray-900'
                        }`}
                      >
                        {participant.rank === 1 && '🥇 '}
                        {participant.rank === 2 && '🥈 '}
                        {participant.rank === 3 && '🥉 '}
                        {participant.rank}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {participant.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participant.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {participant.points.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(participant.joinTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/users/${participant.userId}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View User
                      </Link>
                      <Link
                        href={`/admin/contests/${contestId}/participants/${participant.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Team Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {searchQuery
                ? 'No participants found matching your search'
                : 'No participants found'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredParticipants.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                Showing{' '}
                {Math.min(filteredParticipants.length, 1) +
                  (page - 1) * pageSize}{' '}
                to{' '}
                {Math.min(
                  page * pageSize,
                  (page - 1) * pageSize + filteredParticipants.length
                )}{' '}
                of {contest.filledSpots} participants
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  page === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
