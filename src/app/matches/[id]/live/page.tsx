'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import EmptyState from '@/components/EmptyState';
import { FaSync, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

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
}

interface UserTeam {
  id: string;
  name: string;
  captainId: string;
  viceCaptainId: string;
  currentPoints: number;
  players: {
    id: string;
    name: string;
    image?: string;
    role?: string;
    teamName?: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    currentPoints: number;
  }[];
}

interface LiveScore {
  teamAScore: string;
  teamBScore: string;
  currentInnings: number;
  overs: string;
  currentBatsman1: string;
  currentBatsman1Score: string;
  currentBatsman2: string;
  currentBatsman2Score: string;
  currentBowler: string;
  currentBowlerFigures: string;
  lastWicket: string;
  recentOvers: string;
  commentary: string[];
}

export default function LiveMatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : '';

  const [match, setMatch] = useState<Match | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [refreshingPoints, setRefreshingPoints] = useState(false);

  // Fetch match details and user teams
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

        // Fetch match details
        const matchResponse = await fetch(`/api/matches/${matchId}`);

        if (!matchResponse.ok) {
          if (matchResponse.status === 404) {
            throw new Error(
              "Match not found. It may have been removed or doesn't exist."
            );
          }
          throw new Error(
            `Failed to fetch match details: HTTP ${matchResponse.status}`
          );
        }

        const matchData = await matchResponse.json();

        if (matchData.success && matchData.data) {
          setMatch(matchData.data);

          // If match is not live, show appropriate message
          if (matchData.data.status !== 'live') {
            if (matchData.data.status === 'upcoming') {
              setError(
                'This match has not started yet. Check back later for live updates.'
              );
            } else {
              setError(
                'This match has been completed. View the results page for full details.'
              );
            }
            setLoading(false);
            return;
          }

          // Try to fetch live score data (this API might not exist yet)
          try {
            const liveResponse = await fetch(
              `/api/matches/${matchId}/live`
            ).catch(() => null);

            if (liveResponse && liveResponse.ok) {
              const liveData = await liveResponse.json();
              if (liveData.success && liveData.data) {
                setLiveScore(liveData.data);
              } else {
                // Generate simulated live data for demo purposes
                generateSimulatedLiveData(matchData.data);
              }
            } else {
              // Generate simulated live data for demo purposes
              generateSimulatedLiveData(matchData.data);
            }
          } catch (e) {
            console.error(
              'Error fetching live data, generating simulated data',
              e
            );
            // Generate simulated live data for demo purposes
            generateSimulatedLiveData(matchData.data);
          }

          // Fetch user teams if logged in
          if (session?.user) {
            try {
              const teamsResponse = await fetch(
                `/api/user/matches/${matchId}/live-teams`
              );

              if (teamsResponse.ok) {
                const teamsData = await teamsResponse.json();
                if (teamsData.success && teamsData.data) {
                  setUserTeams(teamsData.data);
                  // Set first team as active by default
                  if (teamsData.data.length > 0) {
                    setActiveTeamId(teamsData.data[0].id);
                  }
                }
              } else {
                console.error(
                  'Failed to fetch user teams:',
                  teamsResponse.status
                );
                generateSimulatedTeamData(matchData.data);
              }
            } catch (e) {
              console.error('Error fetching user teams', e);
              generateSimulatedTeamData(matchData.data);
            }
          }
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to fetch match data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();

    // Set up polling to refresh team points
    const liveDataInterval = setInterval(async () => {
      if (match?.status === 'live' && session?.user) {
        try {
          console.log('Auto-refreshing team points...');
          // Fetch fresh team points data
          const teamsResponse = await fetch(
            `/api/user/matches/${matchId}/live-teams`
          );

          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            if (teamsData.success && teamsData.data) {
              // Check if points have changed
              if (userTeams.length > 0 && teamsData.data.length > 0) {
                const oldPoints = userTeams[0].currentPoints;
                const newPoints = teamsData.data[0].currentPoints;

                if (Math.abs(newPoints - oldPoints) > 0.1) {
                  console.log(
                    `Team points updated: ${oldPoints.toFixed(
                      1
                    )} → ${newPoints.toFixed(1)} (${
                      newPoints - oldPoints > 0 ? '+' : ''
                    }${(newPoints - oldPoints).toFixed(1)})`
                  );
                }
              }

              setUserTeams(teamsData.data);
            }
          }

          // For demo purposes, still update simulated commentary
          updateSimulatedCommentary();
        } catch (error) {
          console.error('Error refreshing live data:', error);
        }
      }
    }, 20000); // Update every 20 seconds instead of 30

    return () => {
      clearInterval(liveDataInterval);
    };
  }, [matchId, session]);

  // Generate simulated live score data for demo purposes
  const generateSimulatedLiveData = (matchData: Match) => {
    setLiveScore({
      teamAScore: '156/4',
      teamBScore: 'Yet to bat',
      currentInnings: 1,
      overs: '18.2',
      currentBatsman1: 'Player 1',
      currentBatsman1Score: '62 (48)',
      currentBatsman2: 'Player 2',
      currentBatsman2Score: '29 (21)',
      currentBowler: 'Bowler 1',
      currentBowlerFigures: '2/34',
      lastWicket: 'Player 3 b Bowler 2 45 (36)',
      recentOvers: '1 4 0 W 2 1 | 4 6 0 1 2 0',
      commentary: [
        '18.2: Dot ball, good length delivery',
        '18.1: FOUR! Struck beautifully through covers',
        '17.6: Single taken with a push to mid-off',
        '17.5: Two runs with a drive through point',
        '17.4: DOT BALL. Defended back to the bowler',
        '17.3: FOUR! Pulled away through midwicket',
      ],
    });

    // Also generate simulated user team data if no real data exists
    if (session?.user && userTeams.length === 0) {
      setUserTeams([
        {
          id: 'simulated-team-1',
          name: 'My Dream Team',
          captainId: 'player-1',
          viceCaptainId: 'player-2',
          currentPoints: 186,
          players: Array(11)
            .fill(null)
            .map((_, i) => ({
              id: `player-${i + 1}`,
              name: `Player ${i + 1}`,
              role: i < 4 ? 'Batsman' : i < 8 ? 'Bowler' : 'All-Rounder',
              teamName: i % 2 === 0 ? matchData.teamAName : matchData.teamBName,
              isCaptain: i === 0,
              isViceCaptain: i === 1,
              currentPoints: Math.floor(Math.random() * 40) + 5,
            })),
        },
      ]);
      setActiveTeamId('simulated-team-1');
    }
  };

  // Generate simulated team data if user doesn't have any teams
  const generateSimulatedTeamData = (matchData: Match) => {
    if (userTeams.length === 0) {
      setUserTeams([
        {
          id: 'simulated-team-1',
          name: 'My Dream Team',
          captainId: 'player-1',
          viceCaptainId: 'player-2',
          currentPoints: 186,
          players: Array(11)
            .fill(null)
            .map((_, i) => ({
              id: `player-${i + 1}`,
              name: `Player ${i + 1}`,
              role: i < 4 ? 'Batsman' : i < 8 ? 'Bowler' : 'All-Rounder',
              teamName: i % 2 === 0 ? matchData.teamAName : matchData.teamBName,
              isCaptain: i === 0,
              isViceCaptain: i === 1,
              currentPoints: Math.floor(Math.random() * 40) + 5,
            })),
        },
      ]);
      setActiveTeamId('simulated-team-1');
    }
  };

  // Update only the commentary for UI freshness
  const updateSimulatedCommentary = () => {
    if (!liveScore) return;

    // Generate new commentary
    const newCommentary = [
      `${parseInt(liveScore.overs) + 0.1}: ${
        Math.random() > 0.7 ? 'FOUR! ' : ''
      }${getRandomCommentary()}`,
    ];

    // Update the live score with simulated new data
    setLiveScore((prev) => {
      if (!prev) return null;

      // Parse the current over
      const [overs, balls] = prev.overs.split('.').map(Number);
      let newBalls = balls + 1;
      let newOvers = overs;

      if (newBalls >= 6) {
        newBalls = 0;
        newOvers += 1;
      }

      return {
        ...prev,
        overs: `${newOvers}.${newBalls}`,
        commentary: [...newCommentary, ...prev.commentary.slice(0, 5)],
      };
    });
  };

  // Random commentary generator
  const getRandomCommentary = () => {
    const commentaries = [
      'Good length delivery, pushed to cover for a single',
      'Short ball, pulled away smartly',
      'Dot ball, defended back to the bowler',
      'Full toss, driven through the covers',
      'Yorker, dug out for a single',
      'Bouncer, ducked under it',
      'Wide outside off stump, left alone',
      'Good fielding at the boundary saves a run',
      'Appeal for LBW, but umpire shakes his head',
      'Inside edge, lucky not to be bowled',
    ];
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  };

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

  // Get default image when player image is not available
  const getDefaultPlayerImage = (name: string) => {
    if (!name)
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">NA</text></svg>`;

    // Generate initials from name
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%234f46e5"/><text x="50%" y="50%" font-family="Arial" font-size="35" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  };

  // Modify the refreshPlayerPoints function to add better feedback and logging
  const refreshPlayerPoints = async () => {
    if (!matchId || refreshingPoints) return;

    setRefreshingPoints(true);
    toast.loading('Refreshing points...', { id: 'refreshPoints' });

    try {
      console.log('Manually refreshing player points...');
      // Call the update-scores API which now also updates contest points
      const response = await fetch(`/api/matches/${matchId}/update-scores`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Score update response:', result);

        if (result.success) {
          // If successful, fetch the updated team data
          console.log(
            'Successfully updated scores and contest points, fetching team data...'
          );
          const teamsResponse = await fetch(
            `/api/user/matches/${matchId}/live-teams?forceUpdate=true`
          );

          if (teamsResponse.ok) {
            const teamsData = await teamsResponse.json();
            if (teamsData.success && teamsData.data) {
              console.log(
                `Received updated team data with ${teamsData.data.length} teams`
              );

              // Log the point changes to help with debugging
              if (userTeams.length > 0 && teamsData.data.length > 0) {
                const oldPoints = userTeams[0].currentPoints;
                const newPoints = teamsData.data[0].currentPoints;
                const diff = newPoints - oldPoints;
                const changeText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;

                // Log team points update
                const oldPointsFormatted = oldPoints.toFixed(1);
                const newPointsFormatted = newPoints.toFixed(1);
                console.log(
                  `Team points update: ${oldPointsFormatted} -> ${newPointsFormatted} (${changeText})`
                );

                if (Math.abs(diff) > 0.1) {
                  toast.success(`Points updated! ${changeText} points`, {
                    id: 'refreshPoints',
                  });
                } else {
                  toast.success('Points refreshed', { id: 'refreshPoints' });
                }
              } else {
                toast.success('Points refreshed', { id: 'refreshPoints' });
              }

              setUserTeams(teamsData.data);
            } else {
              console.error('Failed to parse team data:', teamsData);
              toast.error('Failed to fetch updated team data', {
                id: 'refreshPoints',
              });
            }
          } else {
            console.error(
              'Failed to fetch team data:',
              await teamsResponse.text()
            );
            toast.error('Failed to refresh team data', { id: 'refreshPoints' });
          }
        } else {
          console.error('Update scores failed:', result.error);
          toast.error(result.error || 'Failed to update points', {
            id: 'refreshPoints',
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to update scores:', errorText);
        toast.error('Failed to update points', { id: 'refreshPoints' });
      }
    } catch (error) {
      console.error('Error refreshing points:', error);
      toast.error('An error occurred while refreshing points', {
        id: 'refreshPoints',
      });
    } finally {
      setRefreshingPoints(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
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
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{match.name}</h1>
            <p className="text-green-600 font-medium flex items-center">
              <span className="inline-block h-2 w-2 bg-green-600 rounded-full mr-2"></span>
              LIVE
            </p>
          </div>
        </div>

        {/* Match score card */}
        {liveScore && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="bg-green-600 text-white py-2 px-4 text-center font-medium">
              LIVE: {match.format || 'Cricket Match'} •{' '}
              {formatDate(match.startTime)}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team A */}
                <div className="flex items-center">
                  <div className="w-16 h-16 relative mr-4">
                    <Image
                      src={match.teamALogo || getDefaultLogo(match.teamAName)}
                      alt={match.teamAName}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{match.teamAName}</h3>
                    <p className="text-xl font-bold">{liveScore.teamAScore}</p>
                    {liveScore.currentInnings === 1 && (
                      <p className="text-sm text-gray-600">
                        {liveScore.overs} overs
                      </p>
                    )}
                  </div>
                </div>

                {/* Team B */}
                <div className="flex items-center">
                  <div className="w-16 h-16 relative mr-4">
                    <Image
                      src={match.teamBLogo || getDefaultLogo(match.teamBName)}
                      alt={match.teamBName}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{match.teamBName}</h3>
                    <p className="text-xl font-bold">{liveScore.teamBScore}</p>
                    {liveScore.currentInnings === 2 && (
                      <p className="text-sm text-gray-600">
                        {liveScore.overs} overs
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current batsmen and bowler */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm text-gray-500 mb-1">BATSMAN</h4>
                    <p className="font-medium">
                      {liveScore.currentBatsman1}{' '}
                      <span className="ml-2 text-sm font-bold">
                        {liveScore.currentBatsman1Score}
                      </span>
                    </p>
                    <p className="font-medium">
                      {liveScore.currentBatsman2}{' '}
                      <span className="ml-2 text-sm font-bold">
                        {liveScore.currentBatsman2Score}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 mb-1">BOWLER</h4>
                    <p className="font-medium">
                      {liveScore.currentBowler}{' '}
                      <span className="ml-2 text-sm font-bold">
                        {liveScore.currentBowlerFigures}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-500 mb-1">RECENT</h4>
                    <p className="font-medium">{liveScore.recentOvers}</p>
                  </div>
                </div>
              </div>

              {/* Commentary */}
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">Live Commentary</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {liveScore.commentary.map((comment, index) => (
                    <div
                      key={index}
                      className="mb-2 pb-2 border-b border-gray-200 last:border-0"
                    >
                      <p className="text-sm">{comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Teams Section */}
        {session?.user && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="bg-indigo-600 text-white py-2 px-4 text-center font-medium">
              Your Fantasy Teams
            </div>

            {userTeams.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">
                  You don't have any teams for this match
                </p>
              </div>
            ) : (
              <div className="p-6">
                {/* Team selector tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    {userTeams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setActiveTeamId(team.id)}
                        className={`py-2 px-3 whitespace-nowrap ${
                          activeTeamId === team.id
                            ? 'border-b-2 border-indigo-600 text-indigo-600'
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {team.name}{' '}
                        <span className="ml-1 font-bold text-green-600">
                          {team.currentPoints}pts
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Active team display */}
                {activeTeamId && (
                  <div>
                    {userTeams
                      .filter((team) => team.id === activeTeamId)
                      .map((team) => (
                        <div key={team.id}>
                          <div className="bg-green-50 p-4 rounded-lg mb-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold">{team.name}</h3>
                              <p className="text-green-700 font-bold text-lg">
                                {team.currentPoints} pts
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {team.players.map((player) => (
                              <div
                                key={player.id}
                                className="bg-gray-50 rounded-lg p-3 text-center relative"
                              >
                                {(player.isCaptain || player.isViceCaptain) && (
                                  <div
                                    className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold ${
                                      player.isCaptain
                                        ? 'bg-red-600'
                                        : 'bg-blue-600'
                                    }`}
                                  >
                                    {player.isCaptain ? 'C' : 'VC'}
                                  </div>
                                )}
                                <div className="relative mx-auto w-12 h-12 mb-2">
                                  <Image
                                    src={
                                      player.image ||
                                      getDefaultPlayerImage(player.name)
                                    }
                                    alt={player.name}
                                    width={48}
                                    height={48}
                                    className="rounded-full"
                                  />
                                </div>
                                <p className="text-sm font-medium truncate">
                                  {player.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {player.teamName || player.role || 'Player'}
                                </p>
                                <p className="mt-1 font-medium text-green-600">
                                  {player.isCaptain
                                    ? (player.currentPoints * 2).toFixed(1)
                                    : player.isViceCaptain
                                    ? (player.currentPoints * 1.5).toFixed(1)
                                    : player.currentPoints.toFixed(1)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team Selection and Points Display */}
        {userTeams.length > 0 && !loading && !error && (
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Teams</h2>

              {/* Add refresh button here */}
              <button
                onClick={refreshPlayerPoints}
                disabled={refreshingPoints}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {refreshingPoints ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSync />
                )}
                <span>
                  {refreshingPoints ? 'Refreshing...' : 'Refresh Points'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
