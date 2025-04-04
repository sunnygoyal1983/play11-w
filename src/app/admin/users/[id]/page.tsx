'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  FaUser,
  FaWallet,
  FaEdit,
  FaHistory,
  FaBan,
  FaTrash,
  FaCheck,
  FaSpinner,
} from 'react-icons/fa';
import { isAdminUser } from '@/lib/auth-utils';

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  isVerified: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserWallet {
  id: string;
  balance: number;
  depositBalance: number;
  winningBalance: number;
  bonusBalance: number;
}

interface UserTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
}

export default function UserDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBanning, setIsBanning] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchUserDetails();
    }
  }, [status, router, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      // Fetch user
      const userResponse = await fetch(`/api/admin/users/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }
      const userData = await userResponse.json();
      setUser(userData);

      // Fetch wallet
      const walletResponse = await fetch(`/api/admin/users/${userId}/wallet`);
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setUserWallet(walletData);
      }

      // Fetch recent transactions
      const transactionsResponse = await fetch(
        `/api/admin/users/${userId}/transactions?limit=5`
      );
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async () => {
    if (!user) return;

    setIsVerifying(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVerified: !user.isVerified }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user verification status');
      }

      // Update the user with the new isVerified status
      setUser((prevUser) =>
        prevUser ? { ...prevUser, isVerified: !prevUser.isVerified } : null
      );
    } catch (err) {
      console.error('Error updating user verification status:', err);
      setError('Failed to update user verification status. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBanUser = async () => {
    // In a real app, you would implement the ban functionality
    setIsBanning(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Ban functionality would be implemented here');
    } finally {
      setIsBanning(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 text-red-700 underline"
              onClick={() => fetchUserDetails()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-yellow-700">User not found</p>
            <Link
              href="/admin/users"
              className="mt-2 text-yellow-700 underline"
            >
              Back to User List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Link
            href="/admin/users"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Users
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-800">{user.name || user.email}</span>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/admin/users/${userId}/edit`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FaEdit className="mr-2" />
            Edit User
          </Link>
          <button
            onClick={handleVerifyUser}
            className={`${
              user.isVerified
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white px-4 py-2 rounded-md flex items-center`}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              <FaCheck className="mr-2" />
            )}
            {user.isVerified ? 'Unverify User' : 'Verify User'}
          </button>
          <button
            onClick={handleBanUser}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={isBanning}
          >
            {isBanning ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              <FaBan className="mr-2" />
            )}
            Ban User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaUser className="text-indigo-600 mr-2" />
            User Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Name</p>
              <p className="font-medium">{user.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Phone</p>
              <p className="font-medium">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <div className="flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    user.isVerified ? 'bg-green-500' : 'bg-yellow-500'
                  } mr-2`}
                ></span>
                <p className="font-medium">
                  {user.isVerified ? 'Verified' : 'Unverified'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Role</p>
              <p className="font-medium">
                {isAdminUser(user.email) ? 'Admin' : 'User'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Account Created</p>
              <p className="font-medium">
                {new Date(user.createdAt).toLocaleDateString()}(
                {formatDistanceToNow(new Date(user.createdAt), {
                  addSuffix: true,
                })}
                )
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaWallet className="text-indigo-600 mr-2" />
            Wallet
          </h2>

          {userWallet ? (
            <>
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Total Balance</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ₹{userWallet.balance.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-sm">Deposit Balance</p>
                  <p className="font-medium">
                    ₹{userWallet.depositBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Winning Balance</p>
                  <p className="font-medium">
                    ₹{userWallet.winningBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Bonus Balance</p>
                  <p className="font-medium">
                    ₹{userWallet.bonusBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              <Link
                href={`/admin/users/${userId}/wallet`}
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Manage Wallet →
              </Link>
            </>
          ) : (
            <p className="text-gray-500">Wallet information not available</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <FaHistory className="text-indigo-600 mr-2" />
              Recent Transactions
            </h2>
            <Link
              href={`/admin/users/${userId}/transactions`}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All
            </Link>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === 'deposit'
                              ? 'bg-green-100 text-green-800'
                              : transaction.type === 'withdrawal'
                              ? 'bg-red-100 text-red-800'
                              : transaction.type === 'contest_join'
                              ? 'bg-blue-100 text-blue-800'
                              : transaction.type === 'contest_winning'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : transaction.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No recent transactions found</p>
          )}
        </div>
      </div>
    </div>
  );
}
