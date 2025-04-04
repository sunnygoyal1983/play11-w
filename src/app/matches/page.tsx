'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';

interface Match {
  id: string;
  name: string;
  format: string | null;
  venue: string | null;
  startTime: string;
  teamAName: string;
  teamALogo: string | null;
  teamBName: string;
  teamBLogo: string | null;
  status: string;
}

export default function Matches() {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    // Fetch matches from API
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch from database via API
        const response = await fetch(`/api/matches?type=${activeTab}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch matches');
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setMatches(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch matches'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [activeTab]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
      ' · ' +
      date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  // Get default image when logo is not available
  const getDefaultLogo = (teamName: string) => {
    // Generate initials from team name
    const initials = teamName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Cricket Matches</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'upcoming'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'live'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('live')}
          >
            Live
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'completed'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          // Error state
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => setActiveTab(activeTab)} // Retry the current tab
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : matches.length === 0 ? (
          // Empty state
          <EmptyState
            title={`No ${activeTab} matches available`}
            description="Check back later for upcoming cricket matches"
            imageUrl="/empty-matches.svg"
          />
        ) : (
          // Match cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <Link href={`/matches/${match.id}`} key={match.id}>
                <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">
                        {match.format || 'N/A'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(match.startTime)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{match.name}</h3>
                    <p className="text-sm text-gray-600">
                      {match.venue || 'Venue TBA'}
                    </p>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 relative">
                        <Image
                          src={
                            match.teamALogo || getDefaultLogo(match.teamAName)
                          }
                          alt={match.teamAName}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getDefaultLogo(
                              match.teamAName
                            );
                          }}
                        />
                      </div>
                      <span className="mt-2 font-medium text-center">
                        {match.teamAName}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-xl font-bold">VS</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 relative">
                        <Image
                          src={
                            match.teamBLogo || getDefaultLogo(match.teamBName)
                          }
                          alt={match.teamBName}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getDefaultLogo(
                              match.teamBName
                            );
                          }}
                        />
                      </div>
                      <span className="mt-2 font-medium text-center">
                        {match.teamBName}
                      </span>
                    </div>
                  </div>

                  <div className="bg-indigo-600 text-white p-3 text-center">
                    {match.status === 'upcoming' && <span>Create Team</span>}
                    {match.status === 'live' && <span>View Live Score</span>}
                    {match.status === 'completed' && <span>View Results</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
