"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { FaUsers, FaTrophy, FaCalendarAlt, FaMapMarkerAlt, FaClock } from 'react-icons/fa';

interface MatchParams {
  params: {
    id: string;
  };
}

export default function MatchDetails({ params }: MatchParams) {
  const { data: session } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<any>(null);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contests');
  const [teamCreated, setTeamCreated] = useState(false);
  
  const matchId = params.id;

  useEffect(() => {
    // Fetch match details
    const fetchMatchDetails = async () => {
      try {
        // In a real app, you would fetch from your API
        // const response = await fetch(`/api/matches/${matchId}`);
        // const data = await response.json();
        
        // Placeholder data
        setTimeout(() => {
          if (matchId === '1' || matchId === '2') {
            setMatch({
              id: matchId,
              name: matchId === '1' ? 'India vs Australia' : 'England vs South Africa',
              format: matchId === '1' ? 'T20' : 'ODI',
              venue: matchId === '1' ? 'Melbourne Cricket Ground' : 'Lord\'s Cricket Ground',
              startTime: matchId === '1' ? '2025-04-05T14:00:00Z' : '2025-04-07T10:00:00Z',
              status: 'upcoming',
              teams: {
                team1: { 
                  id: matchId === '1' ? 'IND' : 'ENG',
                  name: matchId === '1' ? 'India' : 'England', 
                  logo: matchId === '1' ? '/team-logos/india.png' : '/team-logos/england.png',
                  players: [
                    { id: 101, name: 'Virat Kohli', role: 'Batsman', credits: 10.5 },
                    { id: 102, name: 'Rohit Sharma', role: 'Batsman', credits: 10.0 },
                    { id: 103, name: 'Jasprit Bumrah', role: 'Bowler', credits: 9.5 },
                    { id: 104, name: 'Ravindra Jadeja', role: 'All-rounder', credits: 9.0 },
                    { id: 105, name: 'Rishabh Pant', role: 'Wicket-keeper', credits: 8.5 }
                  ]
                },
                team2: { 
                  id: matchId === '1' ? 'AUS' : 'SA',
                  name: matchId === '1' ? 'Australia' : 'South Africa', 
                  logo: matchId === '1' ? '/team-logos/australia.png' : '/team-logos/south-africa.png',
                  players: [
                    { id: 201, name: matchId === '1' ? 'Steve Smith' : 'Quinton de Kock', role: 'Batsman', credits: 9.5 },
                    { id: 202, name: matchId === '1' ? 'Pat Cummins' : 'Kagiso Rabada', role: 'Bowler', credits: 9.0 },
                    { id: 203, name: matchId === '1' ? 'Glenn Maxwell' : 'David Miller', role: 'All-rounder', credits: 8.5 },
                    { id: 204, name: matchId === '1' ? 'Mitchell Starc' : 'Anrich Nortje', role: 'Bowler', credits: 9.0 },
                    { id: 205, name: matchId === '1' ? 'Alex Carey' : 'Temba Bavuma', role: 'Wicket-keeper', credits: 8.0 }
                  ]
                }
              }
            });
            
            setContests([
              {
                id: 1,
                name: 'Grand Prize Pool',
                entryFee: 499,
                totalPrize: 1000000,
                totalSpots: 10000,
                filledSpots: 5463,
                firstPrize: 100000,
                winnerPercentage: 40
              },
              {
                id: 2,
                name: 'Winner Takes All',
                entryFee: 999,
                totalPrize: 500000,
                totalSpots: 500,
                filledSpots: 245,
                firstPrize: 250000,
                winnerPercentage: 10
              },
              {
                id: 3,
                name: 'Practice Contest',
                entryFee: 0,
                totalPrize: 10000,
                totalSpots: 10000,
                filledSpots: 7890,
                firstPrize: 1000,
                winnerPercentage: 50
              }
            ]);
            
            setTeamCreated(false);
            setLoading(false);
          } else {
            // If match ID doesn't exist in our mock data
            router.push('/matches');
          }
        }, 1000);
      } catch (error) {
        console.error('Error fetching match details:', error);
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId, router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!match) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Match Not Found</h2>
            <p className="text-gray-600 mb-4">The match you're looking for doesn't exist or has been removed.</p>
            <Link 
              href="/matches"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              View All Matches
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-indigo-600 text-white p-4">
            <h1 className="text-2xl font-bold">{match.name}</h1>
            <div className="flex items-center text-sm mt-1">
              <FaCalendarAlt className="mr-1" />
              <span className="mr-4">{new Date(match.startTime).toLocaleDateString()}</span>
              <FaClock className="mr-1" />
              <span className="mr-4">{new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <FaMapMarkerAlt className="mr-1" />
              <span>{match.venue}</span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col items-center mb-4 md:mb-0">
                <div className="w-24 h-24 relative">
                  <Image
                    src={match.teams.team1.logo || '/team-logos/default.png'}
                    alt={match.teams.team1.name}
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <h3 className="text-lg font-semibold mt-2">{match.teams.team1.name}</h3>
              </div>
              
              <div className="flex flex-col items-center mb-4 md:mb-0">
                <div className="text-2xl font-bold mb-2">VS</div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {match.format}
                </span>
                <span className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">
                  {match.status}
                </span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 relative">
                  <Image
                    src={match.teams.team2.logo || '/team-logos/default.png'}
                    alt={match.teams.team2.name}
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <h3 className="text-lg font-semibold mt-2">{match.teams.team2.name}</h3>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              {match.status === 'upcoming' && (
                <Link 
                  href={teamCreated ? `/contests?matchId=${match.id}` : `/matches/${match.id}/create-team`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  {teamCreated ? 'Join Contest' : 'Create Team'}
                </Link>
              )}
              {match.status === 'live' && (
                <Link 
                  href={`/matches/${match.id}/live`}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  Live Score
                </Link>
              )}
              {match.status === 'completed' && (
                <Link 
                  href={`/matches/${match.id}/results`}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium"
                >
                  View Results
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-4 px-6 font-medium flex items-center ${
                activeTab === 'contests' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('contests')}
            >
              <FaTrophy className="mr-2" />
              Contests
            </button>
            <button
              className={`py-4 px-6 font-medium flex items-center ${
                activeTab === 'players' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('players')}
            >
              <FaUsers className="mr-2" />
              Players
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'contests' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Available Contests</h2>
                
                {contests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No contests available for this match yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contests.map((contest: any) => (
                      <div key={contest.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b">
                          <div className="flex justify-between">
                            <h3 className="font-semibold">{contest.name}</h3>
                            <span className="font-semibold text-green-600">₹{contest.totalPrize.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Entry</span>
                            <span className="font-medium">
                              {contest.entryFee === 0 ? 'FREE' : `₹${contest.entryFee}`}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{contest.filledSpots} spots filled</span>
                              <span>{contest.totalSpots} spots</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(contest.filledSpots / contest.totalSpots) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-sm mb-4">
                            <div>
                              <span className="text-gray-600">1st Prize:</span>
                              <span className="font-medium ml-1">₹{contest.firstPrize.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Winners:</span>
                              <span className="font-medium ml-1">{contest.winnerPercentage}%</span>
                            </div>
                          </div>
                          
                          <Link
                            href={teamCreated 
                              ? `/contests/${contest.id}/join?matchId=${match.id}` 
                              : `/matches/${match.id}/create-team?contestId=${contest.id}`
                            }
                            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded"
                          >
                            {teamCreated 
                              ? (contest.entryFee === 0 ? 'Join FREE' : `Join ₹${contest.entryFee}`)
                              : 'Create Team'
                            }
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'players' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Players</h2>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">{match.teams.team1.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Player
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Credits
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {match.teams.team1.players.map((player: any) => (
                          <tr key={player.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{player.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {player.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {player.credits}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">{match.teams.team2.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Player
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Credits
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {match.teams.team2.players.map((player: any) => (
                          <tr key={player.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{player.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {player.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {player.credits}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
