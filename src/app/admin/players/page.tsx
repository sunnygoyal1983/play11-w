"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

export default function AdminPlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    // Simulate fetching players data
    setTimeout(() => {
      const teamsData = [
        { id: 'IND', name: 'India' },
        { id: 'AUS', name: 'Australia' },
        { id: 'ENG', name: 'England' },
        { id: 'SA', name: 'South Africa' },
        { id: 'PAK', name: 'Pakistan' },
        { id: 'NZ', name: 'New Zealand' },
        { id: 'WI', name: 'West Indies' },
        { id: 'SL', name: 'Sri Lanka' },
        { id: 'BAN', name: 'Bangladesh' },
        { id: 'AFG', name: 'Afghanistan' }
      ];
      
      setTeams(teamsData);
      
      setPlayers([
        {
          id: 101,
          name: 'Virat Kohli',
          team: 'IND',
          teamName: 'India',
          role: 'Batsman',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm medium',
          credits: 10.5,
          image: '/player-images/virat-kohli.jpg',
          stats: {
            matches: 350,
            runs: 12500,
            wickets: 4,
            average: 59.8,
            strikeRate: 93.5
          }
        },
        {
          id: 102,
          name: 'Rohit Sharma',
          team: 'IND',
          teamName: 'India',
          role: 'Batsman',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm off break',
          credits: 10.0,
          image: '/player-images/rohit-sharma.jpg',
          stats: {
            matches: 320,
            runs: 10500,
            wickets: 8,
            average: 48.2,
            strikeRate: 88.7
          }
        },
        {
          id: 103,
          name: 'Steve Smith',
          team: 'AUS',
          teamName: 'Australia',
          role: 'Batsman',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm leg break',
          credits: 9.5,
          image: '/player-images/steve-smith.jpg',
          stats: {
            matches: 280,
            runs: 9800,
            wickets: 25,
            average: 45.6,
            strikeRate: 86.2
          }
        },
        {
          id: 104,
          name: 'Pat Cummins',
          team: 'AUS',
          teamName: 'Australia',
          role: 'Bowler',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm fast',
          credits: 9.0,
          image: '/player-images/pat-cummins.jpg',
          stats: {
            matches: 210,
            runs: 1200,
            wickets: 320,
            average: 22.5,
            economy: 5.2
          }
        },
        {
          id: 201,
          name: 'Joe Root',
          team: 'ENG',
          teamName: 'England',
          role: 'Batsman',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm off break',
          credits: 9.5,
          image: '/player-images/joe-root.jpg',
          stats: {
            matches: 290,
            runs: 10200,
            wickets: 30,
            average: 47.8,
            strikeRate: 87.5
          }
        },
        {
          id: 202,
          name: 'Ben Stokes',
          team: 'ENG',
          teamName: 'England',
          role: 'All-rounder',
          battingStyle: 'Left-handed',
          bowlingStyle: 'Right-arm fast-medium',
          credits: 9.5,
          image: '/player-images/ben-stokes.jpg',
          stats: {
            matches: 250,
            runs: 6500,
            wickets: 180,
            average: 38.2,
            economy: 5.8
          }
        },
        {
          id: 301,
          name: 'Kieron Pollard',
          team: 'WI',
          teamName: 'West Indies',
          role: 'All-rounder',
          battingStyle: 'Right-handed',
          bowlingStyle: 'Right-arm medium',
          credits: 8.5,
          image: '/player-images/kieron-pollard.jpg',
          stats: {
            matches: 280,
            runs: 5800,
            wickets: 120,
            average: 32.5,
            strikeRate: 150.2
          }
        },
        {
          id: 401,
          name: 'Shakib Al Hasan',
          team: 'BAN',
          teamName: 'Bangladesh',
          role: 'All-rounder',
          battingStyle: 'Left-handed',
          bowlingStyle: 'Left-arm orthodox',
          credits: 9.0,
          image: '/player-images/shakib-al-hasan.jpg',
          stats: {
            matches: 310,
            runs: 7200,
            wickets: 290,
            average: 36.8,
            economy: 4.8
          }
        }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  // Filter players based on search term, team filter, and role filter
  const filteredPlayers = players.filter((player: any) => {
    const matchesSearchTerm = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeamFilter = teamFilter === 'all' || player.team === teamFilter;
    const matchesRoleFilter = roleFilter === 'all' || player.role.toLowerCase() === roleFilter.toLowerCase();
    
    return matchesSearchTerm && matchesTeamFilter && matchesRoleFilter;
  });

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
        <h1 className="text-2xl font-bold">Manage Players</h1>
        <Link 
          href="/admin/players/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Player
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
              placeholder="Search players by name..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center">
              <FaFilter className="text-gray-400 mr-2" />
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="all">All Teams</option>
                {teams.map((team: any) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center ml-0 sm:ml-2">
              <select
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all-rounder">All-rounder</option>
                <option value="wicket-keeper">Wicket-keeper</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No players found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player: any) => (
            <div key={player.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 flex items-center space-x-4">
                <div className="w-16 h-16 relative rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={player.image || '/player-images/default.png'}
                    alt={player.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{player.name}</h3>
                  <div className="flex items-center">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {player.teamName}
                    </span>
                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      {player.role}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-lg font-bold text-indigo-600">{player.credits}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Batting</p>
                    <p className="text-sm">{player.battingStyle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bowling</p>
                    <p className="text-sm">{player.bowlingStyle}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Matches</p>
                    <p className="text-sm font-medium">{player.stats.matches}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Runs</p>
                    <p className="text-sm font-medium">{player.stats.runs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Wickets</p>
                    <p className="text-sm font-medium">{player.stats.wickets}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 px-4 py-2 flex justify-end space-x-2">
                <Link 
                  href={`/admin/players/${player.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <FaEdit />
                </Link>
                <button 
                  className="text-red-600 hover:text-red-900"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this player?')) {
                      // Delete player logic would go here
                      console.log('Delete player', player.id);
                    }
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
