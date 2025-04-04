import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

// Function to fetch live match data from our API
async function getLiveMatchData(matchId: string) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/matches/${matchId}/live`,
      {
        cache: 'no-store',
        next: { revalidate: 20 }, // Revalidate every 20 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch live match data');
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching live match data:', error);
    return null;
  }
}

export const metadata: Metadata = {
  title: 'Match Live | Fantasy Cricket',
  description: 'Live match coverage and updates',
};

export default async function MatchLivePage({
  params,
}: {
  params: { id: string };
}) {
  const matchId = params.id;
  const session = await getServerSession(authOptions);

  // If not logged in, redirect to login
  if (!session) {
    redirect('/login');
  }

  // Fetch match details and live data in parallel
  const [match, liveData] = await Promise.all([
    prisma.match.findUnique({
      where: { id: matchId },
    }),
    getLiveMatchData(matchId),
  ]);

  if (!match) {
    return <div>Match not found</div>;
  }

  // Prepare the current batsmen display
  const currentBatsmen = [
    {
      name: liveData?.currentBatsman1 || 'Waiting for data...',
      score: liveData?.currentBatsman1Score || '0 (0)',
    },
    {
      name: liveData?.currentBatsman2 || 'Waiting for data...',
      score: liveData?.currentBatsman2Score || '0 (0)',
    },
  ];

  // Prepare the current bowler display
  const currentBowler = {
    name: liveData?.currentBowler || 'Waiting for data...',
    figures: liveData?.currentBowlerFigures || '0/0 (0.0)',
  };

  return (
    <div className="container mx-auto pb-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{match?.name}</h1>
        <p className="text-gray-600">
          {match?.venue} • {format(new Date(match?.startTime), 'MMMM d, yyyy')}
        </p>
        <div className="mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
            LIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="bg-blue-600 text-white p-4 rounded-t-md">
            <h2 className="text-xl font-bold">Live Score</h2>
          </div>

          <div className="bg-white p-6 rounded-b-md shadow-md">
            <div className="flex justify-between items-center mb-8">
              <div className="text-center">
                <h3 className="text-xl mb-2">{match?.teamAName}</h3>
                <div className="text-4xl font-bold">{liveData?.teamAScore}</div>
              </div>

              <div className="text-center">
                <div className="bg-gray-200 px-4 py-2 rounded-md">
                  <span className="font-semibold">Overs</span>
                  <div className="text-2xl font-bold">{liveData?.overs}</div>
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl mb-2">{match?.teamBName}</h3>
                <div className="text-4xl font-bold">{liveData?.teamBScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                  BATSMEN
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between">
                    <div>{currentBatsmen[0].name}</div>
                    <div className="font-medium">{currentBatsmen[0].score}</div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between">
                    <div>{currentBatsmen[1].name}</div>
                    <div className="font-medium">{currentBatsmen[1].score}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                  BOWLER
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between">
                    <div>{currentBowler.name}</div>
                    <div className="font-medium">{currentBowler.figures}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                LAST WICKET
              </h3>
              <div className="bg-red-50 p-3 rounded-md text-red-800">
                {liveData?.lastWicket}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                RECENT OVERS
              </h3>
              <div className="bg-gray-50 p-4 rounded-md font-mono tracking-wider text-lg">
                {typeof liveData?.recentOvers === 'string'
                  ? liveData.recentOvers
                  : '- - - - - -'}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-blue-600 text-white p-4 rounded-t-md">
            <h2 className="text-xl font-bold">Match Information</h2>
          </div>
          <div className="bg-white p-4 rounded-b-md shadow-md">
            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Date</h3>
              <p className="font-medium">
                {format(new Date(match?.startTime), 'MMMM d, yyyy')}
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Time</h3>
              <p className="font-medium">
                {format(new Date(match?.startTime), 'h:mm a')}
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Venue</h3>
              <p className="font-medium">{match?.venue}</p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Status</h3>
              <p className="font-medium text-green-600">
                {match?.status.toUpperCase()}
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Current Innings</h3>
              <p className="font-medium">{liveData?.currentInnings}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-blue-600 text-white p-4 rounded-t-md">
          <h2 className="text-xl font-bold">Commentary</h2>
        </div>
        <div className="bg-white p-4 rounded-b-md shadow-md">
          {liveData?.commentary && liveData.commentary.length > 0 ? (
            <ul className="space-y-3">
              {liveData.commentary.map((comment: string, index: number) => (
                <li key={index} className="pb-2 border-b">
                  {comment}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No commentary available</p>
          )}
        </div>
      </div>

      <div className="bg-white mt-8 p-4 rounded-md shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">
              Live data updates automatically every 20 seconds
            </p>
          </div>
          <div>
            <Link
              href={`/matches/${matchId}/live?refresh=${Date.now()}`}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block"
            >
              Refresh Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
