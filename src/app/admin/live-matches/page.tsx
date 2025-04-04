'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import {
  FaSync,
  FaPlay,
  FaSpinner,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function LiveMatchesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulerStatus, setSchedulerStatus] = useState({
    running: false,
    loading: true,
  });
  const [updateStatus, setUpdateStatus] = useState<
    Record<string, { loading: boolean; success?: boolean }>
  >({});
  const [finalizeStatus, setFinalizeStatus] = useState<
    Record<string, { loading: boolean; success?: boolean }>
  >({});
  const [checkingMatches, setCheckingMatches] = useState(false);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  // Fetch live matches
  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/matches?status=live');

        if (response.ok) {
          const data = await response.json();
          setLiveMatches(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching live matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();

    // Refresh every 5 minutes
    const interval = setInterval(fetchLiveMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check scheduler status
  useEffect(() => {
    const checkSchedulerStatus = async () => {
      try {
        setSchedulerStatus((prev) => ({ ...prev, loading: true }));
        const response = await fetch('/api/cron/start-live-scoring');

        if (response.ok) {
          const data = await response.json();
          setSchedulerStatus({ running: data.running, loading: false });
        }
      } catch (error) {
        console.error('Error checking scheduler status:', error);
        setSchedulerStatus({ running: false, loading: false });
      }
    };

    checkSchedulerStatus();
  }, []);

  // Start the scheduler
  const startScheduler = async () => {
    try {
      setSchedulerStatus((prev) => ({ ...prev, loading: true }));
      const response = await fetch('/api/cron/start-live-scoring', {
        method: 'POST',
      });

      if (response.ok) {
        setSchedulerStatus({ running: true, loading: false });
      } else {
        setSchedulerStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error starting scheduler:', error);
      setSchedulerStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  // Manually update scores for a match
  const updateMatchScores = async (matchId: string) => {
    try {
      setUpdateStatus((prev) => ({
        ...prev,
        [matchId]: { loading: true },
      }));

      const response = await fetch(`/api/matches/${matchId}/update-scores`, {
        method: 'POST',
      });

      if (response.ok) {
        setUpdateStatus((prev) => ({
          ...prev,
          [matchId]: { loading: false, success: true },
        }));

        // Reset success status after 3 seconds
        setTimeout(() => {
          setUpdateStatus((prev) => {
            const newState = { ...prev };
            if (newState[matchId]) {
              newState[matchId] = { loading: false };
            }
            return newState;
          });
        }, 3000);
      } else {
        setUpdateStatus((prev) => ({
          ...prev,
          [matchId]: { loading: false, success: false },
        }));
      }
    } catch (error) {
      console.error(`Error updating scores for match ${matchId}:`, error);
      setUpdateStatus((prev) => ({
        ...prev,
        [matchId]: { loading: false, success: false },
      }));
    }
  };

  // Manually finalize contests for a match
  const finalizeMatchContests = async (matchId: string) => {
    try {
      setFinalizeStatus((prev) => ({
        ...prev,
        [matchId]: { loading: true },
      }));

      const response = await fetch(
        `/api/matches/${matchId}/finalize-contests`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        setFinalizeStatus((prev) => ({
          ...prev,
          [matchId]: { loading: false, success: true },
        }));

        // Reset success status after 3 seconds
        setTimeout(() => {
          setFinalizeStatus((prev) => {
            const newState = { ...prev };
            if (newState[matchId]) {
              newState[matchId] = { loading: false };
            }
            return newState;
          });
        }, 3000);
      } else {
        setFinalizeStatus((prev) => ({
          ...prev,
          [matchId]: { loading: false, success: false },
        }));
      }
    } catch (error) {
      console.error(`Error finalizing contests for match ${matchId}:`, error);
      setFinalizeStatus((prev) => ({
        ...prev,
        [matchId]: { loading: false, success: false },
      }));
    }
  };

  // Check for matches that should be live based on start time
  const checkUpcomingMatches = async () => {
    try {
      setCheckingMatches(true);
      const response = await fetch('/api/admin/check-upcoming-matches', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.updatedMatches > 0) {
          toast.success(
            `Updated ${data.updatedMatches} matches to live status`
          );
          // Refresh live matches list
          fetchLiveMatches();
        } else {
          toast.info('No matches needed to be updated');
        }
      } else {
        toast.error('Failed to check upcoming matches');
      }
    } catch (error) {
      console.error('Error checking upcoming matches:', error);
      toast.error('An error occurred while checking upcoming matches');
    } finally {
      setCheckingMatches(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Live Matches</h1>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Live Scoring System:{' '}
              {schedulerStatus.running ? 'Running' : 'Stopped'}
            </span>

            {!schedulerStatus.running && (
              <button
                onClick={startScheduler}
                disabled={schedulerStatus.loading}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none"
              >
                {schedulerStatus.loading ? (
                  <FaSpinner className="animate-spin mr-1" />
                ) : (
                  <FaPlay className="mr-1" />
                )}
                Start System
              </button>
            )}

            <button
              onClick={checkUpcomingMatches}
              disabled={checkingMatches}
              className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none"
            >
              {checkingMatches ? (
                <FaSpinner className="animate-spin mr-1" />
              ) : (
                <FaSync className="mr-1" />
              )}
              Check Upcoming Matches
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <FaSpinner className="animate-spin text-indigo-600 text-3xl" />
          </div>
        ) : liveMatches.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">
              No live matches currently in progress.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {match.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {match.format}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Live
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {match.result || 'No score available'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(match.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => updateMatchScores(match.id)}
                        disabled={updateStatus[match.id]?.loading}
                        className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none mr-2"
                      >
                        {updateStatus[match.id]?.loading ? (
                          <FaSpinner className="animate-spin mr-1" />
                        ) : updateStatus[match.id]?.success === true ? (
                          <FaCheckCircle className="text-green-300 mr-1" />
                        ) : updateStatus[match.id]?.success === false ? (
                          <FaTimesCircle className="text-red-500 mr-1" />
                        ) : (
                          <FaSync className="mr-1" />
                        )}
                        Update Scores
                      </button>

                      {match.status === 'completed' && (
                        <button
                          onClick={() => finalizeMatchContests(match.id)}
                          disabled={finalizeStatus[match.id]?.loading}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none"
                        >
                          {finalizeStatus[match.id]?.loading ? (
                            <FaSpinner className="animate-spin mr-1" />
                          ) : finalizeStatus[match.id]?.success === true ? (
                            <FaCheckCircle className="text-green-300 mr-1" />
                          ) : finalizeStatus[match.id]?.success === false ? (
                            <FaTimesCircle className="text-red-500 mr-1" />
                          ) : (
                            <FaSync className="mr-1" />
                          )}
                          Finalize Contests
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">How Live Scoring Works</h2>
          <p className="text-sm text-gray-700 mb-2">
            The live scoring system automatically updates player points in
            real-time during cricket matches.
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              Points are calculated based on player performances (runs, wickets,
              catches, etc.)
            </li>
            <li>Updates occur every 2 minutes for all live matches</li>
            <li>
              User contest rankings are updated based on their team's
              performance
            </li>
            <li>
              You can manually trigger updates using the "Update Scores" button
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
