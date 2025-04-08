'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowLeft,
  FaSave,
  FaTrophy,
  FaUsers,
  FaMoneyBillWave,
  FaPercent,
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
  firstPrizePercentage: number;
  platformCommission: number;
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
  platformCommission?: string;
  firstPrizePercentage?: string;
  [key: string]: string | undefined;
}

// Contest templates similar to Dream11
const contestTemplates = [
  {
    name: 'Grand Contest',
    entryFee: 49,
    totalSpots: 10000,
    winnerPercentage: 50,
    isGuaranteed: true,
    description: 'Mega prize pool with 50% winners',
  },
  {
    name: 'Winner Takes All',
    entryFee: 99,
    totalSpots: 500,
    winnerPercentage: 10,
    isGuaranteed: false,
    description: 'Top winners get bigger prizes',
  },
  {
    name: 'Small League',
    entryFee: 20,
    totalSpots: 100,
    winnerPercentage: 30,
    isGuaranteed: true,
    description: 'Small entry fee, good winning chances',
  },
  {
    name: 'Head to Head',
    entryFee: 500,
    totalSpots: 2,
    winnerPercentage: 50,
    isGuaranteed: true,
    description: '1v1 contest, winner takes all',
  },
];

export default function CreateContest() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [showTemplates, setShowTemplates] = useState<boolean>(true);
  const [formData, setFormData] = useState<ContestFormData>({
    matchId: '',
    name: '',
    entryFee: 0,
    totalSpots: 0,
    prizePool: 0,
    totalPrize: 0,
    firstPrize: 0,
    winnerPercentage: 0,
    firstPrizePercentage: 15,
    platformCommission: 15,
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

    fetchMatches();
  }, []);

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

        // Platform takes a commission (now from form data)
        const platformCommission = formData.platformCommission;
        const prizePool = Math.floor(
          totalPrizePool * ((100 - platformCommission) / 100)
        );

        // Calculate winner count based on winner percentage (rounded down)
        const winnerCount =
          Math.floor((winnerPercentage / 100) * totalSpots) || 0;

        // First prize percentage now from form data or automatic calculation
        let firstPrizePercentage = formData.firstPrizePercentage;

        // If user hasn't manually set it, calculate based on contest size
        if (!updatedFormData.firstPrizePercentage) {
          firstPrizePercentage =
            winnerCount > 100
              ? 15
              : winnerCount > 10
              ? 25
              : winnerCount > 1
              ? 40
              : 100;

          updatedFormData.firstPrizePercentage = firstPrizePercentage;
        }

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
    if (formData.platformCommission < 0 || formData.platformCommission > 30)
      newErrors.platformCommission =
        'Platform commission must be between 0 and 30';
    if (
      formData.firstPrizePercentage < 1 ||
      formData.firstPrizePercentage > 100
    )
      newErrors.firstPrizePercentage =
        'First prize percentage must be between 1 and 100';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
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
    } catch (error: unknown) {
      console.error('Error creating contest:', error);
      alert(
        (error as Error)?.message ||
          'Failed to create contest. Please try again.'
      );
      setLoading(false);
    }
  };

  const applyTemplate = (template: (typeof contestTemplates)[0]) => {
    setFormData({
      ...formData,
      name: template.name,
      entryFee: template.entryFee,
      totalSpots: template.totalSpots,
      winnerPercentage: template.winnerPercentage,
      isGuaranteed: template.isGuaranteed,
    });

    // Calculate other values based on template
    const totalPrizePool = template.entryFee * template.totalSpots;
    const platformCommission = 15; // 15% platform fee
    const prizePool = Math.floor(
      totalPrizePool * ((100 - platformCommission) / 100)
    );
    const winnerCount =
      Math.floor((template.winnerPercentage / 100) * template.totalSpots) || 0;
    const firstPrizePercentage =
      winnerCount > 100
        ? 15
        : winnerCount > 10
        ? 25
        : winnerCount > 1
        ? 40
        : 100;
    const firstPrize = Math.floor(prizePool * (firstPrizePercentage / 100));

    setFormData((prev) => ({
      ...prev,
      name: template.name,
      entryFee: template.entryFee,
      totalSpots: template.totalSpots,
      winnerPercentage: template.winnerPercentage,
      isGuaranteed: template.isGuaranteed,
      winnerCount: winnerCount,
      prizePool: prizePool,
      totalPrize: prizePool,
      firstPrize: firstPrize,
    }));

    setActiveTab('details');
    setShowTemplates(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Create New Contest
          </h1>
          <Link
            href="/admin/contests"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center"
          >
            <FaArrowLeft className="mr-2" />
            Back to Contests
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-4 px-6 text-center border-b-2 ${
                activeTab === 'templates'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <FaTrophy className="inline-block mr-2" />
              Contest Templates
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 px-6 text-center border-b-2 ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <FaUsers className="inline-block mr-2" />
              Contest Details
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'templates' && (
              <div>
                <h2 className="text-lg font-medium mb-4">Select a Template</h2>
                <p className="text-gray-600 mb-6">
                  Choose a pre-configured contest template to get started
                  quickly.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contestTemplates.map((template, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => applyTemplate(template)}
                    >
                      <h3 className="font-bold text-lg mb-1">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Entry Fee:</span>{' '}
                          <span className="font-medium">
                            ₹{template.entryFee}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Spots:</span>{' '}
                          <span className="font-medium">
                            {template.totalSpots}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Winners:</span>{' '}
                          <span className="font-medium">
                            {template.winnerPercentage}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Guaranteed:</span>{' '}
                          <span className="font-medium">
                            {template.isGuaranteed ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="mt-3 w-full bg-indigo-100 text-indigo-700 py-2 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyTemplate(template);
                        }}
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setActiveTab('details')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                  >
                    Create Custom Contest
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <form onSubmit={handleSubmit}>
                {showTemplates && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Need inspiration?</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('templates')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Choose from templates
                      </button>
                    </div>
                  </div>
                )}

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
                        placeholder="0"
                        className={`w-full border ${
                          errors.entryFee ? 'border-red-500' : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
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
                        placeholder="0"
                        className={`w-full border ${
                          errors.totalSpots
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                    {errors.totalSpots && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.totalSpots}
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
                        placeholder="0"
                        className={`w-full border ${
                          errors.winnerPercentage
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                    {errors.winnerPercentage && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.winnerPercentage}
                      </p>
                    )}
                  </div>

                  {/* Platform Commission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Commission (%){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                        <FaPercent />
                      </span>
                      <input
                        type="number"
                        name="platformCommission"
                        value={formData.platformCommission}
                        onChange={handleChange}
                        placeholder="15"
                        className={`w-full border ${
                          errors.platformCommission
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                    {errors.platformCommission && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.platformCommission}
                      </p>
                    )}
                  </div>

                  {/* First Prize Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Prize Percentage (%){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 rounded-l-md border border-r-0 border-gray-300">
                        <FaPercent />
                      </span>
                      <input
                        type="number"
                        name="firstPrizePercentage"
                        value={formData.firstPrizePercentage}
                        onChange={handleChange}
                        placeholder="15"
                        className={`w-full border ${
                          errors.firstPrizePercentage
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      />
                    </div>
                    {errors.firstPrizePercentage && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.firstPrizePercentage}
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
                      placeholder="0"
                      className={`w-full border ${
                        errors.prizePool ? 'border-red-500' : 'border-gray-300'
                      } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      readOnly
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
                          errors.firstPrize
                            ? 'border-red-500'
                            : 'border-gray-300'
                        } rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        readOnly
                      />
                    </div>
                    {errors.firstPrize && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.firstPrize}
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
                        errors.winnerCount
                          ? 'border-red-500'
                          : 'border-gray-300'
                      } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      readOnly
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
