"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaWallet, FaLock } from 'react-icons/fa';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // Simulate fetching users data
    setTimeout(() => {
      setUsers([
        { 
          id: 1, 
          name: 'John Doe', 
          email: 'john@example.com', 
          joinedAt: '2025-03-28T10:30:00Z', 
          walletBalance: 500,
          teamsCount: 5,
          contestsJoined: 12,
          status: 'active'
        },
        { 
          id: 2, 
          name: 'Jane Smith', 
          email: 'jane@example.com', 
          joinedAt: '2025-03-27T14:45:00Z', 
          walletBalance: 750,
          teamsCount: 3,
          contestsJoined: 8,
          status: 'active'
        },
        { 
          id: 3, 
          name: 'Robert Johnson', 
          email: 'robert@example.com', 
          joinedAt: '2025-03-26T09:15:00Z', 
          walletBalance: 1200,
          teamsCount: 7,
          contestsJoined: 15,
          status: 'active'
        },
        { 
          id: 4, 
          name: 'Emily Davis', 
          email: 'emily@example.com', 
          joinedAt: '2025-03-25T16:20:00Z', 
          walletBalance: 300,
          teamsCount: 2,
          contestsJoined: 4,
          status: 'active'
        },
        { 
          id: 5, 
          name: 'Michael Wilson', 
          email: 'michael@example.com', 
          joinedAt: '2025-03-24T11:10:00Z', 
          walletBalance: 850,
          teamsCount: 4,
          contestsJoined: 10,
          status: 'inactive'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and sort users
  const filteredUsers = users.filter((user: any) => {
    return user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           user.email.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a: any, b: any) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      case 'oldest':
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'wallet_high':
        return b.walletBalance - a.walletBalance;
      case 'wallet_low':
        return a.walletBalance - b.walletBalance;
      default:
        return 0;
    }
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
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
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <Link 
          href="/admin/users/create" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" />
          Add User
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
              placeholder="Search users by name or email..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center">
            <FaFilter className="text-gray-400 mr-2" />
            <select
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="wallet_high">Wallet (High-Low)</option>
              <option value="wallet_low">Wallet (Low-High)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.teamsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.contestsJoined}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/admin/users/${user.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit User"
                        >
                          <FaEdit />
                        </Link>
                        <Link 
                          href={`/admin/users/${user.id}/wallet`}
                          className="text-green-600 hover:text-green-900"
                          title="Manage Wallet"
                        >
                          <FaWallet />
                        </Link>
                        <button 
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Reset Password"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to reset this user\'s password?')) {
                              // Reset password logic would go here
                              console.log('Reset password for user', user.id);
                            }
                          }}
                        >
                          <FaLock />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                              // Delete user logic would go here
                              console.log('Delete user', user.id);
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
