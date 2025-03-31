import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { FaInfoCircle, FaTrophy, FaUsers, FaUserPlus } from 'react-icons/fa';
import { format } from 'date-fns';

// This would typically come from an API call based on the match ID
const dummyMatch = {
  id: '1',
  name: 'India vs Australia',
  format: 'T20',
  status: 'upcoming',
  startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
  venue: 'Melbourne Cricket Ground',
  teamA: { id: 'IND', name: 'India', logo: '/team-logos/india.png' },
  teamB: { id: 'AUS', name: 'Australia', logo: '/team-logos/australia.png' },
  contests: [
    { 
      id: 'c1',
      name: 'Grand Contest',
      entryFee: 49, 
      totalSpots: 10000, 
      filledSpots: 5000, 
      prizePool: 400000,
      winnerCount: 4000,
      isGuaranteed: true,
      prizeBreakup: [
        { rank: 1, prize: 50000 },
        { rank: 2, prize: 25000 },
        { rank: 3, prize: 10000 },
        { rank: '4-10', prize: 5000 },
        { rank: '11-100', prize: 1000 },
        { rank: '101-500', prize: 500 },
        { rank: '501-4000', prize: 100 },
      ]
    },
    { 
      id: 'c2',
      name: 'Winner Takes All',
      entryFee: 99, 
      totalSpots: 5000, 
      filledSpots: 2000, 
      prizePool: 200000,
      winnerCount: 1,
      isGuaranteed: false,
      prizeBreakup: [
        { rank: 1, prize: 200000 },
      ]
    },
    { 
      id: 'c3',
      name: 'Head to Head',
      entryFee: 500, 
      totalSpots: 2, 
      filledSpots: 0, 
      prizePool: 900,
      winnerCount: 1,
      isGuaranteed: false,
      prizeBreakup: [
        { rank: 1, prize: 900 },
      ]
    },
  ],
  userTeams: []
};

export default function MatchDetails() {
  const params = useParams();
  const matchId = params?.id;
  const [activeTab, setActiveTab] = useState('contests');
  
  // In a real app, we would fetch the match details using the ID
  const match = dummyMatch;
  
  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-xl">Match not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-indigo-600 text-white p-4">
            <h1 className="text-xl font-bold mb-1">{match.name}</h1>
            <div className="flex justify-between text-sm">
              <span>{match.format} • {match.venue}</span>
              <span>
                {match.status === 'upcoming' 
                  ? `Starts ${format(match.startTime, 'MMM d, h:mm a')}`
                  : match.status === 'live'
                  ? 'LIVE'
                  : `Ended ${format(match.startTime, 'MMM d')}`
                }
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-2 relative overflow-hidden">
                  {match.teamA.logo && (
                    <Image
                      src={match.teamA.logo}
                      alt={match.teamA.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="font-medium text-lg">{match.teamA.name}</span>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">VS</div>
                <div className="text-sm text-gray-500">
                  {match.status === 'upcoming' && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      {formatTimeRemaining(match.startTime)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mb-2 relative overflow-hidden">
                  {match.teamB.logo && (
                    <Image
                      src={match.teamB.logo}
                      alt={match.teamB.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="font-medium text-lg">{match.teamB.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'contests'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('contests')}
          >
            <div className="flex items-center">
              <FaTrophy className="mr-2" />
              Contests
            </div>
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'myTeams'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('myTeams')}
          >
            <div className="flex items-center">
              <FaUsers className="mr-2" />
              My Teams
            </div>
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'info'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('info')}
          >
            <div className="flex items-center">
              <FaInfoCircle className="mr-2" />
              Info
            </div>
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="mb-8">
          {/* Contests Tab */}
          {activeTab === 'contests' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Available Contests</h2>
                <Link
                  href={`/routes/matches/${matchId}/create-team`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"
                >
                  <FaUserPlus className="mr-2" />
                  Create Team
                </Link>
              </div>
              
              <div className="space-y-4">
                {match.contests.map((contest) => (
                  <div key={contest.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold">{contest.name}</h3>
                        {contest.isGuaranteed && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Guaranteed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Prize Pool</p>
                          <p className="font-bold text-lg">₹{contest.prizePool.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Entry</p>
                          <p className="font-bold text-lg">₹{contest.entryFee}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Spots</p>
                          <p className="font-bold text-lg">{contest.filledSpots}/{contest.totalSpots}</p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full" 
                          style={{ width: `${(contest.filledSpots / contest.totalSpots) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm mb-4">
                        <span>{contest.totalSpots - contest.filledSpots} spots left</span>
                        <span>{contest.winnerCount} Winners</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          className="text-indigo-600 border border-indigo-600 px-3 py-1 rounded text-sm hover:bg-indigo-50 flex-1"
                          onClick={() => {/* Show prize breakup modal */}}
                        >
                          Prize Breakup
                        </button>
                        <Link
                          href={`/routes/matches/${matchId}/contests/${contest.id}/join`}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 flex-1 text-center"
                        >
                          Join
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* My Teams Tab */}
          {activeTab === 'myTeams' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">My Teams</h2>
                <Link
                  href={`/routes/matches/${matchId}/create-team`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center"
                >
                  <FaUserPlus className="mr-2" />
                  Create Team
                </Link>
              </div>
              
              {match.userTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {match.userTeams.map((team) => (
                    <div key={team.id} className="bg-white rounded-lg shadow-md p-4">
                      <h3 className="font-bold mb-2">{team.name}</h3>
                      {/* Team details would go here */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500 mb-4">You haven't created any teams for this match yet.</p>
                  <Link
                    href={`/routes/matches/${matchId}/create-team`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded inline-flex items-center"
                  >
                    <FaUserPlus className="mr-2" />
                    Create Your First Team
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Match Information</h2>
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">Format</h3>
                    <p>{match.format}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Venue</h3>
                    <p>{match.venue}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Start Time</h3>
                    <p>{format(match.startTime, 'MMMM d, yyyy h:mm a')}</p>
                  </div>
                  {/* More match details would go here */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

// Helper function to format time remaining
function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'Starting now';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  } else {
    return `${minutes}m left`;
  }
}
