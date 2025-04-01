'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { FaPlus, FaChevronRight, FaCrown, FaStar } from 'react-icons/fa';
import MainLayout from '@/components/MainLayout';

export default function ContestJoinPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [contest, setContest] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const response = await fetch(`/api/contests/${params.id}`);
        if (!response.ok) {
          throw new Error('Contest not found');
        }
        const data = await response.json();
        setContest(data);
        setMatch(data.match);
      } catch (err) {
        setError('Failed to load contest details');
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [params.id]);

  useEffect(() => {
    if (!session?.user?.email || !match?.id) return;

    const fetchTeams = async () => {
      try {
        setTeamsLoading(true);
        const response = await fetch(`/api/teams?matchId=${match.id}`);
        if (!response.ok) {
          throw new Error('Failed to load teams');
        }
        const data = await response.json();
        // Ensure data is an array before setting it
        setTeams(Array.isArray(data) ? data : []);
        console.log('Teams data:', data); // Debug log
      } catch (err) {
        console.error('Error loading teams:', err);
        setTeams([]); // Set empty array in case of error
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, [session?.user?.email, match?.id]);

  const handleJoinContest = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!selectedTeamId) {
      setError('Please select a team to join the contest');
      return;
    }

    try {
      const response = await fetch(`/api/contests/${params.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: selectedTeamId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join contest');
      }

      router.push(`/contests/${params.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error && !contest) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="p-4 text-red-500 text-center">{error}</div>
        </div>
      </MainLayout>
    );
  }

  if (!contest) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="p-4 text-center">Contest not found</div>
        </div>
      </MainLayout>
    );
  }

  // Debug output
  console.log('Teams state:', teams, Array.isArray(teams));

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        {/* Contest Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{contest.name}</h1>
          {match && (
            <div className="text-sm text-gray-600">
              {match.teamAName} vs {match.teamBName} •{' '}
              {new Date(match.startTime).toLocaleString()}
            </div>
          )}
        </div>

        {/* Contest Details Card */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600">Entry Fee</p>
              <p className="font-semibold">₹{contest.entryFee}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Prize</p>
              <p className="font-semibold">₹{contest.totalPrize}</p>
            </div>
            <div>
              <p className="text-gray-600">Spots</p>
              <p className="font-semibold">
                {contest.filledSpots}/{contest.totalSpots}
              </p>
            </div>
            <div>
              <p className="text-gray-600">First Prize</p>
              <p className="font-semibold">₹{contest.firstPrize}</p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{
                width: `${(contest.filledSpots / contest.totalSpots) * 100}%`,
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 text-center">
            {contest.totalSpots - contest.filledSpots} spots left
          </p>
        </div>

        {/* Select Team Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Team</h2>

          {error && (
            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {teamsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : !Array.isArray(teams) || teams.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg mb-4">
              <p className="text-gray-500 mb-4">
                You haven&apos;t created any teams yet
              </p>
              {match && (
                <Link
                  href={`/matches/${match.id}/create-team`}
                  className="inline-flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                >
                  <FaPlus className="mr-2" /> Create Team
                </Link>
              )}
            </div>
          ) : (
            <div className="mb-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`border p-4 rounded-lg mb-3 cursor-pointer flex justify-between items-center ${
                    selectedTeamId === team.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-gray-600">
                      {team.players &&
                        team.players.filter((p: any) => p.isCaptain).length >
                          0 && (
                          <span className="inline-flex items-center mr-3">
                            <FaCrown className="text-amber-500 mr-1" />
                            {team.players.find((p: any) => p.isCaptain)?.player
                              ?.name || 'Captain'}
                          </span>
                        )}
                      {team.players &&
                        team.players.filter((p: any) => p.isViceCaptain)
                          .length > 0 && (
                          <span className="inline-flex items-center">
                            <FaStar className="text-amber-500 mr-1" />
                            {team.players.find((p: any) => p.isViceCaptain)
                              ?.player?.name || 'Vice Captain'}
                          </span>
                        )}
                    </div>
                  </div>
                  <FaChevronRight
                    className={
                      selectedTeamId === team.id
                        ? 'text-indigo-600'
                        : 'text-gray-400'
                    }
                  />
                </div>
              ))}

              <div className="mt-4 text-center">
                {match && (
                  <Link
                    href={`/matches/${match.id}/create-team`}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                  >
                    <FaPlus className="mr-1" /> Create Another Team
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoinContest}
          disabled={
            !selectedTeamId || contest.filledSpots >= contest.totalSpots
          }
          className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
        >
          {contest.filledSpots >= contest.totalSpots
            ? 'Contest Full'
            : !Array.isArray(teams) || teams.length === 0
            ? 'Create a team to join'
            : !selectedTeamId
            ? 'Select a team to join'
            : `Join for ₹${contest.entryFee}`}
        </button>
      </div>
    </MainLayout>
  );
}
