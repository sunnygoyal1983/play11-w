'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaSave,
  FaUsers,
  FaMoneyBillWave,
  FaPercent,
  FaTrophy,
} from 'react-icons/fa';
import Link from 'next/link';

// Define interfaces
interface Match {
  id: string;
  name: string;
  teamAName: string;
  teamBName: string;
  startTime: string;
}

interface ContestFormData {
  matchId: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  isGuaranteed: boolean;
  winnerCount: number;
  status: string;
  filledSpots: number;
}

interface FormErrors {
  matchId?: string;
  name?: string;
  entryFee?: string;
  totalSpots?: string;
  prizePool?: string;
  totalPrize?: string;
  firstPrize?: string;
  winnerPercentage?: string;
  winnerCount?: string;
  [key: string]: string | undefined;
}

export default function EditContest({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingContest, setLoadingContest] = useState<boolean>(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [formData, setFormData] = useState<ContestFormData>({
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
    filledSpots: 0,
  });
  const [errors, setErrors] = useState<FormErrors>({});

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
      }
    };

    // Fetch contest data
    const fetchContest = async () => {
      setLoadingContest(true);
      try {
        const response = await fetch(`/api/contests/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch contest');
        const data = await response.json();

        // Check if the contest has participants
        const hasParticipants = data.filledSpots > 0;
        setIsEditable(!hasParticipants || data.status === 'upcoming');

        setFormData({
          matchId: data.matchId,
          name: data.name,
          entryFee: data.entryFee,
          totalSpots: data.totalSpots,
          prizePool: data.prizePool,
          totalPrize: data.totalPrize,
          firstPrize: data.firstPrize,
          winnerPercentage: data.winnerPercentage,
          isGuaranteed: data.isGuaranteed,
          winnerCount: data.winnerCount,
          status: data.status,
          filledSpots: data.filledSpots,
        });
      } catch (error) {
        console.error('Error fetching contest:', error);
        alert('Failed to fetch contest data');
        router.push('/admin/contests');
      } finally {
        setLoadingContest(false);
      }
    };

    fetchMatches();
    fetchContest();
  }, [params.id, router]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

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
      const entryFee =
        name === 'entryFee' ? (newValue as number) : formData.entryFee;
      const totalSpots =
        name === 'totalSpots' ? (newValue as number) : formData.totalSpots;
      const winnerPercentage =
        name === 'winnerPercentage'
          ? (newValue as number)
          : formData.winnerPercentage;

      if (entryFee > 0 && totalSpots > 0) {
        // Calculate total prize pool (entry fee * total spots)
        const totalPrizePool = entryFee * totalSpots;

        // Platform takes a commission
        const platformCommission = 15; // 15% platform fee
        const prizePool = Math.floor(
          totalPrizePool * ((100 - platformCommission) / 100)
        );

        // Calculate winner count based on winner percentage (rounded down)
        const winnerCount =
          Math.floor((winnerPercentage / 100) * totalSpots) || 0;

        // First prize is typically 15-20% of the prize pool for larger contests
        const firstPrizePercentage =
          winnerCount > 100
            ? 15
            : winnerCount > 10
            ? 25
            : winnerCount > 1
            ? 40
            : 100;
        const firstPrize = Math.floor(prizePool * (firstPrizePercentage / 100));

        updatedFormData.winnerCount = winnerCount;
        updatedFormData.totalPrize = prizePool;
        updatedFormData.prizePool = prizePool;
        updatedFormData.firstPrize = firstPrize;
      }
    }

    setFormData(updatedFormData);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Update existing contest
      const response = await fetch(`/api/admin/contests/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contest');
      }

      // Redirect to contests list page after successful update
      router.push('/admin/contests');
    } catch (error: unknown) {
      console.error('Error updating contest:', error);
      alert(
        (error as Error)?.message ||
          'Failed to update contest. Please try again.'
      );
      setLoading(false);
    }
  };

  if (loadingContest) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-gray-700">Loading contest...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Edit Contest</h1>
          <Link
            href="/admin/contests"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Contests
          </Link>
        </div>

        {!isEditable && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
            <p className="font-medium">Warning: Limited Editing</p>
            <p className="text-sm">
              This contest already has participants or has started. Only some
              fields may be edited.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
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
                    disabled={!isEditable}
                    className={`w-full border ${
                      errors.matchId ? 'border-red-500' : 'border-gray-300'
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !isEditable ? 'bg-gray-100 opacity-75' : ''
                    }`}
                  >
                    <option value="">Select a match</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.name}
                      </option>
                    ))}
                  </select>
                  {errors.matchId && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.matchId}
                    </p>
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
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                      <FaMoneyBillWave />
                    </span>
                    <input
                      type="number"
                      name="entryFee"
                      value={formData.entryFee}
                      onChange={handleChange}
                      disabled={!isEditable}
                      placeholder="0"
                      className={`w-full border ${
                        errors.entryFee ? 'border-red-500' : 'border-gray-300'
                      } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !isEditable ? 'bg-gray-100 opacity-75' : ''
                      }`}
                    />
                  </div>
                  {errors.entryFee && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.entryFee}
                    </p>
                  )}
                </div>

                {/* Total Spots */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Spots <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                      <FaUsers />
                    </span>
                    <input
                      type="number"
                      name="totalSpots"
                      value={formData.totalSpots}
                      onChange={handleChange}
                      disabled={!isEditable}
                      placeholder="0"
                      className={`w-full border ${
                        errors.totalSpots ? 'border-red-500' : 'border-gray-300'
                      } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !isEditable ? 'bg-gray-100 opacity-75' : ''
                      }`}
                    />
                  </div>
                  {errors.totalSpots && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.totalSpots}
                    </p>
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
                    disabled={!isEditable}
                    placeholder="0"
                    className={`w-full border ${
                      errors.prizePool ? 'border-red-500' : 'border-gray-300'
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !isEditable ? 'bg-gray-100 opacity-75' : ''
                    }`}
                  />
                  {errors.prizePool && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.prizePool}
                    </p>
                  )}
                </div>

                {/* First Prize */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Prize (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                      <FaTrophy />
                    </span>
                    <input
                      type="number"
                      name="firstPrize"
                      value={formData.firstPrize}
                      onChange={handleChange}
                      placeholder="0"
                      className={`w-full border ${
                        errors.firstPrize ? 'border-red-500' : 'border-gray-300'
                      } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                  </div>
                  {errors.firstPrize && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstPrize}
                    </p>
                  )}
                </div>

                {/* Winner Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Winner Percentage (%){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                      <FaPercent />
                    </span>
                    <input
                      type="number"
                      name="winnerPercentage"
                      value={formData.winnerPercentage}
                      onChange={handleChange}
                      disabled={!isEditable}
                      placeholder="0"
                      className={`w-full border ${
                        errors.winnerPercentage
                          ? 'border-red-500'
                          : 'border-gray-300'
                      } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        !isEditable ? 'bg-gray-100 opacity-75' : ''
                      }`}
                    />
                  </div>
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
                    disabled={!isEditable}
                    placeholder="0"
                    className={`w-full border ${
                      errors.winnerCount ? 'border-red-500' : 'border-gray-300'
                    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !isEditable ? 'bg-gray-100 opacity-75' : ''
                    }`}
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

                {/* Filled Spots (Read Only) */}
                {formData.filledSpots > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filled Spots
                    </label>
                    <input
                      type="number"
                      value={formData.filledSpots}
                      disabled
                      className="w-full border border-gray-300 bg-gray-100 rounded-md px-3 py-2"
                    />
                  </div>
                )}
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Update Contest
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
