import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { fetchUpcomingMatches, fetchLiveMatches, fetchRecentMatches } from '@/services/sportmonk-api';
import { format } from 'date-fns';

// This would typically come from an API call
const dummyMatches = [
  {
    id: '1',
    name: 'India vs Australia',
    format: 'T20',
    status: 'upcoming',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
    venue: 'Melbourne Cricket Ground',
    teamA: { id: 'IND', name: 'India', logo: '/team-logos/india.png' },
    teamB: { id: 'AUS', name: 'Australia', logo: '/team-logos/australia.png' },
    contests: [
      { entryFee: 49, totalSpots: 10000, filledSpots: 5000, prizePool: 400000 },
      { entryFee: 99, totalSpots: 5000, filledSpots: 2000, prizePool: 200000 },
    ]
  },
  {
    id: '2',
    name: 'England vs South Africa',
    format: 'ODI',
    status: 'live',
    startTime: new Date(Date.now() - 1000 * 60 * 60), // Started 1 hour ago
    venue: 'Lord\'s Cricket Ground',
    teamA: { id: 'ENG', name: 'England', logo: '/team-logos/england.png' },
    teamB: { id: 'SA', name: 'South Africa', logo: '/team-logos/south-africa.png' },
    contests: [
      { entryFee: 199, totalSpots: 5000, filledSpots: 4800, prizePool: 500000 },
      { entryFee: 499, totalSpots: 1000, filledSpots: 900, prizePool: 300000 },
    ]
  },
  {
    id: '3',
    name: 'Pakistan vs New Zealand',
    format: 'Test',
    status: 'completed',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    venue: 'National Stadium, Karachi',
    teamA: { id: 'PAK', name: 'Pakistan', logo: '/team-logos/pakistan.png' },
    teamB: { id: 'NZ', name: 'New Zealand', logo: '/team-logos/new-zealand.png' },
    result: 'Pakistan won by 5 wickets',
    contests: []
  }
];

export default function Matches() {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // Filter matches based on active tab
  const filteredMatches = dummyMatches.filter(match => {
    if (activeTab === 'upcoming') return match.status === 'upcoming';
    if (activeTab === 'live') return match.status === 'live';
    if (activeTab === 'completed') return match.status === 'completed';
    return true;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Cricket Matches</h1>
        
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
        
        {/* Matches List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-indigo-50 p-3 border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      {match.format} • {match.status === 'upcoming' 
                        ? `Starts ${format(match.startTime, 'MMM d, h:mm a')}`
                        : match.status === 'live'
                        ? 'LIVE'
                        : `Ended ${format(match.startTime, 'MMM d')}`
                      }
                    </span>
                    {match.status !== 'completed' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ₹{Math.max(...match.contests.map(c => c.prizePool)).toLocaleString('en-IN')} Prize
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 relative overflow-hidden">
                        {match.teamA.logo && (
                          <Image
                            src={match.teamA.logo}
                            alt={match.teamA.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium">{match.teamA.name}</span>
                    </div>
                    <span className="text-sm font-bold">VS</span>
                    <div className="flex items-center">
                      <span className="font-medium">{match.teamB.name}</span>
                      <div className="w-10 h-10 bg-gray-200 rounded-full ml-3 relative overflow-hidden">
                        {match.teamB.logo && (
                          <Image
                            src={match.teamB.logo}
                            alt={match.teamB.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">{match.venue}</p>
                  
                  {match.status === 'completed' && match.result && (
                    <div className="bg-gray-100 p-2 rounded mb-3 text-sm text-center font-medium">
                      {match.result}
                    </div>
                  )}
                  
                  {match.status !== 'completed' && (
                    <>
                      {match.contests.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Contests Available:</p>
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {match.contests.map((contest, idx) => (
                              <div key={idx} className="flex-shrink-0 bg-gray-100 rounded p-2 text-xs">
                                <p className="font-medium">₹{contest.entryFee}</p>
                                <p className="text-gray-500">{contest.filledSpots}/{contest.totalSpots}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Link
                        href={`/routes/matches/${match.id}`}
                        className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded"
                      >
                        {match.status === 'upcoming' ? 'Create Team' : 'View Match'}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-gray-500">No {activeTab} matches found.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
