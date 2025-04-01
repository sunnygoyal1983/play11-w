'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaFilter, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '@/app/components/Modal';

export default function AdminMatchTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/match-teams');
        if (!response.ok) {
          throw new Error('Failed to fetch match teams');
        }
        const data = await response.json();
        setTeams(data.teams || []);
      } catch (error) {
        console.error('Error fetching match teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleTeamClick = async (team: any) => {
    setSelectedTeam(team);
    try {
      const response = await fetch(`/api/teams/${team.id}/players`);
      const data = await response.json();
      setTeamPlayers(data.players || []);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  // Filter teams based on search term and format filter
  const filteredTeams = teams.filter((team: any) => {
    const matchesSearchTerm =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.matchName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFormatFilter =
      formatFilter === 'all' || team.format === formatFilter;

    return matchesSearchTerm && matchesFormatFilter;
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

  const handleUpdateTeam = async (
    teamId: string,
    name: string,
    logo: string
  ) => {
    try {
      const response = await fetch('/api/match-teams', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId, name, logo }),
      });

      if (!response.ok) {
        throw new Error('Failed to update team');
      }

      // Refresh the teams list
      window.location.reload();
    } catch (error) {
      console.error('Error updating team:', error);
      alert('Failed to update team. Please try again.');
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
        <h1 className="text-2xl font-bold">Match Teams</h1>
        <Link
          href="/admin/match-teams/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaEdit className="mr-2" />
          Add Team
        </Link>
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
              placeholder="Search teams by name or match..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
            >
              <option value="all">All Formats</option>
              <option value="T20">T20</option>
              <option value="ODI">ODI</option>
              <option value="Test">Test</option>
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
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recent Match
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
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No teams found
                  </td>
                </tr>
              ) : (
                filteredTeams.map((team: any) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {team.logo ? (
                          <div className="flex-shrink-0 h-10 w-10 mr-3">
                            <Image
                              src={team.logo}
                              alt={team.name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-500 font-semibold">
                              {team.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => handleTeamClick(team)}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 focus:outline-none"
                        >
                          {team.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {team.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {team.matchName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(team.startTime).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          team.status
                        )}`}
                      >
                        {team.status.charAt(0).toUpperCase() +
                          team.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/match-teams/${team.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Team"
                        >
                          <FaEdit />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Players Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${selectedTeam?.name || ''} Players`}
      >
        <div className="mt-4">
          {teamPlayers.length === 0 ? (
            <p className="text-gray-500 text-center">No players found</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {teamPlayers.map((player: any) => (
                <li key={player.id} className="py-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {player.name}
                      </p>
                      {player.role && (
                        <p className="text-sm text-gray-500">{player.role}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
