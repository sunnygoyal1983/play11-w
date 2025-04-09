'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
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
import {
  calculateContestFields,
  validateContestForm,
  ValidationError,
} from '@/utils/contest-validation';
import PrizeBreakupPreview from '@/components/contests/PrizeBreakupPreview';
import { PrizeItem } from '@/utils/prize-generation';

// Define interfaces
interface Match {
  id: string;
  name: string;
  teamAName: string;
  teamBName: string;
  startTime: string;
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

// ContestFormData interface
interface ContestFormData {
  id: string;
  matchId: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  winnerCount: number;
  isActive: boolean;
  isPrivate: boolean;
  isMegaContest: boolean;
  allowMultipleEntries: boolean;
  maxEntriesPerUser: number;
  firstPrizePercentage: number;
  platformCommission: number;
  prizeStructure: string;
  description?: string;
  isGuaranteed: boolean;
  status: string;
  filledSpots: number;
}

export default function EditContest({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingContest, setLoadingContest] = useState<boolean>(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [prizeBreakup, setPrizeBreakup] = useState<PrizeItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const [formData, setFormData] = useState<ContestFormData>({
    id: '',
    matchId: '',
    name: '',
    entryFee: 0,
    totalSpots: 0,
    prizePool: 0,
    totalPrize: 0,
    firstPrize: 0,
    winnerPercentage: 0,
    winnerCount: 0,
    isActive: false,
    isPrivate: false,
    isMegaContest: false,
    allowMultipleEntries: false,
    maxEntriesPerUser: 1,
    firstPrizePercentage: 15,
    platformCommission: 15,
    prizeStructure: 'balanced',
    description: '',
    isGuaranteed: false,
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
        const response = await fetch(`/api/admin/contests/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch contest');
        const data = await response.json();

        // Check if the contest has participants
        const hasParticipants = data.filledSpots > 0;
        setIsEditable(!hasParticipants || data.status === 'upcoming');

        // Default values for new fields if they don't exist in the response
        const contestData = {
          ...data,
          id: data.id || '',
          firstPrizePercentage: data.firstPrizePercentage || 15,
          platformCommission: data.platformCommission || 15,
          prizeStructure: data.prizeStructure || 'balanced',
          description: data.description || '',
          isActive: data.isActive || false,
          isPrivate: data.isPrivate || false,
          isMegaContest: data.isMegaContest || false,
          allowMultipleEntries: data.allowMultipleEntries || false,
          maxEntriesPerUser: data.maxEntriesPerUser || 1,
          filledSpots: data.filledSpots || 0,
        };

        setFormData({
          id: contestData.id,
          matchId: contestData.matchId,
          name: contestData.name,
          entryFee: contestData.entryFee,
          totalSpots: contestData.totalSpots,
          prizePool: contestData.prizePool,
          totalPrize: contestData.totalPrize,
          firstPrize: contestData.firstPrize,
          winnerPercentage: contestData.winnerPercentage,
          winnerCount: contestData.winnerCount,
          isActive: contestData.isActive,
          isPrivate: contestData.isPrivate,
          isMegaContest: contestData.isMegaContest,
          allowMultipleEntries: contestData.allowMultipleEntries,
          maxEntriesPerUser: contestData.maxEntriesPerUser,
          firstPrizePercentage: contestData.firstPrizePercentage,
          platformCommission: contestData.platformCommission,
          prizeStructure: contestData.prizeStructure,
          description: contestData.description,
          isGuaranteed: contestData.isGuaranteed,
          status: contestData.status,
          filledSpots: contestData.filledSpots,
        });

        // Also fetch prize breakup
        try {
          const prizeResponse = await fetch(
            `/api/admin/contests/${params.id}/prizes`
          );
          if (prizeResponse.ok) {
            const prizeData = await prizeResponse.json();
            setPrizeBreakup(prizeData);
          }
        } catch (prizeError) {
          console.error('Error fetching prize breakup:', prizeError);
        }
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

  // Add auto-generate preview effect when form data changes
  useEffect(() => {
    console.log('Form data changed:', formData);
    const criticalErrors = validationErrors.filter(
      (error) => error.severity === 'error'
    );
    if (
      criticalErrors.length === 0 &&
      formData.matchId &&
      formData.totalPrize > 0 &&
      formData.winnerCount > 0 &&
      formData.firstPrize > 0
    ) {
      console.log('Calling generatePrizeBreakupPreview with:', formData);
      generatePrizeBreakupPreview();
    }
  }, [
    formData.totalPrize,
    formData.winnerCount,
    formData.firstPrize,
    formData.prizeStructure,
    formData.matchId,
    validationErrors,
  ]);

  // Helper for validation
  const getFieldError = (fieldName: string) => {
    return validationErrors.find((error) => error.field === fieldName);
  };

  // Helper to determine field class based on error state
  const getFieldClass = (fieldName: string) => {
    const error = getFieldError(fieldName);
    return `w-full border ${
      error
        ? error.severity === 'error'
          ? 'border-red-500'
          : 'border-yellow-500'
        : 'border-gray-300'
    } rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`;
  };

  // Update calculated fields based on core inputs
  const updateDerivedFields = () => {
    const {
      entryFee,
      totalSpots,
      winnerPercentage,
      platformCommission,
      firstPrizePercentage,
    } = formData;

    // Skip calculation if core inputs are invalid
    if (
      entryFee <= 0 ||
      totalSpots <= 0 ||
      winnerPercentage <= 0 ||
      winnerPercentage > 100 ||
      platformCommission < 0 ||
      platformCommission > 30 ||
      firstPrizePercentage <= 0 ||
      firstPrizePercentage > 100
    ) {
      return;
    }

    // Calculate derived fields
    const derivedFields = calculateContestFields(
      entryFee,
      totalSpots,
      winnerPercentage,
      platformCommission,
      firstPrizePercentage
    );

    setFormData((prev) => ({
      ...prev,
      ...derivedFields,
    }));

    // Validate the updated form
    const errors = validateContestForm({
      ...formData,
      ...derivedFields,
    });

    setValidationErrors(errors);
  };

  // Update form field values and trigger validation
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let updatedFormData = { ...formData };

    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updatedFormData = { ...updatedFormData, [name]: checked };
    }
    // Handle numeric inputs
    else if (
      [
        'entryFee',
        'totalSpots',
        'winnerPercentage',
        'platformCommission',
        'firstPrizePercentage',
      ].includes(name)
    ) {
      // For percentage fields, don't allow values over 100
      if (
        (name === 'winnerPercentage' || name === 'firstPrizePercentage') &&
        parseFloat(value) > 100
      ) {
        updatedFormData = { ...updatedFormData, [name]: 100 };
      } else {
        updatedFormData = {
          ...updatedFormData,
          [name]: value === '' ? 0 : parseFloat(value),
        };
      }
    }
    // Handle other inputs
    else {
      updatedFormData = { ...updatedFormData, [name]: value };
    }

    // Update form data
    setFormData(updatedFormData);

    // Re-validate the form
    setTimeout(() => {
      // Only calculate derived fields for certain fields
      if (
        [
          'entryFee',
          'totalSpots',
          'winnerPercentage',
          'platformCommission',
          'firstPrizePercentage',
        ].includes(name)
      ) {
        updateDerivedFields();
      } else {
        const errors = validateContestForm(updatedFormData);
        setValidationErrors(errors);
      }
    }, 0);
  };

  // Generate prize breakup preview
  const generatePrizeBreakupPreview = async () => {
    setLoadingPreview(true);

    try {
      if (
        !formData.totalPrize ||
        !formData.winnerCount ||
        !formData.firstPrize
      ) {
        console.error('Missing required fields for prize breakup');
        setPrizeBreakup([]);
        return;
      }

      const response = await fetchPrizeBreakupPreview({
        totalPrize: formData.totalPrize,
        winnerCount: formData.winnerCount,
        firstPrize: formData.firstPrize,
        entryFee: formData.entryFee,
        prizeStructure: formData.prizeStructure,
      });

      const { prizeBreakup } = response;

      if (Array.isArray(prizeBreakup)) {
        setPrizeBreakup(prizeBreakup);
      } else {
        console.error('Invalid prize breakup data:', response);
        setPrizeBreakup([]);
      }
    } catch (error) {
      console.error('Error generating prize breakup preview:', error);
      alert(
        'Failed to generate prize breakup. Please try again or contact support.'
      );
    } finally {
      setLoadingPreview(false);
    }
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
                    className={getFieldClass('matchId')}
                  >
                    <option value="">Select a match</option>
                    {matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.name}
                      </option>
                    ))}
                  </select>
                  {getFieldError('matchId') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('matchId')?.message || ''}
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
                    className={getFieldClass('name')}
                  />
                  {getFieldError('name') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('name')?.message || ''}
                    </p>
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
                    min="0"
                    className={getFieldClass('entryFee')}
                  />
                  {getFieldError('entryFee') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('entryFee')?.message}
                    </p>
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
                    min="2"
                    className={getFieldClass('totalSpots')}
                  />
                  {getFieldError('totalSpots') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('totalSpots')?.message}
                    </p>
                  )}
                </div>

                {/* Platform Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform Commission (%)
                  </label>
                  <input
                    type="number"
                    name="platformCommission"
                    value={formData.platformCommission}
                    onChange={handleChange}
                    min="0"
                    max="30"
                    className={getFieldClass('platformCommission')}
                  />
                  {getFieldError('platformCommission') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('platformCommission')?.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 15-20% for sustainable operations
                  </p>
                </div>

                {/* Prize Pool - Calculated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prize Pool (₹)
                  </label>
                  <input
                    type="number"
                    name="prizePool"
                    value={formData.prizePool}
                    readOnly
                    className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated: Entry Fee × Total Spots × (1 - Commission%)
                  </p>
                </div>

                {/* First Prize */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Prize Amount (₹){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="firstPrize"
                    value={formData.firstPrize}
                    onChange={handleChange}
                    min="0"
                    className={getFieldClass('firstPrize')}
                  />
                  {getFieldError('firstPrize') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('firstPrize')?.message}
                    </p>
                  )}
                </div>

                {/* Winner Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Winner Percentage (%)
                  </label>
                  <input
                    type="number"
                    name="winnerPercentage"
                    value={formData.winnerPercentage}
                    onChange={handleChange}
                    min="0.1"
                    max="100"
                    step="0.1"
                    className={getFieldClass('winnerPercentage')}
                  />
                  {getFieldError('winnerPercentage') && (
                    <p className="text-red-500 text-xs mt-1">
                      {getFieldError('winnerPercentage')?.message}
                    </p>
                  )}
                </div>

                {/* Winner Count - Calculated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Winner Count
                  </label>
                  <input
                    type="number"
                    name="winnerCount"
                    value={formData.winnerCount}
                    readOnly
                    className="w-full border border-gray-300 bg-gray-50 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated: (Winner Percentage% × Total Spots) rounded down
                  </p>
                </div>

                {/* Is Guaranteed */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isGuaranteed"
                      checked={formData.isGuaranteed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isGuaranteed: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Guaranteed Contest (will run even if not filled)
                    </span>
                  </label>
                </div>

                {/* Prize Structure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prize Distribution Structure
                  </label>
                  <select
                    name="prizeStructure"
                    value={formData.prizeStructure}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="topHeavy">
                      Top Heavy (bigger prizes for top ranks)
                    </option>
                    <option value="balanced">
                      Balanced (even distribution)
                    </option>
                    <option value="distributed">
                      Widely Distributed (more winners get good prizes)
                    </option>
                    <option value="winnerTakesAll">
                      Winner Takes All (first prize only)
                    </option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Determines how prize money is distributed among winners
                  </p>
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

              {/* Add Prize Distribution Preview section */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Prize Distribution Preview
                  <button
                    type="button"
                    onClick={generatePrizeBreakupPreview}
                    className="ml-4 text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1 rounded-md"
                  >
                    Refresh Preview
                  </button>
                </h3>

                {loadingPreview ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Generating prize breakup...
                    </p>
                  </div>
                ) : prizeBreakup.length > 0 ? (
                  <PrizeBreakupPreview
                    key={JSON.stringify(prizeBreakup)}
                    prizeBreakup={prizeBreakup}
                    totalPrize={formData.totalPrize}
                    winnerCount={formData.winnerCount}
                  />
                ) : (
                  <p className="text-gray-500 italic">
                    Enter all required fields to see prize breakup preview
                  </p>
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

// New helper function for fetching prize breakup preview
const fetchPrizeBreakupPreview = async (params: {
  totalPrize: number;
  winnerCount: number;
  firstPrize: number;
  entryFee: number;
  prizeStructure: string;
}): Promise<{ prizeBreakup: PrizeItem[] }> => {
  console.log('Fetching prize breakup with params:', params);

  const response = await fetch('/api/admin/preview-prize-breakup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch prize breakup preview');
  }

  const data = await response.json();
  console.log('Prize Breakup Data:', data);
  return data;
};
