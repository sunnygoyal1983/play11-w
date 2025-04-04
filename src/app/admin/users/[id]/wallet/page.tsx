'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FaWallet,
  FaMoneyBillWave,
  FaPlus,
  FaMinus,
  FaSpinner,
  FaHistory,
} from 'react-icons/fa';

interface UserWallet {
  id: string;
  userId: string;
  balance: number;
  depositBalance: number;
  winningBalance: number;
  bonusBalance: number;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function UserWalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transaction states
  const [amount, setAmount] = useState<string>('');
  const [transactionType, setTransactionType] = useState<
    'deposit' | 'withdraw'
  >('deposit');
  const [walletType, setWalletType] = useState<'deposit' | 'winning' | 'bonus'>(
    'deposit'
  );
  const [description, setDescription] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router, userId]);

  const fetchData = async () => {
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
      if (!walletResponse.ok) {
        throw new Error('Failed to fetch wallet details');
      }
      const walletData = await walletResponse.json();
      setWallet(walletData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load user and wallet details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/wallet/transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            type: transactionType,
            walletType,
            description: description || `Admin ${transactionType}`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process transaction');
      }

      // Refetch wallet data to show updated balance
      const walletResponse = await fetch(`/api/admin/users/${userId}/wallet`);
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWallet(walletData);
      }

      setSuccess(
        `Successfully ${
          transactionType === 'deposit' ? 'added' : 'deducted'
        } ₹${amount} to user's ${walletType} balance`
      );

      // Reset form
      setAmount('');
      setDescription('');
    } catch (err: any) {
      console.error('Error processing transaction:', err);
      setError(
        err.message || 'Failed to process transaction. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 text-red-700 underline"
              onClick={() => fetchData()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !wallet) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-yellow-700">User or wallet not found</p>
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
          <Link
            href={`/admin/users/${userId}`}
            className="text-indigo-600 hover:text-indigo-800"
          >
            {user.name || user.email}
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-800">Wallet</span>
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/admin/users/${userId}/transactions`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center"
          >
            <FaHistory className="mr-2" />
            View Transactions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <FaWallet className="text-indigo-600 mr-2" />
            Wallet Summary
          </h2>

          <div className="mb-8">
            <p className="text-gray-500 text-sm">Total Balance</p>
            <p className="text-3xl font-bold text-indigo-600">
              ₹{wallet.balance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r">
              <p className="text-gray-500 text-sm">Deposit Balance</p>
              <p className="text-xl font-bold">
                ₹{wallet.depositBalance.toFixed(2)}
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 rounded-r">
              <p className="text-gray-500 text-sm">Winning Balance</p>
              <p className="text-xl font-bold">
                ₹{wallet.winningBalance.toFixed(2)}
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4 py-3 bg-yellow-50 rounded-r">
              <p className="text-gray-500 text-sm">Bonus Balance</p>
              <p className="text-xl font-bold">
                ₹{wallet.bonusBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Last updated: {new Date(wallet.updatedAt).toLocaleString()}
          </p>
        </div>

        {/* Transaction Form */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <FaMoneyBillWave className="text-indigo-600 mr-2" />
            Add/Withdraw Funds
          </h2>

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleTransaction}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Transaction Type
                </label>
                <div className="flex">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-l-md flex justify-center items-center ${
                      transactionType === 'deposit'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setTransactionType('deposit')}
                  >
                    <FaPlus className="mr-2" />
                    Deposit
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded-r-md flex justify-center items-center ${
                      transactionType === 'withdraw'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setTransactionType('withdraw')}
                  >
                    <FaMinus className="mr-2" />
                    Withdraw
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Wallet Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value as any)}
                >
                  <option value="deposit">Deposit Balance</option>
                  <option value="winning">Winning Balance</option>
                  <option value="bonus">Bonus Balance</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description / Reason
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter a description for this transaction"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={processing}
                className={`px-4 py-2 rounded-md flex items-center ${
                  transactionType === 'deposit'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {processing ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : transactionType === 'deposit' ? (
                  <>
                    <FaPlus className="mr-2" />
                    Add Funds
                  </>
                ) : (
                  <>
                    <FaMinus className="mr-2" />
                    Withdraw Funds
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">
          Balance Management Guidelines
        </h2>

        <div className="bg-gray-50 p-4 rounded-md">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Use the <strong>Deposit Balance</strong> for regular cash deposits
              made by the user.
            </li>
            <li>
              Use the <strong>Winning Balance</strong> for contest winnings and
              rewards.
            </li>
            <li>
              Use the <strong>Bonus Balance</strong> for promotional credits and
              bonuses.
            </li>
            <li>
              All transactions are recorded and can be viewed in the user&apos;s
              transaction history.
            </li>
            <li>
              Users can only withdraw from their Deposit and Winning balances,
              not from Bonus balance.
            </li>
            <li>
              For withdrawal requests, always verify the user&apos;s KYC status
              before approval.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
