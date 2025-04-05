'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import AdminProtected from '@/components/AdminProtected';
import {
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaDatabase,
  FaSearch,
  FaUser,
  FaCalendarAlt,
  FaDownload,
  FaMedal,
  FaRedo,
} from 'react-icons/fa';
import { toast } from 'react-toastify';

type TransactionSummary = {
  userId: string;
  name: string;
  email: string;
  totalWins: number;
  totalWinAmount: number;
  totalContestJoins: number;
  totalContestJoinAmount: number;
};

type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export default function CleanupTransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    duplicatesRemoved: number;
    duplicateGroups?: { reference: string; count: number }[];
  } | null>(null);
  const [schemaResult, setSchemaResult] = useState<{
    success: boolean;
    message: string;
    results: string[];
  } | null>(null);
  const [transactionSummary, setTransactionSummary] = useState<{
    userSummaries: TransactionSummary[];
    winningsByDate: Array<{ date: string; amount: number }>;
    transactions: Transaction[];
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [fixingMissingTransactions, setFixingMissingTransactions] =
    useState(false);
  const [missingTransactionsResult, setMissingTransactionsResult] = useState<{
    success: boolean;
    message?: string;
    totalWinningEntries?: number;
    missingTransactions?: number;
    details?: any[];
    processed?: any[];
  } | null>(null);
  const [failedTransactions, setFailedTransactions] = useState<any[]>([]);
  const [loadingFailedTx, setLoadingFailedTx] = useState(false);
  const [processingFailedTx, setProcessingFailedTx] = useState<
    Record<string, boolean>
  >({});

  // Load transaction summary when the component mounts
  useEffect(() => {
    fetchTransactionSummary();
  }, []);

  const fetchTransactionSummary = async (userId?: string) => {
    try {
      setSummaryLoading(true);
      let url = '/api/admin/transaction-summary';

      if (userId) {
        url += `?userId=${userId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Error fetching transaction summary: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setTransactionSummary(data);
      } else {
        toast.error(data.error || 'Failed to fetch transaction summary');
      }
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      toast.error('An error occurred while fetching transaction summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (
      !confirm(
        'Are you sure you want to clean up duplicate contest win transactions? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        '/api/admin/cleanup-duplicate-transactions',
        {
          method: 'POST',
        }
      );

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success(data.message);
        // Refresh transaction summary after cleanup
        fetchTransactionSummary();
      } else {
        toast.error(data.error || 'Failed to clean up duplicate transactions');
      }
    } catch (error) {
      console.error('Error cleaning up duplicate transactions:', error);
      toast.error('An error occurred while cleaning up duplicate transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFixDatabaseSchema = async () => {
    if (
      !confirm(
        'Are you sure you want to fix database schema issues? This will apply missing columns directly to the database.'
      )
    ) {
      return;
    }

    try {
      setSchemaLoading(true);
      const response = await fetch('/api/admin/fix-database-schema', {
        method: 'POST',
      });

      const data = await response.json();
      setSchemaResult(data);

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to fix database schema');
      }
    } catch (error) {
      console.error('Error fixing database schema:', error);
      toast.error('An error occurred while fixing database schema');
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    fetchTransactionSummary(userId);
  };

  const handleClearUserFilter = () => {
    setSelectedUserId(null);
    fetchTransactionSummary();
  };

  const handleExportTransactions = async () => {
    try {
      setExportLoading(true);
      let url = '/api/admin/transaction-summary?limit=1000';

      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Error fetching transaction data: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        // Convert data to CSV
        const csvRows = [];

        // Add headers
        csvRows.push(
          [
            'ID',
            'User',
            'Email',
            'Type',
            'Amount',
            'Reference',
            'Status',
            'Date',
          ].join(',')
        );

        // Add data rows
        data.transactions.forEach((tx: Transaction) => {
          csvRows.push(
            [
              tx.id,
              tx.user?.name?.replace(/,/g, ' ') || 'Unknown',
              tx.user?.email?.replace(/,/g, ' ') || 'Unknown',
              tx.type,
              tx.amount,
              (tx.reference || '-').replace(/,/g, ' '),
              tx.status,
              new Date(tx.createdAt).toISOString(),
            ].join(',')
          );
        });

        // Create CSV blob and download link
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute(
          'download',
          `transactions-${new Date().toISOString().split('T')[0]}.csv`
        );
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success('Transaction data exported successfully');
      } else {
        toast.error(data.error || 'Failed to export transaction data');
      }
    } catch (error) {
      console.error('Error exporting transaction data:', error);
      toast.error('An error occurred while exporting transaction data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleFixMissingTransactions = async (dryRun: boolean = false) => {
    try {
      setFixingMissingTransactions(true);
      const userId = selectedUserId || '';
      const response = await fetch(
        `/api/admin/fix-missing-transactions?userId=${userId}&dryRun=${dryRun}`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();
      setMissingTransactionsResult(data);

      if (data.success) {
        toast.success(
          dryRun
            ? `Found ${data.missingTransactions} missing transactions (dry run)`
            : `Fixed ${data.missingTransactions} missing transactions`
        );

        // Refresh transaction summary if fixes were applied
        if (!dryRun && data.missingTransactions > 0) {
          fetchTransactionSummary(selectedUserId || undefined);
        }
      } else {
        toast.error(data.error || 'Failed to fix missing transactions');
      }
    } catch (error) {
      console.error('Error fixing missing transactions:', error);
      toast.error('An error occurred while fixing missing transactions');
    } finally {
      setFixingMissingTransactions(false);
    }
  };

  // Add a new function to handle force creating transactions for the problematic user
  const handleForceCreateMissingTransaction = async () => {
    if (
      !confirm(
        'Are you sure you want to FORCE CREATE transactions for this user? This will create new transactions regardless of existing ones.'
      )
    ) {
      return;
    }

    try {
      setFixingMissingTransactions(true);
      const userId = '5c4d400d-ac19-45aa-ad67-ecffb2831b9d';
      const response = await fetch(
        `/api/admin/fix-missing-transactions?userId=${userId}&dryRun=false&forceCreate=true`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();
      setMissingTransactionsResult(data);

      if (data.success) {
        toast.success(
          `Forced creation of ${data.missingTransactions} transactions for the user`
        );

        // Refresh transaction summary
        fetchTransactionSummary(userId);
      } else {
        toast.error(data.error || 'Failed to force create transactions');
      }
    } catch (error) {
      console.error('Error forcing transaction creation:', error);
      toast.error('An error occurred while forcing transaction creation');
    } finally {
      setFixingMissingTransactions(false);
    }
  };

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Add this function to load failed transactions
  const loadFailedTransactions = async () => {
    try {
      setLoadingFailedTx(true);
      const response = await fetch('/api/admin/monitor-contest-wins');

      if (!response.ok) {
        throw new Error(
          `Error fetching failed transactions: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        setFailedTransactions(data.failedTransactions);
      } else {
        toast.error(data.error || 'Failed to load failed transactions');
      }
    } catch (error) {
      console.error('Error loading failed transactions:', error);
      toast.error('An error occurred while loading failed transactions');
    } finally {
      setLoadingFailedTx(false);
    }
  };

  // Function to handle retry or delete of failed transaction
  const handleFailedTransaction = async (
    id: string,
    action: 'retry' | 'delete'
  ) => {
    try {
      setProcessingFailedTx((prev) => ({ ...prev, [id]: true }));

      const response = await fetch('/api/admin/monitor-contest-wins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Reload failed transactions
        await loadFailedTransactions();
        // If it was a retry, also refresh the transaction summary
        if (action === 'retry') {
          fetchTransactionSummary(selectedUserId || undefined);
        }
      } else {
        toast.error(data.error || `Failed to ${action} failed transaction`);
      }
    } catch (error) {
      console.error(`Error ${action}ing failed transaction:`, error);
      toast.error(`An error occurred while ${action}ing failed transaction`);
    } finally {
      setProcessingFailedTx((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Load failed transactions on mount
  useEffect(() => {
    loadFailedTransactions();
  }, []);

  return (
    <MainLayout>
      <AdminProtected>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Admin Maintenance Tools</h1>

          {/* Transaction Summary Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Contest Win Transactions Summary
            </h2>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              {summaryLoading ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-indigo-600 text-xl" />
                </div>
              ) : transactionSummary ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    {selectedUserId ? (
                      <button
                        onClick={handleClearUserFilter}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm flex items-center"
                      >
                        <FaUser className="mr-1" /> Clear user filter
                      </button>
                    ) : (
                      <div></div>
                    )}

                    <button
                      onClick={handleExportTransactions}
                      disabled={exportLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      {exportLoading ? (
                        <FaSpinner className="animate-spin mr-1" />
                      ) : (
                        <FaDownload className="mr-1" />
                      )}
                      Export CSV
                    </button>
                  </div>

                  {/* Winnings by Date Chart */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">
                      Contest Winnings by Date
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="h-40 flex items-end space-x-1">
                        {transactionSummary.winningsByDate.map((item) => {
                          // Calculate bar height based on amount (max height 100%)
                          const maxAmount = Math.max(
                            ...transactionSummary.winningsByDate.map(
                              (d) => d.amount
                            )
                          );
                          const height = Math.max(
                            5,
                            (item.amount / maxAmount) * 100
                          );

                          return (
                            <div
                              key={item.date}
                              className="flex flex-col items-center"
                            >
                              <div
                                className="w-12 bg-green-500 rounded-t"
                                style={{ height: `${height}%` }}
                                title={`${item.date}: ₹${item.amount}`}
                              ></div>
                              <div className="text-xs text-gray-600 mt-1">
                                {item.date.split('-').slice(1).join('/')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">
                      Recent Contest Win Transactions
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactionSummary.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(tx.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center">
                                  <button
                                    onClick={() => handleUserSelect(tx.userId)}
                                    className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                  >
                                    <FaUser className="mr-1 text-xs" />
                                    {tx.user?.name || 'Unknown'}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {tx.reference || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                ₹{tx.amount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* User Summaries */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">
                      User Contest Summary
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Contests
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contest Fees
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Wins
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Winnings
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Net P/L
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactionSummary.userSummaries.map((user) => {
                            const netProfitLoss =
                              user.totalWinAmount - user.totalContestJoinAmount;
                            return (
                              <tr
                                key={user.userId}
                                className={`hover:bg-gray-50 ${
                                  selectedUserId === user.userId
                                    ? 'bg-indigo-50'
                                    : ''
                                }`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button
                                    onClick={() =>
                                      handleUserSelect(user.userId)
                                    }
                                    className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                  >
                                    <FaUser className="mr-1 text-xs" />
                                    {user.name}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {user.totalContestJoins}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                  ₹{user.totalContestJoinAmount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {user.totalWins}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                  ₹{user.totalWinAmount}
                                </td>
                                <td
                                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                    netProfitLoss >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {netProfitLoss >= 0 ? '+' : ''}₹
                                  {netProfitLoss}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No transaction data available
                </div>
              )}
            </div>
          </div>

          {/* Failed Contest Win Transactions Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Failed Contest Win Transactions
            </h2>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-700">
                  This section shows contest win transactions that failed to
                  process properly. You can retry them or delete the error
                  records.
                </p>
                <button
                  onClick={loadFailedTransactions}
                  disabled={loadingFailedTx}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  {loadingFailedTx ? (
                    <FaSpinner className="animate-spin mr-1" />
                  ) : (
                    <FaRedo className="mr-1" />
                  )}
                  Refresh
                </button>
              </div>

              {loadingFailedTx ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-indigo-600 text-xl" />
                </div>
              ) : failedTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contest ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {failedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.data.userId ? (
                              <button
                                onClick={() => handleUserSelect(tx.data.userId)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {tx.data.userId.substring(0, 8)}...
                              </button>
                            ) : (
                              'Unknown'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.data.contestId
                              ? tx.data.contestId.substring(0, 8) + '...'
                              : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.data.rank || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ₹{tx.data.winAmount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {tx.data.error
                              ? tx.data.error.substring(0, 30) + '...'
                              : 'Unknown error'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() =>
                                  handleFailedTransaction(tx.id, 'retry')
                                }
                                disabled={processingFailedTx[tx.id]}
                                className="text-green-600 hover:text-green-900"
                                title="Retry transaction"
                              >
                                {processingFailedTx[tx.id] ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaRedo />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleFailedTransaction(tx.id, 'delete')
                                }
                                disabled={processingFailedTx[tx.id]}
                                className="text-red-600 hover:text-red-900"
                                title="Delete error record"
                              >
                                {processingFailedTx[tx.id] ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaTrash />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No failed transactions found
                </div>
              )}
            </div>
          </div>

          {/* Fix Missing Transactions Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Fix Missing Contest Win Transactions
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This tool will check for contest entries with winnings that
                    don't have corresponding transactions. It can help fix cases
                    where users won contests but the transaction records were
                    not created properly.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <p className="mb-4">
                Use this tool to fix missing contest win transactions in the
                database. This helps ensure that each user's wallet balance
                correctly reflects their contest winnings and that all
                transactions are properly recorded.
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={() => handleFixMissingTransactions(true)}
                  disabled={fixingMissingTransactions}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-indigo-300"
                >
                  {fixingMissingTransactions ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Check Missing Transactions (Dry Run)
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleFixMissingTransactions(false)}
                  disabled={fixingMissingTransactions}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-green-300"
                >
                  {fixingMissingTransactions ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaMedal className="mr-2" />
                      Fix Missing Transactions
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-md font-medium mb-2">Fix Specific User:</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedUserId('5c4d400d-ac19-45aa-ad67-ecffb2831b9d');
                      handleFixMissingTransactions(false);
                    }}
                    disabled={fixingMissingTransactions}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-orange-300"
                  >
                    <FaMedal className="mr-2" />
                    Fix User 5c4d400d-ac19-45aa-ad67-ecffb2831b9d
                  </button>

                  <button
                    onClick={() => {
                      setSelectedUserId('5c4d400d-ac19-45aa-ad67-ecffb2831b9d');
                      // Call with force creation option
                      handleForceCreateMissingTransaction();
                    }}
                    disabled={fixingMissingTransactions}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-red-300"
                  >
                    <FaExclamationTriangle className="mr-2" />
                    Force Create Transaction
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This user was reported to have won 2 contests but only has 1
                  contest_win transaction. The "Force Create" option will create
                  new transactions regardless of any existing ones.
                </p>
              </div>
            </div>

            {missingTransactionsResult && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  Missing Transaction Results
                </h3>

                <div
                  className={`p-4 mb-4 rounded-lg ${
                    missingTransactionsResult.success
                      ? 'bg-green-50'
                      : 'bg-red-50'
                  }`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {missingTransactionsResult.success ? (
                        <FaCheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm ${
                          missingTransactionsResult.success
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {missingTransactionsResult.message ||
                          (missingTransactionsResult.success
                            ? `Found ${missingTransactionsResult.missingTransactions} missing transactions out of ${missingTransactionsResult.totalWinningEntries} winning entries`
                            : 'Error processing missing transactions')}
                      </p>
                    </div>
                  </div>
                </div>

                {missingTransactionsResult.details &&
                  missingTransactionsResult.details.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">
                        Missing Transactions Found:
                      </h3>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contest
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Win Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {missingTransactionsResult.details.map(
                              (item, index) => (
                                <tr key={index}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.userName} (
                                    {item.userId.substring(0, 8)}...)
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.contestName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.rank}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                    ₹{item.winAmount}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {missingTransactionsResult.processed &&
                  missingTransactionsResult.processed.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Actions Performed:</h3>
                      <ul className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-sm">
                        {missingTransactionsResult.processed.map(
                          (action, index) => (
                            <li
                              key={index}
                              className={`${
                                action.status === 'error' ? 'text-red-600' : ''
                              }`}
                            >
                              {action.message}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Transaction Cleanup Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Clean Up Duplicate Transactions
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This tool will remove duplicate contest win transactions
                    from the database. It will keep the oldest transaction for
                    each contest win and delete any duplicates. This action
                    cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <p className="mb-4">
                Use this tool to clean up duplicate contest win transactions in
                the database. This helps ensure that each user's wallet balance
                is calculated correctly and that the transaction history doesn't
                show duplicate entries.
              </p>

              <button
                onClick={handleCleanupDuplicates}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-red-300"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTrash className="mr-2" />
                    Clean Up Duplicate Transactions
                  </>
                )}
              </button>
            </div>

            {result && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Cleanup Results</h3>

                <div
                  className={`p-4 mb-4 rounded-lg ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {result.success ? (
                        <FaCheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm ${
                          result.success ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>

                {result.duplicatesRemoved > 0 && (
                  <>
                    <p className="mb-2">
                      Removed{' '}
                      <span className="font-semibold">
                        {result.duplicatesRemoved}
                      </span>{' '}
                      duplicate transactions
                    </p>

                    {result.duplicateGroups &&
                      result.duplicateGroups.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium mb-2">
                            Duplicate Groups Cleaned Up:
                          </h3>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reference
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Duplicates Removed
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {result.duplicateGroups.map((group, index) => (
                                  <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {group.reference}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {group.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Database Schema Fix Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Fix Database Schema Issues
            </h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This tool will fix database schema issues by directly
                    modifying the database structure. Use this if you're
                    experiencing errors related to missing columns or tables.
                    Always back up your database before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <p className="mb-4">
                Use this tool to fix database schema issues when Prisma
                migrations fail. It applies direct SQL modifications to add
                missing columns or tables. Currently, this will add the missing
                substitute player columns to the MatchLineup table.
              </p>

              <button
                onClick={handleFixDatabaseSchema}
                disabled={schemaLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center disabled:bg-blue-300"
              >
                {schemaLoading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaDatabase className="mr-2" />
                    Fix Database Schema
                  </>
                )}
              </button>
            </div>

            {schemaResult && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Schema Fix Results
                </h3>

                <div
                  className={`p-4 mb-4 rounded-lg ${
                    schemaResult.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {schemaResult.success ? (
                        <FaCheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm ${
                          schemaResult.success
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {schemaResult.message}
                      </p>
                    </div>
                  </div>
                </div>

                {schemaResult.results && schemaResult.results.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Operations Performed:</h3>
                    <ul className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-sm">
                      {schemaResult.results.map((item, index) => (
                        <li
                          key={index}
                          className={`${
                            item.includes('Error') ? 'text-red-600' : ''
                          }`}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminProtected>
    </MainLayout>
  );
}
