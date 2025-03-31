"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';

export default function Matches() {
  const { data: session } = useSession();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    // Fetch matches from API
    const fetchMatches = async () => {
      try {
        // This would be replaced with actual API call
        // const response = await fetch('/api/matches?status=' + activeTab);
        // const data = await response.json();
        // setMatches(data);
        
        // Placeholder data
        setTimeout(() => {
          setMatches([
            {
              id: 1,
              title: 'India vs Australia',
              format: 'T20',
              venue: 'Melbourne Cricket Ground',
              startTime: '2025-04-05T14:00:00Z',
              teams: {
                team1: { name: 'India', logo: '/team-logos/india.png' },
                team2: { name: 'Australia', logo: '/team-logos/australia.png' }
              },
              status: 'upcoming'
            },
            {
              id: 2,
              title: 'England vs South Africa',
              format: 'ODI',
              venue: 'Lord\'s Cricket Ground',
              startTime: '2025-04-07T10:00:00Z',
              teams: {
                team1: { name: 'England', logo: '/team-logos/england.png' },
                team2: { name: 'South Africa', logo: '/team-logos/south-africa.png' }
              },
              status: 'upcoming'
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching matches:', error);
        setLoading(false);
      }
    };

    fetchMatches();
  }, [activeTab]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Cricket Matches</h1>
        
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
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No {activeTab} matches available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match: any) => (
              <Link href={`/matches/${match.id}`} key={match.id}>
                <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">{match.format}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(match.startTime).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{match.title}</h3>
                    <p className="text-sm text-gray-600">{match.venue}</p>
                  </div>
                  
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 relative">
                        <Image
                          src={match.teams.team1.logo}
                          alt={match.teams.team1.name}
                          layout="fill"
                          objectFit="contain"
                        />
                      </div>
                      <span className="mt-2 font-medium">{match.teams.team1.name}</span>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-xl font-bold">VS</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 relative">
                        <Image
                          src={match.teams.team2.logo}
                          alt={match.teams.team2.name}
                          layout="fill"
                          objectFit="contain"
                        />
                      </div>
                      <span className="mt-2 font-medium">{match.teams.team2.name}</span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-600 text-white p-3 text-center">
                    {match.status === 'upcoming' && (
                      <span>Create Team</span>
                    )}
                    {match.status === 'live' && (
                      <span>View Live Score</span>
                    )}
                    {match.status === 'completed' && (
                      <span>View Results</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
