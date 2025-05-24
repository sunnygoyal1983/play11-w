"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaSearch, FaFilter, FaEye, FaTrash } from 'react-icons/fa';

export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchFilter, setMatchFilter] = useState('all');
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        const [teamsResponse, matchesResponse] = await Promise.all([
          fetch('/api/admin/teams'),
          fetch('/api/admin/matches')
        ]);

        if (!teamsResponse.ok || !matchesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const teamsData = await teamsResponse.json();
        const matchesData = await matchesResponse.json();

        setTeams(teamsData.teams);
        setMatches(matchesData.matches);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsData();
  }, []);

  // Filter teams based on search term and match filter
  const filteredTeams = teams.filter((team: any) => {
    const matchesSearchTerm = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             team.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             team.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMatchFilter = matchFilter === 'all' || team.matchId.toString() === matchFilter;
    
    return matchesSearchTerm && matchesMatchFilter;
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Fantasy Teams</h1>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search teams by name or user..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
            >
              <option value="all">All Matches</option>
              {matches.map((match: any) => (
                <option key={match.id} value={match.id.toString()}>
                  {match.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Teams Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Captain / Vice Captain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contests
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
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No teams found
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team: any) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      <div className="text-xs text-gray-500">Created: {new Date(team.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{team.userName}</div>
                      <div className="text-xs text-gray-500">{team.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{team.matchName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">C: {team.captainName}</div>
                      <div className="text-sm text-gray-900">VC: {team.viceCaptainName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{team.contestsJoined}</div>
                      {team.status !== 'upcoming' && (
                        <div className="text-xs text-gray-500">
                          Points: {team.points} | Rank: {team.rank}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(team.status)}`}>
                        {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/admin/teams/${team.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Team"
                        >
                          <FaEye />
                        </Link>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          title="Delete Team"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this team?')) {
                              // Delete team logic would go here
                              console.log('Delete team', team.id);
                            }
                          }}
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
