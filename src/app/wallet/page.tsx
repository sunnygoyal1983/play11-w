'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { FaWallet, FaMoneyBillWave, FaTrophy, FaHistory } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

// Define types for the wallet data
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: string;
  reference?: string;
  createdAt: string;
}

interface WalletData {
  totalBalance: number;
  depositedAmount: number;
  winnings: number;
  bonus: number;
  kycVerified: boolean;
  transactions: Transaction[];
}

// Declare Razorpay as a global type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Wallet() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('balance');
  const [walletData, setWalletData] = useState<WalletData>({
    totalBalance: 0,
    depositedAmount: 0,
    winnings: 0,
    bonus: 0,
    kycVerified: false,
    transactions: [],
  });
  const [addAmount, setAddAmount] = useState(500);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [withdrawalMethod, setWithdrawalMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<string>('all');
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      fetchWalletData();
    }
  }, [session]);

  useEffect(() => {
    // Update withdraw amount when winnings change
    setWithdrawAmount(walletData.winnings);
  }, [walletData.winnings]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/wallet');

      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }

      const data = await response.json();
      setWalletData(data);

      // Check if user has bank details set up
      const profileResponse = await fetch('/api/user/profile');
      const profileData = await profileResponse.json();
      setHasBankDetails(
        !!(
          profileData.bankName &&
          profileData.accountNumber &&
          profileData.ifscCode
        )
      );
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async () => {
    if (!session?.user) {
      toast.error('Please sign in to add money');
      return;
    }

    if (addAmount < 100) {
      toast.error('Minimum amount should be ₹100');
      return;
    }

    try {
      setProcessing(true);

      // Create Razorpay order
      const response = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: addAmount }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Payment order creation failed:', error);
        throw new Error(error.error || 'Failed to create payment order');
      }

      const data = await response.json();

      // Initialize Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch(
              '/api/payments/razorpay/verify',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  transactionId: data.transaction.id,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success(
                'Payment successful! Your wallet has been updated.'
              );
              fetchWalletData();
            } else {
              toast.error(
                'Payment verification failed. Please contact support.'
              );
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            toast.error('Payment verification failed. Please try again later.');
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: session.user.name,
          email: session.user.email,
        },
        theme: {
          color: '#4F46E5', // Indigo-600
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error processing payment:', error);
      let errorMessage = 'Failed to process payment';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      toast.error(errorMessage);
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawalMethod) {
      toast.error('Please select a withdrawal method');
      return;
    }

    if (withdrawalMethod === 'bank' && !hasBankDetails) {
      toast.error(
        'Please add your bank account details in your profile before withdrawing'
      );
      return;
    }

    if (withdrawAmount < 100) {
      toast.error('Minimum withdrawal amount is ₹100');
      return;
    }

    if (withdrawAmount > walletData.winnings) {
      toast.error('Insufficient winning balance');
      return;
    }

    setProcessing(true);

    // Display a loading toast
    toast.info(
      `Processing withdrawal of ₹${withdrawAmount} via ${withdrawalMethod}...`
    );

    // Simulating successful withdrawal for demonstration
    toast.success(`Withdrawal of ₹${withdrawAmount} initiated!`);
    // In a real implementation, you would call your API here

    // Reset form after success
    setWithdrawAmount(0);
    setWithdrawalMethod('');
    setTimeout(() => {
      setProcessing(false);
      fetchWalletData(); // Refresh wallet data
    }, 1500);
  };

  const formatTransactionDescription = (transaction: Transaction): string => {
    if (transaction.reference) {
      if (transaction.type === 'contest_win') {
        // First try the standard format
        const standardMatch = transaction.reference.match(
          /Contest Win: (.+) - Rank (\d+)/
        );

        if (standardMatch) {
          const [_, contestName, rank] = standardMatch;
          return `Won ${
            rank === '1'
              ? '1st'
              : rank === '2'
              ? '2nd'
              : rank === '3'
              ? '3rd'
              : `${rank}th`
          } place in "${contestName}"`;
        }

        // If standard format fails, try to extract just the contest name
        if (transaction.reference.includes('Contest Win:')) {
          const contestName = transaction.reference
            .replace('Contest Win:', '')
            .trim();
          return `Won contest "${contestName}"`;
        }

        // For other formats just return the reference
        return `Contest winnings: ${transaction.reference}`;
      }
      return transaction.reference;
    }

    switch (transaction.type) {
      case 'deposit':
        return 'Added to wallet';
      case 'withdrawal':
        return 'Withdrawn from wallet';
      case 'contest_join':
        return 'Joined a contest';
      case 'contest_win':
        return 'Contest winnings';
      case 'bonus':
        return 'Bonus added';
      default:
        return transaction.type;
    }
  };

  // Filter transactions based on the selected type
  const filteredTransactions = walletData.transactions.filter(
    (transaction) =>
      transactionFilter === 'all' || transaction.type === transactionFilter
  );

  if (loading && !walletData.transactions.length) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Wallet</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center mb-2">
              <FaWallet className="mr-2" size={24} />
              <h2 className="text-xl font-semibold">Total Balance</h2>
            </div>
            <div className="text-3xl font-bold">
              ₹{walletData.totalBalance.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-gray-200">
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Deposited</p>
              <p className="text-xl font-semibold">
                ₹{walletData.depositedAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Winnings</p>
              <p className="text-xl font-semibold text-green-600">
                ₹{walletData.winnings.toLocaleString()}
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Bonus</p>
              <p className="text-xl font-semibold text-indigo-600">
                ₹{walletData.bonus.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-3 px-4 font-medium flex items-center ${
                activeTab === 'balance'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('balance')}
            >
              <FaMoneyBillWave className="mr-2" />
              Add Money
            </button>
            <button
              className={`py-3 px-4 font-medium flex items-center ${
                activeTab === 'withdraw'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('withdraw')}
            >
              <FaTrophy className="mr-2" />
              Withdraw
            </button>
            <button
              className={`py-3 px-4 font-medium flex items-center ${
                activeTab === 'transactions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              <FaHistory className="mr-2" />
              Transactions
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'balance' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Add Money to Wallet
                </h3>
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter amount"
                    min="100"
                    step="100"
                    value={addAmount}
                    onChange={(e) =>
                      setAddAmount(parseInt(e.target.value) || 0)
                    }
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[100, 200, 500, 1000, 2000].map((amount) => (
                      <button
                        key={amount}
                        className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                        onClick={() => setAddAmount(amount)}
                      >
                        ₹{amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">Payment Methods</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="razorpay"
                        name="payment"
                        className="mr-2"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                      />
                      <label htmlFor="razorpay" className="flex items-center">
                        Razorpay
                        <img
                          src="/razorpay-logo.svg"
                          alt="Razorpay"
                          className="h-5 ml-2"
                          onError={(e) =>
                            (e.currentTarget.style.display = 'none')
                          }
                        />
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="upi"
                        name="payment"
                        className="mr-2"
                        checked={paymentMethod === 'upi'}
                        onChange={() => setPaymentMethod('upi')}
                      />
                      <label htmlFor="upi">UPI</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="card"
                        name="payment"
                        className="mr-2"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                      />
                      <label htmlFor="card">Credit/Debit Card</label>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddMoney}
                  disabled={addAmount < 100 || processing}
                >
                  {processing ? 'Processing...' : 'Add Money'}
                </button>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Withdraw Winnings
                </h3>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="font-medium text-green-800">
                    Available for withdrawal: ₹
                    {walletData.winnings.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Only winnings can be withdrawn. Deposited amount can be used
                    to join contests.
                  </p>
                </div>

                {!walletData.kycVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="font-medium text-yellow-800">
                      KYC verification required
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please complete your KYC verification to withdraw funds.
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <label
                    htmlFor="withdraw-amount"
                    className="block text-gray-700 mb-2"
                  >
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    id="withdraw-amount"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter amount"
                    min="100"
                    max={walletData.winnings}
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(parseInt(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="account" className="block text-gray-700 mb-2">
                    Withdrawal Method
                  </label>
                  <select
                    id="account"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={withdrawalMethod}
                    onChange={(e) => setWithdrawalMethod(e.target.value)}
                  >
                    <option value="">Select withdrawal method</option>
                    <option value="bank">Bank Account</option>
                    <option value="upi">UPI</option>
                    <option value="paytm">Paytm</option>
                  </select>
                </div>

                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleWithdraw}
                  disabled={
                    !walletData.kycVerified ||
                    withdrawAmount <= 0 ||
                    withdrawAmount > walletData.winnings ||
                    !withdrawalMethod ||
                    processing
                  }
                >
                  {processing ? 'Processing...' : 'Withdraw'}
                </button>

                {withdrawalMethod === 'bank' && !hasBankDetails && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                    <p>
                      Your bank details are not set up. Please update your bank
                      information in the profile section before making a
                      withdrawal.
                    </p>
                    <button
                      className="mt-1 text-indigo-600 hover:text-indigo-800 font-medium"
                      onClick={() => router.push('/profile')}
                    >
                      Go to profile settings
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Transaction History
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        transactionFilter === 'all'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setTransactionFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        transactionFilter === 'deposit'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setTransactionFilter('deposit')}
                    >
                      Deposits
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        transactionFilter === 'contest_join'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setTransactionFilter('contest_join')}
                    >
                      Contest Entries
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        transactionFilter === 'contest_win'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setTransactionFilter('contest_win')}
                    >
                      Winnings
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        transactionFilter === 'withdrawal'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100'
                      }`}
                      onClick={() => setTransactionFilter('withdrawal')}
                    >
                      Withdrawals
                    </button>
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTransactionDescription(transaction)}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                transaction.amount > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {transaction.amount > 0 ? '+' : ''}
                              {transaction.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  transaction.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
