'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import Link from 'next/link';

export default function CreateContest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [formData, setFormData] = useState({
    matchId: '',
    name: '',
    entryFee: 0,
    totalSpots: 0,
    prizePool: 0,
    totalPrize: 0,
    firstPrize: 0,
    winnerPercentage: 0,
    isGuaranteed: false,
    winnerCount: 0,
    status: 'upcoming',
    filledSpots: 0
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Fetch matches for dropdown
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/admin/matches');
        if (!response.ok) throw new Error('Failed to fetch matches');
        const data = await response.json();
        setMatches(data);
      } catch (error) {
        console.error('Error fetching matches:', error);
        // Fallback to mock data if API fails
        const matchesData = [
          { id: '1', name: 'India vs Australia' },
          { id: '2', name: 'England vs South Africa' },
          { id: '3', name: 'Pakistan vs New Zealand' },
          { id: '4', name: 'West Indies vs Sri Lanka' },
          { id: '5', name: 'Bangladesh vs Afghanistan' },
        ];
        setMatches(matchesData);
      }
    };

    fetchMatches();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === 'checkbox'
        ? checked
        : type === 'number'
        ? parseFloat(value)
        : value;

    const updatedFormData = {
      ...formData,
      [name]: newValue,
    };

    // Calculate derived values when relevant fields change
    if (
      name === 'entryFee' ||
      name === 'totalSpots' ||
      name === 'winnerPercentage'
    ) {
      const entryFee = name === 'entryFee' ? newValue : formData.entryFee;
      const totalSpots = name === 'totalSpots' ? newValue : formData.totalSpots;
      const winnerPercentage =
        name === 'winnerPercentage' ? newValue : formData.winnerPercentage;

      if (entryFee > 0 && totalSpots > 0) {
        // Calculate total prize pool (entry fee * total spots)
        const totalPrizePool = entryFee * totalSpots;

        // Calculate prize pool after platform commission
        const platformCommissionPercentage = 100 - winnerPercentage; // Commission based on winning percentage
        const prizePool = Math.floor(
          totalPrizePool * (platformCommissionPercentage / 100)
        );

        // Calculate winner count based on winner percentage (rounded down)
        const winnerCount =
          Math.floor((winnerPercentage / 100) * totalSpots) || 0;

        // Calculate first prize (assuming equal distribution among winners)
        const firstPrize =
          winnerCount > 0 ? Math.floor(prizePool / winnerCount) : 0;

        updatedFormData.winnerCount = winnerCount;
        updatedFormData.totalPrize = prizePool;
        updatedFormData.prizePool = prizePool;
        updatedFormData.firstPrize = firstPrize;
      }
    }

    setFormData(updatedFormData);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.matchId) newErrors.matchId = 'Match is required';
    if (!formData.name) newErrors.name = 'Contest name is required';
    if (formData.entryFee < 0)
      newErrors.entryFee = 'Entry fee cannot be negative';
    if (formData.totalSpots <= 0)
      newErrors.totalSpots = 'Total spots must be greater than 0';
    if (formData.prizePool <= 0)
      newErrors.prizePool = 'Prize pool must be greater than 0';
    if (formData.totalPrize <= 0)
      newErrors.totalPrize = 'Total prize must be greater than 0';
    if (formData.firstPrize <= 0)
      newErrors.firstPrize = 'First prize must be greater than 0';
    if (formData.winnerPercentage <= 0 || formData.winnerPercentage > 100) {
      newErrors.winnerPercentage =
        'Winner percentage must be between 1 and 100';
    }
    if (formData.winnerCount <= 0)
      newErrors.winnerCount = 'Winner count must be greater than 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contest');
      }

      // Redirect to contests list page after successful creation
      router.push('/admin/contests');
    } catch (error) {
      console.error('Error creating contest:', error);
      alert(error.message || 'Failed to create contest. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New Contest</h1>
        <Link
          href="/admin/contests"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
        >
          <FaArrowLeft className="mr-2" />
          Back to Contests
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Match Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Match <span className="text-red-500">*</span>
              </label>
              <select
                name="matchId"
                value={formData.matchId}
                onChange={handleChange}
                className={`w-full border ${
                  errors.matchId ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">Select a match</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.name}
                  </option>
                ))}
              </select>
              {errors.matchId && (
                <p className="text-red-500 text-xs mt-1">{errors.matchId}</p>
              )}
            </div>

            {/* Contest Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contest Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Grand Prize Pool"
                className={`w-full border ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Entry Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Fee (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="entryFee"
                value={formData.entryFee}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.entryFee ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.entryFee && (
                <p className="text-red-500 text-xs mt-1">{errors.entryFee}</p>
              )}
            </div>

            {/* Total Spots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Spots <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="totalSpots"
                value={formData.totalSpots}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.totalSpots ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.totalSpots && (
                <p className="text-red-500 text-xs mt-1">{errors.totalSpots}</p>
              )}
            </div>

            {/* Prize Pool */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prize Pool (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="prizePool"
                value={formData.prizePool}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.prizePool ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.prizePool && (
                <p className="text-red-500 text-xs mt-1">{errors.prizePool}</p>
              )}
            </div>

            {/* Total Prize */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Prize (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="totalPrize"
                value={formData.totalPrize}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.totalPrize ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.totalPrize && (
                <p className="text-red-500 text-xs mt-1">{errors.totalPrize}</p>
              )}
            </div>

            {/* First Prize */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Prize (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="firstPrize"
                value={formData.firstPrize}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.firstPrize ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.firstPrize && (
                <p className="text-red-500 text-xs mt-1">{errors.firstPrize}</p>
              )}
            </div>

            {/* Winner Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Winner Percentage (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="winnerPercentage"
                value={formData.winnerPercentage}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.winnerPercentage ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.winnerPercentage && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.winnerPercentage}
                </p>
              )}
            </div>

            {/* Winner Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Winner Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="winnerCount"
                value={formData.winnerCount}
                onChange={handleChange}
                placeholder="0"
                className={`w-full border ${
                  errors.winnerCount ? 'border-red-500' : 'border-gray-300'
                } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.winnerCount && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.winnerCount}
                </p>
              )}
            </div>

            {/* Is Guaranteed */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isGuaranteed"
                name="isGuaranteed"
                checked={formData.isGuaranteed}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isGuaranteed"
                className="ml-2 block text-sm text-gray-700"
              >
                Guaranteed Contest
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/admin/contests')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Create Contest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
