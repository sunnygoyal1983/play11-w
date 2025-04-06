'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaUsers,
  FaTrophy,
  FaFutbol,
  FaUserFriends,
  FaMoneyBillWave,
  FaCalendarAlt,
} from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';
import { toast } from 'react-toastify';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    matches: 0,
    contests: 0,
    teams: 0,
    players: 0,
    revenue: 0,
    prizePool: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/dashboard-stats');

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        setStats(data.stats);
        setRecentUsers(data.recentUsers);
        setUpcomingMatches(data.upcomingMatches);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();

    // Set up an interval to refresh data every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <Link href={link} className="block">
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h2 className="text-lg font-medium text-red-800">
          Error Loading Dashboard
        </h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-4 py-2 rounded flex items-center text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.users.toLocaleString()}
          icon={FaUsers}
          color="bg-blue-500"
          link="/admin/users"
        />
        <StatCard
          title="Matches"
          value={stats.matches.toLocaleString()}
          icon={MdSportsCricket}
          color="bg-green-500"
          link="/admin/matches"
        />
        <StatCard
          title="Contests"
          value={stats.contests.toLocaleString()}
          icon={FaTrophy}
          color="bg-yellow-500"
          link="/admin/contests"
        />
        <StatCard
          title="Fantasy Teams"
          value={stats.teams.toLocaleString()}
          icon={FaUserFriends}
          color="bg-purple-500"
          link="/admin/teams"
        />
        <StatCard
          title="Players"
          value={stats.players.toLocaleString()}
          icon={FaFutbol}
          color="bg-red-500"
          link="/admin/players"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${Math.round(stats.revenue).toLocaleString()}`}
          icon={FaMoneyBillWave}
          color="bg-indigo-500"
          link="/admin/revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View All
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.joinedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          ₹{user.walletBalance.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Matches */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Upcoming Matches</h2>
            <Link
              href="/admin/matches"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View All
            </Link>
          </div>
          {upcomingMatches.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No upcoming matches
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contests
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingMatches.map((match: any) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {match.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {match.venue}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {match.format}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(match.startTime).toLocaleDateString()}{' '}
                          {new Date(match.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-indigo-600">
                          {match.contestCount}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Additional analytics section - can be expanded in the future */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-md font-medium text-gray-700">
              Platform Stats
            </h3>
            <ul className="mt-2 space-y-2">
              <li className="flex justify-between">
                <span className="text-gray-600">Total Contests</span>
                <span className="font-medium">
                  {stats.contests.toLocaleString()}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Total Prize Pool</span>
                <span className="font-medium">
                  ₹{Math.round(stats.prizePool).toLocaleString()}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">User to Contest Ratio</span>
                <span className="font-medium">
                  {stats.contests
                    ? (stats.users / stats.contests).toFixed(2)
                    : 'N/A'}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-md font-medium text-gray-700">Performance</h3>
            <ul className="mt-2 space-y-2">
              <li className="flex justify-between">
                <span className="text-gray-600">Avg Teams Per User</span>
                <span className="font-medium">
                  {stats.users ? (stats.teams / stats.users).toFixed(2) : 'N/A'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Revenue Per User</span>
                <span className="font-medium">
                  ₹
                  {stats.users
                    ? (stats.revenue / stats.users).toFixed(2)
                    : 'N/A'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Data Refreshed</span>
                <span className="font-medium text-green-600">
                  {new Date().toLocaleTimeString()}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
