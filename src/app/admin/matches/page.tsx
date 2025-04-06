'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaEye,
} from 'react-icons/fa';

export default function AdminMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        // Log the fetch request for debugging
        console.log('Fetching matches from API...');

        const response = await fetch('/api/matches?admin=true');
        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(
            `Failed to fetch matches: ${response.status} ${response.statusText}`
          );
        }

        const responseData = await response.json();
        console.log('Response data structure:', Object.keys(responseData));

        // Handle different response structures
        let matchesData: any[] = [];

        if (responseData.success && responseData.data) {
          // New API structure
          matchesData = Array.isArray(responseData.data)
            ? responseData.data
            : responseData.data.data || [];

          console.log(`Found ${matchesData.length} matches in data field`);
        } else if (responseData.matches) {
          // Old API structure
          matchesData = responseData.matches;
          console.log(`Found ${matchesData.length} matches in matches field`);
        } else {
          // If the response is an array directly
          matchesData = Array.isArray(responseData) ? responseData : [];
          console.log(`Found ${matchesData.length} matches in direct array`);
        }

        setMatches(matchesData);
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch matches'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  // Filter matches based on search term and status filter
  const filteredMatches = matches.filter((match: any) => {
    const matchName = match.name || '';
    const matchVenue = match.venue || '';
    const teamAName = match.teamAName || '';
    const teamBName = match.teamBName || '';

    const matchesSearchTerm =
      matchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matchVenue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teamAName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teamBName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatusFilter =
      statusFilter === 'all' || match.status === statusFilter;

    return matchesSearchTerm && matchesStatusFilter;
  });

  // Sort matches by start time - most recent first
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // Ensure upcoming matches are sorted by start time (most recent first)
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      // Sort by earliest start time first (closest to current time)
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }

    // Keep live matches at the top
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;

    // Then upcoming matches
    if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
    if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;

    // For completed matches, sort by most recent first
    if (a.status === 'completed' && b.status === 'completed') {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    }

    return 0;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'live':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Error Loading Matches</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Matches</h1>
        <Link
          href="/admin/matches/create"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Match
        </Link>
      </div>

      {/* Debug Information */}
      {matches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">No Matches Found</h2>
          <p>
            The API returned successfully but no matches were found in the
            database.
          </p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search matches..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matches Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tournament
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No matches found
                  </td>
                </tr>
              ) : (
                sortedMatches.map((match: any) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {match.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {match.venue || 'No venue'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {match.format || 'Unknown format'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {match.teamALogo && (
                          <img
                            src={match.teamALogo}
                            alt={match.teamAName}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        )}
                        <span className="text-sm text-gray-900">
                          {match.teamAName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        {match.teamBLogo && (
                          <img
                            src={match.teamBLogo}
                            alt={match.teamBName}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        )}
                        <span className="text-sm text-gray-900">
                          {match.teamBName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {match.leagueName || 'No league'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {match.startTime
                          ? new Date(match.startTime).toLocaleDateString()
                          : 'No date'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {match.startTime
                          ? new Date(match.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          match.status || 'unknown'
                        )}`}
                      >
                        {match.status
                          ? match.status.charAt(0).toUpperCase() +
                            match.status.slice(1)
                          : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/matches/${match.id}/players`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View players"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          href={`/admin/matches/${match.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit match"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(match.id)}
                          title="Delete match"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

async function handleDelete(matchId: string) {
  if (confirm('Are you sure you want to delete this match?')) {
    try {
      const response = await fetch('/api/matches', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: matchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete match');
      }

      // Refresh the matches list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match. Please try again.');
    }
  }
}
