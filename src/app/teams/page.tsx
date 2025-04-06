'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';

interface Team {
  id: string;
  name: string;
  matchId: string;
  matchName: string;
  captainId: string;
  captainName: string;
  viceCaptainId: string;
  viceCaptainName: string;
  createdAt: string;
  contestsJoined: number;
  points: number;
  rank: string;
  status: 'upcoming' | 'live' | 'completed';
}

export default function Teams() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch teams from the API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/teams');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch teams');
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTeams(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch teams'
        );
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchTeams();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

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
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <button
                  className="mt-2 text-red-700 underline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not authenticated state
  if (status === 'unauthenticated') {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Please sign in to view your teams"
            description="Sign in to create fantasy teams and join contests"
            imageUrl="/empty-teams.svg"
            actionLabel="Sign In"
            actionUrl="/auth/signin"
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Teams</h1>
          <Link
            href="/matches"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Create New Team
          </Link>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            title="You haven't created any teams yet"
            description="Create your first fantasy team and join contests to win big!"
            imageUrl="/empty-teams.svg"
            actionLabel="Browse Matches"
            actionUrl="/matches"
          />
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="bg-gray-50 p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{team.name}</h3>
                    <span className="text-sm text-gray-500">
                      Created {new Date(team.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{team.matchName}</p>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Captain</p>
                      <p className="font-medium">{team.captainName}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Vice Captain</p>
                      <p className="font-medium">{team.viceCaptainName}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Contests Joined</p>
                      <p className="font-medium">{team.contestsJoined}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/teams/${team.id}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                      >
                        View Team
                      </Link>
                      {team.status === 'upcoming' && (
                        <>
                          <Link
                            href={`/teams/${team.id}/edit`}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                          >
                            Edit Team
                          </Link>
                          <Link
                            href={`/contests?matchId=${team.matchId}`}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Join Contest
                          </Link>
                        </>
                      )}
                      {team.status === 'live' && (
                        <Link
                          href={`/matches/${team.matchId}/live`}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Live Score
                        </Link>
                      )}
                    </div>

                    {/* Show points and rank for all teams that have joined contests */}
                    {team.contestsJoined > 0 && (
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-gray-600 text-sm">Points:</span>
                          <span
                            className={`font-medium ml-1 ${
                              team.status === 'live' ? 'text-green-600' : ''
                            }`}
                          >
                            {team.points || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 text-sm">Rank:</span>
                          <span
                            className={`font-medium ml-1 ${
                              team.status === 'live' ? 'text-green-600' : ''
                            }`}
                          >
                            {team.rank || '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
