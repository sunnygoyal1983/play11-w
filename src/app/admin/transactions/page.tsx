'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FaHistory,
  FaFilter,
  FaSearch,
  FaDownload,
  FaSync,
  FaSpinner,
  FaUser,
  FaChartLine,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaTrophy,
  FaGift,
  FaUndo,
} from 'react-icons/fa';

interface Transaction {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  amount: number;
  type: string;
  status: string;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

interface PlatformEarningsSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalContestEntries: number;
  totalContestWinnings: number;
  totalBonuses: number;
  totalRefunds: number;
  platformCommission: number;
  netPlatformEarnings: number;
  platformLiability: number;
  theoreticalBalance: number;
}

interface UserMetrics {
  uniqueTransactingUsers: number;
  activeWalletUsers: number;
  averageWalletBalance: number;
}

// Platform Earnings Summary Component
function PlatformEarnings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PlatformEarningsSummary | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchEarnings = async () => {
    try {
      setLoading(true);

      // Build query params for date filters
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(
        `/api/admin/platform-earnings?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch platform earnings data');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setSummary(data.data.summary);
        setUserMetrics(data.data.userMetrics);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching platform earnings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load earnings data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleDateFilterApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEarnings();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-center items-center h-24">
          <FaSpinner className="animate-spin h-6 w-6 text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 font-medium">Error: {error}</p>
        <button
          onClick={() => fetchEarnings()}
          className="mt-2 text-red-600 underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      <div className="p-4 bg-indigo-50 border-b flex justify-between items-center">
        <h2 className="font-bold text-lg flex items-center">
          <FaChartLine className="mr-2 text-indigo-600" />
          Platform Financial Summary
        </h2>

        <form
          onSubmit={handleDateFilterApply}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center">
            <label className="text-xs text-gray-600 mr-1">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm p-1 border rounded"
            />
          </div>
          <div className="flex items-center">
            <label className="text-xs text-gray-600 mr-1">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm p-1 border rounded"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded text-sm"
          >
            Apply
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTimeout(fetchEarnings, 0);
              }}
              className="text-gray-500 hover:text-gray-700"
              title="Clear date filter"
            >
              <FaUndo size={14} />
            </button>
          )}
        </form>
      </div>

      {summary && (
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {/* Income */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="flex items-center text-green-700 mb-1">
                <FaMoneyBillWave className="mr-1" />
                <span className="text-sm font-medium">Deposits</span>
              </div>
              <p className="text-xl font-bold text-green-800">
                ₹{summary.totalDeposits.toLocaleString()}
              </p>
            </div>

            {/* Withdrawals */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <div className="flex items-center text-red-700 mb-1">
                <FaExchangeAlt className="mr-1" />
                <span className="text-sm font-medium">Withdrawals</span>
              </div>
              <p className="text-xl font-bold text-red-800">
                ₹{summary.totalWithdrawals.toLocaleString()}
              </p>
            </div>

            {/* Contest Entries */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center text-blue-700 mb-1">
                <FaUser className="mr-1" />
                <span className="text-sm font-medium">Contest Entries</span>
              </div>
              <p className="text-xl font-bold text-blue-800">
                ₹{summary.totalContestEntries.toLocaleString()}
              </p>
            </div>

            {/* Contest Winnings */}
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <div className="flex items-center text-yellow-700 mb-1">
                <FaTrophy className="mr-1" />
                <span className="text-sm font-medium">Contest Winnings</span>
              </div>
              <p className="text-xl font-bold text-yellow-800">
                ₹{summary.totalContestWinnings.toLocaleString()}
              </p>
            </div>

            {/* Platform Commission */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <div className="flex items-center text-purple-700 mb-1">
                <FaGift className="mr-1" />
                <span className="text-sm font-medium">Platform Commission</span>
              </div>
              <p className="text-xl font-bold text-purple-800">
                ₹{summary.platformCommission.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Net Platform Earnings */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="text-indigo-800 font-semibold mb-2">
                Net Platform Earnings
              </h3>
              <p className="text-2xl font-bold text-indigo-700">
                ₹{summary.netPlatformEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Platform commission (entry fees minus winnings)
              </p>
            </div>

            {/* Users' Wallet Balance */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="text-indigo-800 font-semibold mb-2">
                Users' Wallet Balance
              </h3>
              <p className="text-2xl font-bold text-indigo-700">
                ₹{summary.platformLiability.toLocaleString()}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Current liability (money owed to users)
              </p>
            </div>

            {/* Expected Platform Balance */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <h3 className="text-indigo-800 font-semibold mb-2">
                Expected Platform Balance
              </h3>
              <p
                className={`text-2xl font-bold ${
                  summary.theoreticalBalance >= 0
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}
              >
                ₹{summary.theoreticalBalance.toLocaleString()}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                Deposits - Withdrawals - User Balances
              </p>
            </div>
          </div>

          {userMetrics && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  Unique Transacting Users
                </p>
                <p className="font-semibold">
                  {userMetrics.uniqueTransactingUsers.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Wallet Users</p>
                <p className="font-semibold">
                  {userMetrics.activeWalletUsers.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg. Wallet Balance</p>
                <p className="font-semibold">
                  ₹{userMetrics.averageWalletBalance.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router, page, pageSize]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', pageSize.toString());

      if (typeFilter) queryParams.append('type', typeFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await fetch(
        `/api/admin/transactions?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || data);

      // If pagination info is provided in the response
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalTransactions(data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on filter
    fetchTransactions();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleClearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setPage(1);

    // Fetch with cleared filters
    setTimeout(() => {
      fetchTransactions();
    }, 0);
  };

  const handleDownloadCSV = () => {
    // In a real app, you would implement CSV export functionality
    alert('In a real app, this would download a CSV of filtered transactions');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'contest_join':
        return 'Contest Join';
      case 'contest_winning':
        return 'Contest Winning';
      case 'refund':
        return 'Refund';
      case 'bonus':
        return 'Bonus';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (status === 'loading' || (loading && !refreshing)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaHistory className="text-indigo-600 mr-2" />
          Transactions
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 hover:text-indigo-600"
            disabled={refreshing}
            title="Refresh"
          >
            {refreshing ? (
              <FaSpinner className="animate-spin h-5 w-5" />
            ) : (
              <FaSync className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDownloadCSV}
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="Download CSV"
          >
            <FaDownload className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Add Platform Earnings Summary Component */}
      <PlatformEarnings />

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b">
          <form onSubmit={handleFilter}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="contest_join">Contest Join</option>
                  <option value="contest_winning">Contest Winning</option>
                  <option value="refund">Refund</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Search user, reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Clear Filters
              </button>
              <button
                type="submit"
                className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaFilter className="mr-2 h-4 w-4" />
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => {
                    setError(null);
                    fetchTransactions();
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/users/${transaction.userId}`}
                        className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-900"
                      >
                        <FaUser className="h-3 w-3" />
                        <span>
                          {transaction.userName || transaction.userEmail}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.createdAt)}
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
                            : transaction.type === 'refund'
                            ? 'bg-yellow-100 text-yellow-800'
                            : transaction.type === 'bonus'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={
                          transaction.type === 'withdrawal' ||
                          transaction.type === 'contest_join'
                            ? 'text-red-600'
                            : 'text-green-600'
                        }
                      >
                        {transaction.type === 'withdrawal' ||
                        transaction.type === 'contest_join'
                          ? '-'
                          : '+'}
                        ₹{transaction.amount.toFixed(2)}
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
                            : transaction.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {typeFilter || statusFilter || searchQuery || startDate || endDate
                ? 'No transactions found with the current filters'
                : 'No transactions found'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, totalTransactions)} of{' '}
                {totalTransactions} transactions
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  page === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
