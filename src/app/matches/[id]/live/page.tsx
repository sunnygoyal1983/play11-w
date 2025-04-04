'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MatchHeader from '@/components/MatchHeader';
import ScoreCard from '@/components/ScoreCard';
import BattingCard from '@/components/BattingCard';
import BowlingCard from '@/components/BowlingCard';
import RecentOversCard from '@/components/RecentOversCard';
import MatchLoadingState from '@/components/MatchLoadingState';
import MainLayout from '@/components/MainLayout';

// Live match page client component
export default function LiveMatchPage() {
  const params = useParams();
  const matchId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : (params.id as string)
    : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);

  // Fetch live match data
  useEffect(() => {
    const fetchLiveMatchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/matches/${matchId}/live`);
        const result = await response.json();

        if (result.success) {
          setLiveData(result.data);
          setError(null);
        } else {
          setError(result.error || 'Failed to fetch live match data');
        }
      } catch (error) {
        console.error('Error fetching live match data:', error);
        setError('Failed to fetch live match data');
      } finally {
        setLoading(false);
      }
    };

    // Sync match data first, then fetch it
    const syncAndFetchData = async () => {
      try {
        // Trigger sync endpoint to update our database
        await fetch(`/api/matches/${matchId}/sync`);
      } catch (error) {
        console.error('Error syncing match data:', error);
      }

      // Fetch the data regardless of sync result
      fetchLiveMatchData();
    };

    // Initial fetch
    syncAndFetchData();

    // Set up interval for fetching data every 20 seconds
    const intervalId = setInterval(syncAndFetchData, 20000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [matchId]);

  // Show loading state
  if (loading && !liveData) {
    return (
      <MainLayout>
        <MatchLoadingState />
      </MainLayout>
    );
  }

  // Show error state
  if (error && !liveData) {
    return (
      <MainLayout>
        <div className="container mx-auto p-4">
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <MatchHeader
          matchId={matchId}
          teamA={liveData?.teamAName || 'Team A'}
          teamB={liveData?.teamBName || 'Team B'}
          status={liveData?.status || 'Live'}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <ScoreCard
            teamAName={liveData?.teamAName || 'Team A'}
            teamBName={liveData?.teamBName || 'Team B'}
            teamAScore={liveData?.teamAScore || '0/0'}
            teamBScore={liveData?.teamBScore || 'Yet to bat'}
            overs={liveData?.overs || '0.0'}
          />

          <RecentOversCard recentOvers={liveData?.recentOvers || ''} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <BattingCard
            batsman1={liveData?.currentBatsman1 || 'Waiting for data...'}
            batsman1Score={liveData?.currentBatsman1Score || '0 (0)'}
            batsman2={liveData?.currentBatsman2 || 'Waiting for data...'}
            batsman2Score={liveData?.currentBatsman2Score || '0 (0)'}
            lastWicket={liveData?.lastWicket || 'No wickets yet'}
          />

          <BowlingCard
            bowlerName={liveData?.currentBowler || 'Waiting for data...'}
            figures={liveData?.currentBowlerFigures || '0/0 (0.0)'}
          />
        </div>
      </div>
    </MainLayout>
  );
}
