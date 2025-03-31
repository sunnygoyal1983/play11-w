import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { FaFilter, FaSearch, FaTrophy, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import { format } from 'date-fns';

// This would typically come from an API call
const dummyContests = [
  {
    id: 'c1',
    matchId: '1',
    name: 'Grand Contest',
    entryFee: 49,
    totalSpots: 10000,
    filledSpots: 5000,
    prizePool: 400000,
    winnerCount: 4000,
    isGuaranteed: true,
    match: {
      id: '1',
      name: 'India vs Australia',
      format: 'T20',
      status: 'upcoming',
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
      venue: 'Melbourne Cricket Ground',
      teamA: { id: 'IND', name: 'India', logo: '/team-logos/india.png' },
      teamB: { id: 'AUS', name: 'Australia', logo: '/team-logos/australia.png' },
    }
  },
  {
    id: 'c2',
    matchId: '1',
    name: 'Winner Takes All',
    entryFee: 99,
    totalSpots: 5000,
    filledSpots: 2000,
    prizePool: 200000,
    winnerCount: 1,
    isGuaranteed: false,
    match: {
      id: '1',
      name: 'India vs Australia',
      format: 'T20',
      status: 'upcoming',
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
      venue: 'Melbourne Cricket Ground',
      teamA: { id: 'IND', name: 'India', logo: '/team-logos/india.png' },
      teamB: { id: 'AUS', name: 'Australia', logo: '/team-logos/australia.png' },
    }
  },
  {
    id: 'c3',
    matchId: '2',
    name: 'Mega Contest',
    entryFee: 199,
    totalSpots: 5000,
    filledSpots: 4800,
    prizePool: 500000,
    winnerCount: 500,
    isGuaranteed: true,
    match: {
      id: '2',
      name: 'England vs South Africa',
      format: 'ODI',
      status: 'live',
      startTime: new Date(Date.now() - 1000 * 60 * 60), // Started 1 hour ago
      venue: 'Lord\'s Cricket Ground',
      teamA: { id: 'ENG', name: 'England', logo: '/team-logos/england.png' },
      teamB: { id: 'SA', name: 'South Africa', logo: '/team-logos/south-africa.png' },
    }
  },
  {
    id: 'c4',
    matchId: '2',
    name: 'Head to Head',
    entryFee: 500,
    totalSpots: 2,
    filledSpots: 1,
    prizePool: 900,
    winnerCount: 1,
    isGuaranteed: false,
    match: {
      id: '2',
      name: 'England vs South Africa',
      format: 'ODI',
      status: 'live',
      startTime: new Date(Date.now() - 1000 * 60 * 60), // Started 1 hour ago
      venue: 'Lord\'s Cricket Ground',
      teamA: { id: 'ENG', name: 'England', logo: '/team-logos/england.png' },
      teamB: { id: 'SA', name: 'South Africa', logo: '/team-logos/south-africa.png' },
    }
  },
];

export default function Contests() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    entryFee: 'all', // all, low, medium, high
    contestSize: 'all', // all, small, medium, large
  });
  
  // Filter contests based on active tab, search query, and filters
  const filteredContests = dummyContests.filter(contest => {
    // Filter by tab
    if (activeTab === 'upcoming' && contest.match.status !== 'upcoming') return false;
    if (activeTab === 'live' && contest.match.status !== 'live') return false;
    if (activeTab === 'joined' && false) return false; // In a real app, we would check if user has joined
    
    // Filter by search query
    if (searchQuery && !contest.match.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Filter by entry fee
    if (filters.entryFee === 'low' && contest.entryFee > 100) return false;
    if (filters.entryFee === 'medium' && (contest.entryFee <= 100 || contest.entryFee > 500)) return false;
    if (filters.entryFee === 'high' && contest.entryFee <= 500) return false;
    
    // Filter by contest size
    if (filters.contestSize === 'small' && contest.totalSpots > 100) return false;
    if (filters.contestSize === 'medium' && (contest.totalSpots <= 100 || contest.totalSpots > 1000)) return false;
    if (filters.contestSize === 'large' && contest.totalSpots <= 1000) return false;
    
    return true;
  });

  return (
    <MainLayout>
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Contests</h1>
        
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search matches..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="ml-2 p-2 bg-gray-100 rounded-lg"
              onClick={() => {/* Open filter modal */}}
            >
              <FaFilter className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === 'all'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All Contests
          </button>
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
              activeTab === 'joined'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('joined')}
          >
            Joined
          </button>
        </div>
        
        {/* Contests List */}
        <div className="space-y-6">
          {filteredContests.length > 0 ? (
            filteredContests.map((contest) => (
              <div key={contest.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Match Info */}
                <div className="bg-indigo-50 p-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{contest.match.name}</h3>
                      <p className="text-sm text-gray-600">
                        {contest.match.format} • {contest.match.venue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        contest.match.status === 'live' 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                      }`}>
                        {contest.match.status === 'upcoming' 
                          ? `Starts ${format(contest.match.startTime, 'MMM d, h:mm a')}`
                          : contest.match.status === 'live'
                          ? 'LIVE'
                          : `Ended ${format(contest.match.startTime, 'MMM d')}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Contest Info */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <FaTrophy className="text-yellow-500 mr-2" />
                      <h4 className="font-semibold">{contest.name}</h4>
                      {contest.isGuaranteed && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Guaranteed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <FaMoneyBillWave className="text-green-500 mr-1" />
                        <p className="text-xs text-gray-500">Prize Pool</p>
                      </div>
                      <p className="font-bold">₹{contest.prizePool.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <FaUsers className="text-blue-500 mr-1" />
                        <p className="text-xs text-gray-500">Entry</p>
                      </div>
                      <p className="font-bold">₹{contest.entryFee}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <FaTrophy className="text-yellow-500 mr-1" />
                        <p className="text-xs text-gray-500">Winners</p>
                      </div>
                      <p className="font-bold">{contest.winnerCount}</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${(contest.filledSpots / contest.totalSpots) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span>{contest.totalSpots - contest.filledSpots} spots left</span>
                    <span>{contest.filledSpots}/{contest.totalSpots} spots filled</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full mr-2 relative overflow-hidden">
                        {contest.match.teamA.logo && (
                          <Image
                            src={contest.match.teamA.logo}
                            alt={contest.match.teamA.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">vs</span>
                      <div className="w-8 h-8 bg-gray-200 rounded-full ml-2 relative overflow-hidden">
                        {contest.match.teamB.logo && (
                          <Image
                            src={contest.match.teamB.logo}
                            alt={contest.match.teamB.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    </div>
                    
                    <Link
                      href={`/routes/matches/${contest.matchId}/contests/${contest.id}/join`}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                    >
                      {contest.match.status === 'upcoming' ? 'Join' : 'View'}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 mb-4">No contests found matching your criteria.</p>
              <button
                className="text-indigo-600 font-medium"
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                  setFilters({
                    entryFee: 'all',
                    contestSize: 'all',
                  });
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
