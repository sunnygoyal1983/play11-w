'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import {
  FaUser,
  FaEdit,
  FaWallet,
  FaHistory,
  FaExclamationCircle,
  FaCamera,
  FaSpinner,
} from 'react-icons/fa';
import MainLayout from '@/components/MainLayout';

// Define interfaces for type safety
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dob?: string;
  panNumber?: string;
  walletBalance: number;
  image?: string;
}

interface ProfileFormData {
  name: string;
  phone?: string;
  address?: string;
  dob?: string;
  panNumber?: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'contest_join' | 'contest_win';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // New state variables for image upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch user profile data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
      fetchTransactions();
    }
  }, [status]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');

      // For demo purposes - mock data
      setUserProfile({
        id: '1',
        name: session?.user?.name || 'User',
        email: session?.user?.email || 'user@example.com',
        phone: '9876543210',
        address: 'Mumbai, India',
        dob: '1990-01-01',
        panNumber: 'ABCDE1234F',
        walletBalance: 500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/user/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);

      // For demo purposes - mock data
      setTransactions([
        {
          id: '1',
          type: 'deposit',
          amount: 200,
          description: 'Added via UPI',
          status: 'completed',
          date: '2023-06-15T10:30:00Z',
        },
        {
          id: '2',
          type: 'contest_join',
          amount: -50,
          description: 'Joined IPL Contest #123',
          status: 'completed',
          date: '2023-06-16T14:20:00Z',
        },
        {
          id: '3',
          type: 'contest_win',
          amount: 350,
          description: 'Won 3rd prize in IPL Contest #123',
          status: 'completed',
          date: '2023-06-17T09:45:00Z',
        },
      ]);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsUpdating(true);
    setError('');

    try {
      console.log('Submitting form data:', data);

      // Prepare the data for API
      const apiData = {
        ...data,
        // Convert empty strings to null for optional fields
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        panNumber: data.panNumber?.trim() || null,
        // Ensure date is in ISO format
        dob: data.dob ? new Date(data.dob).toISOString() : null,
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update local state with new data
      setUserProfile(updatedUser);
      setIsEditMode(false);
      setSuccessMessage('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditMode && userProfile) {
      // Format date for the date input (YYYY-MM-DD)
      const formattedDob = userProfile.dob
        ? new Date(userProfile.dob).toISOString().split('T')[0]
        : '';

      // Populate form with current values when entering edit mode
      reset({
        name: userProfile.name,
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        dob: formattedDob,
        panNumber: userProfile.panNumber || '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  // Handle profile image upload
  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        'Invalid file type. Please use JPG, PNG, WEBP or GIF images.'
      );
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 2MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();

      // Update user profile with new image
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          image: data.imageUrl,
        });
      }

      setSuccessMessage('Profile image updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload image'
      );
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            {userProfile && (
              <div className="bg-indigo-800 text-white px-4 py-2 rounded-md">
                <div className="flex items-center">
                  <FaWallet className="mr-2" />
                  <span className="font-bold">
                    ₹{userProfile.walletBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUser className="inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'transactions'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaHistory className="inline mr-2" />
              Transaction History
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
            <div className="flex items-center">
              <FaExclamationCircle className="text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
            <div className="flex items-center">
              <FaExclamationCircle className="text-red-500 mr-2" />
              <span className="text-red-700">{uploadError}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6">
            <div className="flex items-center">
              <FaExclamationCircle className="text-green-500 mr-2" />
              <span className="text-green-700">{successMessage}</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'profile' && userProfile && (
            <div>
              {/* Profile Image Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-2 relative">
                    {isUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
                        <FaSpinner className="animate-spin text-indigo-600 text-2xl" />
                      </div>
                    ) : userProfile.image ? (
                      <>
                        {/* Add a normal img tag as fallback */}
                        <img
                          src={userProfile.image}
                          alt={userProfile.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className =
                                'w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500';
                              fallback.innerHTML =
                                '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" height="40" width="40" xmlns="http://www.w3.org/2000/svg"><path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"></path></svg>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                        <FaUser size={40} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleImageClick}
                    className="absolute bottom-2 right-0 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isUploading}
                  >
                    <FaCamera size={14} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                </div>
                <h2 className="text-xl font-bold">{userProfile.name}</h2>
                <p className="text-gray-600 text-sm">{userProfile.email}</p>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Personal Information</h2>
                <button
                  onClick={handleEditToggle}
                  className="flex items-center bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200"
                >
                  <FaEdit className="mr-2" />
                  {isEditMode ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>

              {isEditMode ? (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        {...register('name', { required: 'Name is required' })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        {...register('phone', {
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message:
                              'Please enter a valid 10-digit phone number',
                          },
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <textarea
                        {...register('address')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        {...register('dob')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        {...register('panNumber', {
                          pattern: {
                            value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                            message: 'Please enter a valid PAN number',
                          },
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      {errors.panNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.panNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:space-x-12">
                    <div className="md:w-1/2 space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Full Name
                        </h3>
                        <p className="text-base">{userProfile.name}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Email Address
                        </h3>
                        <p className="text-base">{userProfile.email}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Phone Number
                        </h3>
                        <p className="text-base">
                          {userProfile.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="md:w-1/2 space-y-4 mt-4 md:mt-0">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Address
                        </h3>
                        <p className="text-base">
                          {userProfile.address || 'Not provided'}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Date of Birth
                        </h3>
                        <p className="text-base">
                          {userProfile.dob
                            ? new Date(userProfile.dob).toLocaleDateString(
                                'en-IN',
                                {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric',
                                }
                              )
                            : 'Not provided'}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          PAN Number
                        </h3>
                        <p className="text-base">
                          {userProfile.panNumber || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FaExclamationCircle className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          Complete your KYC to enable withdrawals. Make sure
                          your name and PAN details match.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">
                Transaction History
              </h2>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No transaction history available
                  </p>
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
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              transaction.amount > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {transaction.amount.toFixed(2)}
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
                              {transaction.status.charAt(0).toUpperCase() +
                                transaction.status.slice(1)}
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
    </MainLayout>
  );
}
