import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { FaWallet, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaHistory, FaPlus, FaMinus } from 'react-icons/fa';
import { format } from 'date-fns';

// This would typically come from an API call
const dummyWalletData = {
  balance: 1250.75,
  transactions: [
    {
      id: 't1',
      amount: 500,
      type: 'deposit',
      status: 'completed',
      reference: 'UPI Payment',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    },
    {
      id: 't2',
      amount: 49,
      type: 'contest_join',
      status: 'completed',
      reference: 'Contest: Grand Contest (India vs Australia)',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      id: 't3',
      amount: 99,
      type: 'contest_join',
      status: 'completed',
      reference: 'Contest: Winner Takes All (India vs Australia)',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    },
    {
      id: 't4',
      amount: 1000,
      type: 'contest_win',
      status: 'completed',
      reference: 'Contest: Head to Head (England vs New Zealand)',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    },
    {
      id: 't5',
      amount: 200,
      type: 'withdrawal',
      status: 'pending',
      reference: 'Bank Transfer',
      createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    },
  ]
};

export default function Wallet() {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  
  // Filter transactions based on active tab
  const filteredTransactions = dummyWalletData.transactions.filter(transaction => {
    if (activeTab === 'deposits') return transaction.type === 'deposit';
    if (activeTab === 'withdrawals') return transaction.type === 'withdrawal';
    if (activeTab === 'contests') return transaction.type === 'contest_join' || transaction.type === 'contest_win';
    return true;
  });
  
  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <FaArrowUp className="text-green-500" />;
      case 'withdrawal':
        return <FaArrowDown className="text-red-500" />;
      case 'contest_join':
        return <FaMinus className="text-orange-500" />;
      case 'contest_win':
        return <FaPlus className="text-green-500" />;
      default:
        return <FaHistory className="text-gray-500" />;
    }
  };
  
  // Get transaction color based on type
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'contest_win':
        return 'text-green-600';
      case 'withdrawal':
      case 'contest_join':
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };
  
  // Get transaction label based on type
  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Added to wallet';
      case 'withdrawal':
        return 'Withdrawn from wallet';
      case 'contest_join':
        return 'Contest entry fee';
      case 'contest_win':
        return 'Contest winnings';
      default:
        return 'Transaction';
    }
  };
  
  // Handle add money form submission
  const handleAddMoney = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would call an API to process the payment
    alert(`Adding ₹${amount} to wallet`);
    setShowAddMoneyModal(false);
    setAmount('');
  };
  
  // Handle withdraw money form submission
  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we would call an API to process the withdrawal
    alert(`Withdrawing ₹${amount} from wallet`);
    setShowWithdrawModal(false);
    setAmount('');
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">My Wallet</h1>
        
        {/* Wallet Balance Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-indigo-600 text-white p-6">
            <div className="flex items-center mb-2">
              <FaWallet className="text-2xl mr-2" />
              <h2 className="text-xl font-semibold">Total Balance</h2>
            </div>
            <p className="text-3xl font-bold">₹{dummyWalletData.balance.toFixed(2)}</p>
          </div>
          
          <div className="p-4 flex space-x-4">
            <button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={() => setShowAddMoneyModal(true)}
            >
              <FaPlus className="mr-2" />
              Add Money
            </button>
            <button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded flex items-center justify-center"
              onClick={() => setShowWithdrawModal(true)}
            >
              <FaMinus className="mr-2" />
              Withdraw
            </button>
          </div>
        </div>
        
        {/* Transactions */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Transaction History</h2>
          </div>
          
          {/* Transaction Tabs */}
          <div className="flex border-b">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'all'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'deposits'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('deposits')}
            >
              Deposits
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'withdrawals'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('withdrawals')}
            >
              Withdrawals
            </button>
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === 'contests'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('contests')}
            >
              Contests
            </button>
          </div>
          
          {/* Transaction List */}
          <div className="divide-y">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium">{getTransactionLabel(transaction.type)}</p>
                        <p className="text-sm text-gray-500">{transaction.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'deposit' || transaction.type === 'contest_win' ? '+' : '-'}
                        ₹{transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(transaction.createdAt, 'MMM d, yyyy h:mm a')}
                      </p>
                      {transaction.status === 'pending' && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mt-1">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No transactions found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Add Money Modal */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Add Money to Wallet</h3>
            </div>
            <form onSubmit={handleAddMoney} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">Min: ₹100, Max: ₹10,000</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border rounded-lg p-3 flex items-center cursor-pointer bg-indigo-50 border-indigo-500">
                    <input
                      type="radio"
                      name="paymentMethod"
                      id="upi"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="upi" className="cursor-pointer">UPI</label>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      id="card"
                      className="mr-2"
                    />
                    <label htmlFor="card" className="cursor-pointer">Card</label>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                  onClick={() => setShowAddMoneyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded"
                >
                  Proceed to Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Withdraw Money Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Withdraw Money</h3>
            </div>
            <form onSubmit={handleWithdraw} className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  max={dummyWalletData.balance}
                  step="100"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: ₹100, Max: ₹{dummyWalletData.balance.toFixed(2)}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withdrawal Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border rounded-lg p-3 flex items-center cursor-pointer bg-indigo-50 border-indigo-500">
                    <input
                      type="radio"
                      name="withdrawalMethod"
                      id="bank"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="bank" className="cursor-pointer">Bank Transfer</label>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="withdrawalMethod"
                      id="upi-withdraw"
                      className="mr-2"
                    />
                    <label htmlFor="upi-withdraw" className="cursor-pointer">UPI</label>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
