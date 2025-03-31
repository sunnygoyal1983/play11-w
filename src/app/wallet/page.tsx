"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import MainLayout from '@/components/MainLayout';
import { FaWallet, FaMoneyBillWave, FaTrophy, FaHistory } from 'react-icons/fa';

export default function Wallet() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('balance');
  
  // Placeholder wallet data
  const walletData = {
    totalBalance: 1250,
    depositedAmount: 1000,
    winnings: 250,
    bonus: 100,
    transactions: [
      {
        id: 1,
        type: 'deposit',
        amount: 500,
        status: 'success',
        date: '2025-03-25T10:30:00Z',
        description: 'Added via UPI'
      },
      {
        id: 2,
        type: 'deposit',
        amount: 500,
        status: 'success',
        date: '2025-03-20T15:45:00Z',
        description: 'Added via Credit Card'
      },
      {
        id: 3,
        type: 'contest_join',
        amount: -100,
        status: 'success',
        date: '2025-03-22T12:15:00Z',
        description: 'Joined Grand Prize Pool Contest'
      },
      {
        id: 4,
        type: 'winning',
        amount: 250,
        status: 'success',
        date: '2025-03-23T09:10:00Z',
        description: 'Won in Winner Takes All Contest'
      }
    ]
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Wallet</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center mb-2">
              <FaWallet className="mr-2" size={24} />
              <h2 className="text-xl font-semibold">Total Balance</h2>
            </div>
            <div className="text-3xl font-bold">₹{walletData.totalBalance.toLocaleString()}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-gray-200">
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Deposited</p>
              <p className="text-xl font-semibold">₹{walletData.depositedAmount.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Winnings</p>
              <p className="text-xl font-semibold text-green-600">₹{walletData.winnings.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-1">Bonus</p>
              <p className="text-xl font-semibold text-indigo-600">₹{walletData.bonus.toLocaleString()}</p>
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
                <h3 className="text-lg font-semibold mb-4">Add Money to Wallet</h3>
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-gray-700 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    id="amount"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter amount"
                    min="100"
                    step="100"
                    defaultValue="500"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[100, 200, 500, 1000, 2000].map(amount => (
                      <button 
                        key={amount}
                        className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
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
                      <input type="radio" id="upi" name="payment" className="mr-2" defaultChecked />
                      <label htmlFor="upi">UPI</label>
                    </div>
                    <div className="flex items-center">
                      <input type="radio" id="card" name="payment" className="mr-2" />
                      <label htmlFor="card">Credit/Debit Card</label>
                    </div>
                    <div className="flex items-center">
                      <input type="radio" id="netbanking" name="payment" className="mr-2" />
                      <label htmlFor="netbanking">Net Banking</label>
                    </div>
                  </div>
                </div>
                
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded font-medium">
                  Add Money
                </button>
              </div>
            )}
            
            {activeTab === 'withdraw' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Withdraw Winnings</h3>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="font-medium text-green-800">Available for withdrawal: ₹{walletData.winnings.toLocaleString()}</p>
                  <p className="text-sm text-green-700 mt-1">Only winnings can be withdrawn. Deposited amount can be used to join contests.</p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="withdraw-amount" className="block text-gray-700 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    id="withdraw-amount"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter amount"
                    min="100"
                    max={walletData.winnings}
                    defaultValue={walletData.winnings}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="account" className="block text-gray-700 mb-2">Withdrawal Method</label>
                  <select
                    id="account"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select withdrawal method</option>
                    <option value="bank">Bank Account</option>
                    <option value="upi">UPI</option>
                    <option value="paytm">Paytm</option>
                  </select>
                </div>
                
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-medium">
                  Withdraw
                </button>
              </div>
            )}
            
            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
                
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
                      {walletData.transactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              transaction.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
