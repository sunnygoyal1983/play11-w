"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';

export default function Contests() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch('/api/admin/contests');
        if (!response.ok) {
          throw new Error('Failed to fetch contests');
        }
        const data = await response.json();
        setContests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading contests...</div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Contests</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">{contests[0]?.matchName || 'Loading match...'}</h2>
              <p className="text-gray-600">T20 • Melbourne Cricket Ground</p>
              <p className="text-sm text-gray-500">April 5, 2025 • 7:30 PM</p>
            </div>
            <div>
              <Link 
                href={`/matches/${contests[0]?.matchId || 1}`}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded"
              >
                View Match
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Available Contests</h2>
            <div className="flex space-x-2">
              <button className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm">
                Entry: Low to High
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm">
                Prize: High to Low
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {contests.map(contest => (
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
                    href={session ? `/contests/${contest.id}/join` : '/auth/signin?redirect=/contests'}
                    className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded"
                  >
                    {contest.entryFee === 0 ? 'Join FREE' : `Join ₹${contest.entryFee}`}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
