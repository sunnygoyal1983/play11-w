"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';
import { PrismaClient } from '@prisma/client';

export default function AdminMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/admin/matches');
        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }
        const data = await response.json();
        setMatches(data.matches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  // Filter matches based on search term and status filter
  const filteredMatches = matches.filter((match: any) => {
    const matchesSearchTerm = match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             match.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatusFilter = statusFilter === 'all' || match.status === statusFilter;
    
    return matchesSearchTerm && matchesStatusFilter;
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
        <h1 className="text-2xl font-bold">Manage Matches</h1>
        <Link 
          href="/admin/matches/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Match
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
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contests
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No matches found
                  </td>
                </tr>
              ) : (
                filteredMatches.map((match: any) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{match.name}</div>
                      <div className="text-xs text-gray-500">{match.venue}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {match.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(match.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(match.status)}`}>
                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {match.contestCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/admin/matches/${match.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaEdit />
                        </Link>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this match?')) {
                              // Delete match logic would go here
                              console.log('Delete match', match.id);
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
