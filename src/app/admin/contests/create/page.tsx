'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FaSave } from 'react-icons/fa';
import {
  calculateContestFields,
  validateContestForm,
  recommendFirstPrizePercentage,
  adjustWinnerCount,
  ValidationError,
} from '@/utils/contest-validation';
import ContestTemplates, {
  ContestTemplate,
  CONTEST_TEMPLATES,
} from '@/components/contests/ContestTemplates';
import PrizeBreakupPreview from '@/components/contests/PrizeBreakupPreview';
import { fetchPrizeBreakupPreview, PrizeItem } from '@/utils/prize-generation';

interface Match {
  id: string;
  name: string;
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
  prizeStructure: 'topHeavy' | 'balanced' | 'distributed' | 'winnerTakesAll';
}

export default function CreateContest() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [prizeBreakup, setPrizeBreakup] = useState<PrizeItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const [formData, setFormData] = useState<ContestFormData>({
    matchId: '',
    name: '',
    entryFee: 49,
    totalSpots: 1000,
    prizePool: 0,
    totalPrize: 0,
    firstPrize: 0,
    winnerPercentage: 30,
    firstPrizePercentage: 15,
    platformCommission: 15,
    isGuaranteed: true,
    winnerCount: 0,
    status: 'upcoming',
    filledSpots: 0,
    prizeStructure: 'balanced',
  });

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

  useEffect(() => {
    // Calculate derived values when core inputs change
    updateDerivedFields();
  }, [
    formData.entryFee,
    formData.totalSpots,
    formData.winnerPercentage,
    formData.platformCommission,
    formData.firstPrizePercentage,
  ]);

  useEffect(() => {
    // Auto-generate preview when form data changes and there are no critical errors
    const criticalErrors = validationErrors.filter(
      (error) => error.severity === 'error'
    );
    if (
      criticalErrors.length === 0 &&
      formData.matchId &&
      formData.totalPrize > 0
    ) {
      generatePrizeBreakupPreview();
    }
  }, [
    formData.totalPrize,
    formData.winnerCount,
    formData.firstPrize,
    formData.prizeStructure,
    formData.matchId,
  ]);

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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Create updated form data
    let updatedData = { ...formData };

    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updatedData = { ...updatedData, [name]: checked };
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
        updatedData = { ...updatedData, [name]: 100 };
      } else {
        updatedData = {
          ...updatedData,
          [name]: value === '' ? 0 : parseFloat(value),
        };
      }
    }
    // Handle other inputs
    else {
      updatedData = { ...updatedData, [name]: value };
    }

    // Update form data
    setFormData(updatedData);

    // Special handling for match selection to immediately revalidate
    if (name === 'matchId') {
      const errors = validateContestForm(updatedData);
      setValidationErrors(errors);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: ContestTemplate) => {
    // Apply template values
    const firstPrizePercentage = recommendFirstPrizePercentage(
      Math.floor((template.winnerPercentage / 100) * template.totalSpots)
    );

    // Calculate prize pool and other derived fields
    const totalCollection = template.entryFee * template.totalSpots;
    const prizePool = Math.floor(
      totalCollection * ((100 - formData.platformCommission) / 100)
    );
    const winnerCount =
      Math.floor((template.winnerPercentage / 100) * template.totalSpots) || 1;
    const firstPrize = Math.floor(prizePool * (firstPrizePercentage / 100));

    // Apply all changes in a single update to preserve existing matchId
    const updatedFormData = {
      ...formData, // Keep existing values including matchId
      name: template.name,
      entryFee: template.entryFee,
      totalSpots: template.totalSpots,
      winnerPercentage: template.winnerPercentage,
      isGuaranteed: template.isGuaranteed,
      prizeStructure: template.prizeStructure,
      firstPrizePercentage,
      prizePool,
      totalPrize: prizePool,
      winnerCount,
      firstPrize,
    };

    // Update form data
    setFormData(updatedFormData);

    // Move to details tab
    setActiveTab('details');

    // Re-validate the form with updated data
    const errors = validateContestForm(updatedFormData);
    setValidationErrors(errors);
  };

  // Generate prize breakup preview
  const generatePrizeBreakupPreview = async () => {
    setLoadingPreview(true);

    // Log current form state for debugging
    console.log('Generating preview with:', {
      matchId: formData.matchId,
      totalPrize: formData.totalPrize,
      winnerCount: formData.winnerCount,
      entryFee: formData.entryFee,
      firstPrize: formData.firstPrize,
      prizeStructure: formData.prizeStructure,
    });

    try {
      // Make sure we have the required fields
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

      console.log('Received prize breakup data:', response);

      // Check if we have a valid array
      if (Array.isArray(response)) {
        console.log('Valid prize breakup array with length:', response.length);
        setPrizeBreakup(response);
      } else {
        console.error('Received invalid prize breakup data:', response);
        setPrizeBreakup([]);
      }
    } catch (error) {
      console.error('Error generating prize breakup preview:', error);
      alert(
        'Failed to generate prize breakup. Please try again or contact support.'
      );
      setPrizeBreakup([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    const errors = validateContestForm(formData);
    setValidationErrors(errors);

    // Check for critical errors
    const criticalErrors = errors.filter((error) => error.severity === 'error');
    if (criticalErrors.length > 0) {
      // Scroll to the first error field
      const firstErrorField = document.querySelector(
        `[name="${criticalErrors[0].field}"]`
      );
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

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

  // Helper to check for field errors
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

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Contest
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Set up a new contest for players to join.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <ContestTemplates onSelectTemplate={handleTemplateSelect} />

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
              <form onSubmit={handleSubmit} className="space-y-8">
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
                        {getFieldError('matchId')?.message}
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
                        {getFieldError('name')?.message}
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
                      step="1"
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
                      <p
                        className={`text-xs mt-1 ${
                          getFieldError('totalSpots')?.severity === 'error'
                            ? 'text-red-500'
                            : 'text-yellow-600'
                        }`}
                      >
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
                      <p
                        className={`text-xs mt-1 ${
                          getFieldError('winnerPercentage')?.severity ===
                          'error'
                            ? 'text-red-500'
                            : 'text-yellow-600'
                        }`}
                      >
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
                    {getFieldError('winnerCount') && (
                      <p
                        className={`text-xs mt-1 ${
                          getFieldError('winnerCount')?.severity === 'error'
                            ? 'text-red-500'
                            : 'text-yellow-600'
                        }`}
                      >
                        {getFieldError('winnerCount')?.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Calculated: (Winner Percentage% × Total Spots) rounded
                      down
                    </p>
                  </div>

                  {/* First Prize Amount */}
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
                </div>

                {/* Prize Breakup Preview */}
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

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Back to Templates
                  </button>

                  <div>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/contests')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md mr-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        validationErrors.some((e) => e.severity === 'error')
                      }
                      className={`${
                        loading ||
                        validationErrors.some((e) => e.severity === 'error')
                          ? 'bg-indigo-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } text-white px-4 py-2 rounded-md flex items-center`}
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
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
