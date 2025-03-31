"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FaUsers, 
  FaTrophy, 
  FaFutbol, 
  FaUserFriends,
  FaMoneyBillWave,
  FaCalendarAlt
} from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    matches: 0,
    contests: 0,
    teams: 0,
    players: 0,
    revenue: 0
  });
  
  const [recentUsers, setRecentUsers] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching dashboard data
    setTimeout(() => {
      setStats({
        users: 1250,
        matches: 18,
        contests: 42,
        teams: 3678,
        players: 220,
        revenue: 125000
      });
      
      setRecentUsers([
        { id: 1, name: 'John Doe', email: 'john@example.com', joinedAt: '2025-03-28T10:30:00Z', walletBalance: 500 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', joinedAt: '2025-03-27T14:45:00Z', walletBalance: 750 },
        { id: 3, name: 'Robert Johnson', email: 'robert@example.com', joinedAt: '2025-03-26T09:15:00Z', walletBalance: 1200 },
        { id: 4, name: 'Emily Davis', email: 'emily@example.com', joinedAt: '2025-03-25T16:20:00Z', walletBalance: 300 },
        { id: 5, name: 'Michael Wilson', email: 'michael@example.com', joinedAt: '2025-03-24T11:10:00Z', walletBalance: 850 }
      ]);
      
      setUpcomingMatches([
        { 
          id: 1, 
          name: 'India vs Australia', 
          format: 'T20', 
          venue: 'Melbourne Cricket Ground',
          startTime: '2025-04-05T14:00:00Z',
          contestCount: 12
        },
        { 
          id: 2, 
          name: 'England vs South Africa', 
          format: 'ODI', 
          venue: 'Lord\'s Cricket Ground',
          startTime: '2025-04-07T10:00:00Z',
          contestCount: 8
        },
        { 
          id: 3, 
          name: 'Pakistan vs New Zealand', 
          format: 'T20', 
          venue: 'Dubai International Stadium',
          startTime: '2025-04-10T16:30:00Z',
          contestCount: 5
        }
      ]);
      
      setLoading(false);
    }, 1000);
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
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
          value={`₹${stats.revenue.toLocaleString()}`} 
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
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ₹{user.walletBalance}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      <div className="text-sm font-medium text-gray-900">{match.name}</div>
                      <div className="text-xs text-gray-500">{match.venue}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {match.contestCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
