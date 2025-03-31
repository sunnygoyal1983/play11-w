"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';

export default function Teams() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState([
    {
      id: 1,
      name: 'Dream Team 1',
      matchId: 1,
      matchName: 'India vs Australia',
      captainId: 101,
      captainName: 'Virat Kohli',
      viceCaptainId: 102,
      viceCaptainName: 'Rohit Sharma',
      createdAt: '2025-03-29T10:30:00Z',
      contestsJoined: 2,
      points: 0,
      rank: '-',
      status: 'upcoming'
    },
    {
      id: 2,
      name: 'Super XI',
      matchId: 2,
      matchName: 'England vs South Africa',
      captainId: 201,
      captainName: 'Joe Root',
      viceCaptainId: 202,
      viceCaptainName: 'Ben Stokes',
      createdAt: '2025-03-28T14:20:00Z',
      contestsJoined: 1,
      points: 0,
      rank: '-',
      status: 'upcoming'
    }
  ]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Teams</h1>
          <Link 
            href="/matches"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Create New Team
          </Link>
        </div>
        
        {teams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <Image 
                src="/empty-teams.svg" 
                alt="No teams" 
                width={200} 
                height={200} 
                className="mx-auto"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">You haven't created any teams yet</h2>
            <p className="text-gray-600 mb-4">Create your first fantasy team and join contests to win big!</p>
            <Link 
              href="/matches"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded inline-block"
            >
              Browse Matches
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map(team => (
              <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">{team.name}</h3>
                    <span className="text-sm text-gray-500">
                      Created {new Date(team.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{team.matchName}</p>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Captain</p>
                      <p className="font-medium">{team.captainName}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Vice Captain</p>
                      <p className="font-medium">{team.viceCaptainName}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-gray-500 text-sm">Contests Joined</p>
                      <p className="font-medium">{team.contestsJoined}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Link 
                      href={`/teams/${team.id}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      View Team
                    </Link>
                    {team.status === 'upcoming' && (
                      <>
                        <Link 
                          href={`/teams/${team.id}/edit`}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm"
                        >
                          Edit Team
                        </Link>
                        <Link 
                          href={`/contests?matchId=${team.matchId}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Join Contest
                        </Link>
                      </>
                    )}
                    {team.status === 'live' && (
                      <Link 
                        href={`/matches/${team.matchId}/live`}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Live Score
                      </Link>
                    )}
                    {team.status === 'completed' && (
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-gray-600 text-sm">Points:</span>
                          <span className="font-medium ml-1">{team.points}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 text-sm">Rank:</span>
                          <span className="font-medium ml-1">{team.rank}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
