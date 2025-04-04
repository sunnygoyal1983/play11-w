'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';
import {
  FaUsers,
  FaTrophy,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-toastify';

interface Match {
  id: string;
  name: string;
  format: string | null;
  venue: string | null;
  startTime: string;
  status: string;
  teamAName: string;
  teamALogo: string | null;
  teamBName: string;
  teamBLogo: string | null;
  contests?: Contest[];
}

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  filledSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  isGuaranteed: boolean;
  winnerCount: number;
}

export default function MatchDetails() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId) {
        setError('Invalid match ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching match details for ID: ${matchId}`);
        const response = await fetch(`/api/matches/${matchId}`);

        if (!response.ok) {
          if (response.status === 404) {
            console.error('Match not found:', matchId);
            setError(
              "Match not found. It may have been removed or doesn't exist."
            );
            setLoading(false);
            return;
          }

          const errorData = await response
            .json()
            .catch(() => ({ error: 'Unknown error occurred' }));
          throw new Error(
            errorData.error ||
              `Failed to fetch match details: HTTP ${response.status}`
          );
        }

        const data = await response.json().catch(() => {
          throw new Error('Invalid response format: unable to parse JSON');
        });

        if (data.success && data.data) {
          console.log('Match details fetched successfully:', data.data);
          setMatch(data.data);
        } else {
          console.error('Invalid API response format:', data);
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error fetching match details:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch match details'
        );
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date not available';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  // Format the time for display
  const formatTime = (dateString: string) => {
    try {
      if (!dateString) return 'Time not available';

      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }

      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Invalid time';
    }
  };

  // Get default image when logo is not available
  const getDefaultLogo = (teamName: string) => {
    if (!teamName)
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">NA</text></svg>`;

    // Generate initials from team name
    const initials = teamName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  };

  // Determine button text and color based on match status
  const getActionButton = () => {
    if (!match) return null;

    if (match.status === 'upcoming') {
      return (
        <Link
          href={`/matches/${match.id}/create-team`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium text-lg w-full md:w-auto text-center"
        >
          Create Team
        </Link>
      );
    } else if (match.status === 'live') {
      return (
        <Link
          href={`/matches/${match.id}/live`}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium text-lg w-full md:w-auto text-center"
        >
          View Live Score
        </Link>
      );
    } else {
      return (
        <Link
          href={`/matches/${match.id}/results`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium text-lg w-full md:w-auto text-center"
        >
          View Results
        </Link>
      );
    }
  };

  // Function to check and update match status
  const checkMatchStatus = async () => {
    if (!match) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/matches/${match.id}/check-status`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data.statusChanged) {
          toast.success(`Match status updated to: ${data.data.currentStatus}`);
          // Refresh match data
          fetchMatchDetails();
        } else {
          toast.info('Match status is already up to date');
        }
      } else {
        toast.error('Failed to update match status');
      }
    } catch (error) {
      console.error('Error checking match status:', error);
      toast.error('An error occurred while updating match status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <div className="mt-2">
                  <button
                    className="text-red-700 underline mr-4"
                    onClick={() => router.back()}
                  >
                    Go Back
                  </button>
                  <Link href="/matches" className="text-indigo-600 underline">
                    View All Matches
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Match not found
  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Match not found"
            description="The match you're looking for doesn't exist or has been removed."
            actionLabel="Browse Matches"
            actionUrl="/matches"
          />
        </div>
      </MainLayout>
    );
  }

  // Render available contests if there are any
  const renderContests = () => {
    if (!match.contests || match.contests.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Create Your Fantasy Team</h3>
          <p className="text-gray-600 mb-4">
            Build your dream team and join contests to win big!
          </p>
          <Link
            href={`/matches/${match.id}/create-team`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Create Team
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {match.contests.slice(0, 3).map((contest) => (
          <div key={contest.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">{contest.name}</h3>
              <span className="font-medium text-green-600">
                ₹{contest.prizePool.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Entry: ₹{contest.entryFee}</span>
              <span>
                {contest.filledSpots}/{contest.totalSpots} spots
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(
                    (contest.filledSpots / contest.totalSpots) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-end">
              <Link
                href={`/contests/${contest.id}?matchId=${match.id}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
              >
                Join Contest
              </Link>
            </div>
          </div>
        ))}
        {match.contests.length > 3 && (
          <div className="text-center">
            <Link
              href={`/contests?matchId=${match.id}`}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View All {match.contests.length} Contests
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button and match name */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">{match.name}</h1>
        </div>

        {/* Match info card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          {/* Match status banner */}
          <div
            className={`text-white py-2 px-4 text-center font-medium flex justify-between items-center ${
              match.status === 'upcoming'
                ? 'bg-indigo-600'
                : match.status === 'live'
                ? 'bg-green-600'
                : 'bg-blue-600'
            }`}
          >
            <span>
              {match.status === 'upcoming'
                ? 'Upcoming Match'
                : match.status === 'live'
                ? 'Live Match'
                : 'Completed Match'}
            </span>

            {/* Status update button - show only for upcoming matches */}
            {match.status === 'upcoming' &&
              new Date(match.startTime) <= new Date() && (
                <button
                  onClick={checkMatchStatus}
                  disabled={updatingStatus}
                  className="text-xs bg-white text-indigo-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {updatingStatus ? 'Updating...' : 'Check Status'}
                </button>
              )}
          </div>

          {/* Match details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Match Details</h2>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <span className="font-medium">Format:</span>{' '}
                    {match.format || 'Not specified'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Venue:</span>{' '}
                    {match.venue || 'TBA'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Date:</span>{' '}
                    {formatDate(match.startTime)}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Time:</span>{' '}
                    {formatTime(match.startTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-end">
                {getActionButton()}
              </div>
            </div>
          </div>

          {/* Teams section */}
          <div className="border-t border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Teams</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Team A */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 relative mr-4">
                    <Image
                      src={match.teamALogo || getDefaultLogo(match.teamAName)}
                      alt={match.teamAName}
                      width={80}
                      height={80}
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDefaultLogo(
                          match.teamAName
                        );
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{match.teamAName}</h3>
                    <p className="text-gray-600">Home Team</p>
                  </div>
                </div>

                {/* Team B */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-20 h-20 relative mr-4">
                    <Image
                      src={match.teamBLogo || getDefaultLogo(match.teamBName)}
                      alt={match.teamBName}
                      width={80}
                      height={80}
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getDefaultLogo(
                          match.teamBName
                        );
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{match.teamBName}</h3>
                    <p className="text-gray-600">Away Team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contests section (for upcoming matches) */}
          {match.status === 'upcoming' && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Available Contests</h2>
                <Link
                  href={`/contests?matchId=${match.id}`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All Contests
                </Link>
              </div>

              {renderContests()}
            </div>
          )}

          {/* Results section (for completed matches) */}
          {match.status === 'completed' && (
            <div className="border-t border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Match Result</h2>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">
                  View detailed match results and how your teams performed
                </p>
                <Link
                  href={`/matches/${match.id}/results`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  View Results
                </Link>
              </div>
            </div>
          )}

          {/* Live section (for live matches) */}
          {match.status === 'live' && (
            <div className="border-t border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Live Match</h2>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">
                  Watch the match live and track your team's performance
                </p>
                <Link
                  href={`/matches/${match.id}/live`}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Go to Live Match
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
