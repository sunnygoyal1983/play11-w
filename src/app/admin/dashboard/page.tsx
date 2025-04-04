'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FaUsers,
  FaTrophy,
  FaMoneyBillWave,
  FaFootballBall,
} from 'react-icons/fa';
import { MdSportsCricket } from 'react-icons/md';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    users: 0,
    matches: 0,
    contests: 0,
    transactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Mock fetching dashboard stats
  useEffect(() => {
    if (status === 'authenticated') {
      // In a real app, you would fetch actual stats from the server
      const fetchStats = async () => {
        try {
          // For now we're using mock data, but in production you'd call real API endpoints
          setStats({
            users: 45,
            matches: 28,
            contests: 67,
            transactions: 124,
          });
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchStats();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Users Stat Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-500 mr-4">
              <FaUsers size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <p className="text-2xl font-bold">{stats.users}</p>
            </div>
          </div>
        </div>

        {/* Matches Stat Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
              <MdSportsCricket size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Matches</p>
              <p className="text-2xl font-bold">{stats.matches}</p>
            </div>
          </div>
        </div>

        {/* Contests Stat Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-500 mr-4">
              <FaTrophy size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Live Contests</p>
              <p className="text-2xl font-bold">{stats.contests}</p>
            </div>
          </div>
        </div>

        {/* Transactions Stat Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-500 mr-4">
              <FaMoneyBillWave size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Transactions (24h)</p>
              <p className="text-2xl font-bold">{stats.transactions}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-sm font-medium">New user signed up</p>
                <p className="text-xs text-gray-500">10 minutes ago</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <p className="text-sm font-medium">New match created</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <p className="text-sm font-medium">Contest finished</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <p className="text-sm font-medium">Wallet deposit</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/admin/users/create')}
                className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex justify-center text-blue-500 mb-2">
                    <FaUsers size={24} />
                  </div>
                  <p className="text-sm font-medium text-center">Add User</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/matches')}
                className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex justify-center text-green-500 mb-2">
                    <MdSportsCricket size={24} />
                  </div>
                  <p className="text-sm font-medium text-center">
                    Manage Matches
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/contests')}
                className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex justify-center text-purple-500 mb-2">
                    <FaTrophy size={24} />
                  </div>
                  <p className="text-sm font-medium text-center">
                    Manage Contests
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center justify-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex justify-center text-yellow-500 mb-2">
                    <FaMoneyBillWave size={24} />
                  </div>
                  <p className="text-sm font-medium text-center">
                    User Wallets
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
