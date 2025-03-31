"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';

export default function AdminContests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchFilter, setMatchFilter] = useState('all');
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    // Simulate fetching contests data
    setTimeout(() => {
      const matchesData = [
        { id: 1, name: 'India vs Australia' },
        { id: 2, name: 'England vs South Africa' },
        { id: 3, name: 'Pakistan vs New Zealand' },
        { id: 4, name: 'West Indies vs Sri Lanka' },
        { id: 5, name: 'Bangladesh vs Afghanistan' }
      ];
      
      setMatches(matchesData);
      
      setContests([
        {
          id: 1,
          matchId: 1,
          matchName: 'India vs Australia',
          name: 'Grand Prize Pool',
          entryFee: 499,
          totalPrize: 1000000,
          totalSpots: 10000,
          filledSpots: 5463,
          firstPrize: 100000,
          winnerPercentage: 40,
          status: 'upcoming'
        },
        {
          id: 2,
          matchId: 1,
          matchName: 'India vs Australia',
          name: 'Winner Takes All',
          entryFee: 999,
          totalPrize: 500000,
          totalSpots: 500,
          filledSpots: 245,
          firstPrize: 250000,
          winnerPercentage: 10,
          status: 'upcoming'
        },
        {
          id: 3,
          matchId: 1,
          matchName: 'India vs Australia',
          name: 'Practice Contest',
          entryFee: 0,
          totalPrize: 10000,
          totalSpots: 10000,
          filledSpots: 7890,
          firstPrize: 1000,
          winnerPercentage: 50,
          status: 'upcoming'
        },
        {
          id: 4,
          matchId: 2,
          matchName: 'England vs South Africa',
          name: 'Mega Contest',
          entryFee: 299,
          totalPrize: 300000,
          totalSpots: 5000,
          filledSpots: 2100,
          firstPrize: 50000,
          winnerPercentage: 30,
          status: 'upcoming'
        },
        {
          id: 5,
          matchId: 4,
          matchName: 'West Indies vs Sri Lanka',
          name: 'Live Contest',
          entryFee: 199,
          totalPrize: 100000,
          totalSpots: 2000,
          filledSpots: 2000,
          firstPrize: 20000,
          winnerPercentage: 25,
          status: 'live'
        },
        {
          id: 6,
          matchId: 5,
          matchName: 'Bangladesh vs Afghanistan',
          name: 'Completed Contest',
          entryFee: 99,
          totalPrize: 50000,
          totalSpots: 1000,
          filledSpots: 1000,
          firstPrize: 10000,
          winnerPercentage: 20,
          status: 'completed'
        }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  // Filter contests based on search term and match filter
  const filteredContests = contests.filter((contest: any) => {
    const matchesSearchTerm = contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             contest.matchName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMatchFilter = matchFilter === 'all' || contest.matchId.toString() === matchFilter;
    
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
        <h1 className="text-2xl font-bold">Manage Contests</h1>
        <Link 
          href="/admin/contests/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add Contest
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
              placeholder="Search contests..."
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
      
      {/* Contests Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prize Pool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spots
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
              {filteredContests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No contests found
                  </td>
                </tr>
              ) : (
                filteredContests.map((contest: any) => (
                  <tr key={contest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contest.name}</div>
                      <div className="text-xs text-gray-500">ID: {contest.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contest.matchName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {contest.entryFee === 0 ? 'FREE' : `₹${contest.entryFee}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ₹{contest.totalPrize.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contest.filledSpots} / {contest.totalSpots}
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(contest.filledSpots / contest.totalSpots) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(contest.status)}`}>
                        {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/admin/contests/${contest.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <FaEdit />
                        </Link>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this contest?')) {
                              // Delete contest logic would go here
                              console.log('Delete contest', contest.id);
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
