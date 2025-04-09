'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaPlus,
  FaChevronRight,
  FaCrown,
  FaStar,
  FaExclamationCircle,
} from 'react-icons/fa';
import MainLayout from '@/components/MainLayout';

export default function ContestJoinPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Improve matchId extraction with better error handling
  const urlMatchId = searchParams?.get('matchId')?.split('/')[0] || null;
  const [matchId, setMatchId] = useState<string | null>(urlMatchId);
  const [matchIdError, setMatchIdError] = useState<boolean>(false);

  const [contest, setContest] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch contest details and try to get matchId if not in URL
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

        // If matchId is not available from URL, try to get it from contest data
        if (!matchId) {
          if (data.matchId) {
            console.log(`Setting matchId from contest data: ${data.matchId}`);
            setMatchId(data.matchId);
          } else if (data.match?.id) {
            console.log(`Setting matchId from match data: ${data.match.id}`);
            setMatchId(data.match.id);
          } else {
            console.log('No match ID found in contest or match data');
            setMatchIdError(true);
          }
        }
      } catch (err) {
        setError('Failed to load contest details');
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [params.id, matchId]);

  // Fetch teams when session and matchId are available
  useEffect(() => {
    if (!session?.user?.email || !matchId) {
      if (!session) {
        console.log('No session available, user might be logged out');
      }
      if (!matchId) {
        console.log('No matchId available in URL parameters or contest data');
      }
      return;
    }

    const fetchTeams = async () => {
      try {
        setTeamsLoading(true);
        console.log(
          `Fetching teams for match: ${matchId}, user: ${session?.user?.email}, userId: ${session?.user?.id}`
        );

        // Only use the dedicated endpoint for contest teams
        const requestUrl = `/api/contests/${params.id}/teams?matchId=${matchId}`;
        console.log(`Using dedicated contest teams endpoint: ${requestUrl}`);

        const response = await fetch(requestUrl, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            // Include a custom header with the session info for debugging
            'X-Session-User-Id': session?.user?.id || 'no-id',
            'X-Session-User-Email': session?.user?.email || 'no-email',
          },
        });

        console.log('Contest teams API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Teams data from contest teams API:', data);
          // Ensure data is an array before setting it
          setTeams(Array.isArray(data) ? data : []);
        } else {
          const errorText = await response.text();
          console.error('Contest teams API error:', response.status, errorText);
          setTeams([]);
        }
      } catch (err) {
        console.error('Error loading teams:', err);
        setTeams([]); // Set empty array in case of error
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, [session?.user?.email, matchId, params.id]);

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

  // Render missing match ID error
  if (!loading && (matchIdError || (!matchId && !loading))) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <FaExclamationCircle className="text-red-500 text-3xl mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-700 mb-2">
              Match ID Missing
            </h3>
            <p className="text-gray-700 mb-4">
              We couldn&apos;t find the match information needed to join this
              contest.
            </p>
            <Link
              href={`/contests/${params.id}`}
              className="inline-flex items-center bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
            >
              <FaChevronRight className="mr-2 transform rotate-180" /> Back to
              Contest
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

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
              {error.includes('select a team') && teams.length === 0 && (
                <div className="mt-2">
                  <p>You need to create a team first to join this contest.</p>
                  {match && (
                    <Link
                      href={`/matches/${match.id}/create-team`}
                      className="inline-flex items-center text-red-600 font-medium hover:text-red-700 mt-1"
                    >
                      <FaPlus className="mr-1" size={12} /> Create a new team
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {teamsLoading ? (
            <div className="flex flex-col justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-gray-500 mt-3">
                Loading your teams...
              </p>
            </div>
          ) : !Array.isArray(teams) || teams.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg mb-4">
              <p className="text-gray-500 mb-4">
                {teamsLoading
                  ? 'Loading teams...'
                  : "You haven't created any teams yet"}
              </p>
              {match && (
                <div className="flex flex-col space-y-3 items-center">
                  <Link
                    href={`/matches/${match.id}/create-team`}
                    className="inline-flex items-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                  >
                    <FaPlus className="mr-2" /> Create Team
                  </Link>
                  <Link
                    href={`/contests`}
                    className="inline-flex items-center text-indigo-600 py-2 px-4 rounded-lg hover:text-indigo-700"
                  >
                    <FaChevronRight className="mr-2 transform rotate-180" />{' '}
                    Back to Contests
                  </Link>
                </div>
              )}

              {/* Explanation box */}
              <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">Why am I seeing this?</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    You need to create a team for this match before joining a
                    contest
                  </li>
                  <li>Each team can participate in multiple contests</li>
                  <li>You can create multiple teams for the same match</li>
                </ul>
              </div>
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
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium flex items-center">
                      {team.name}
                      {team.contestEntries &&
                        team.contestEntries.length > 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Already in contest
                          </span>
                        )}
                    </div>
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
                  <FaChevronRight className="text-gray-400" />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleJoinContest}
            disabled={!selectedTeamId}
            className={`w-full py-3 rounded-lg flex justify-center items-center font-semibold ${
              !selectedTeamId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Join Contest
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
