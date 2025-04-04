import React from 'react';
import { FaUsers, FaClock, FaExclamationCircle } from 'react-icons/fa';

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  filledSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  isGuaranteed: boolean;
  winnerCount: number;
  isActive: boolean;
  match?: {
    id: string;
    name: string;
    startTime: string;
    teamAName: string;
    teamBName: string;
    format?: string;
    status: string;
  };
}

interface ContestDetailsProps {
  contest: Contest;
}

export default function ContestDetails({ contest }: ContestDetailsProps) {
  const matchStarted = contest.match
    ? new Date() > new Date(contest.match.startTime)
    : false;
  const contestIsFull = contest.filledSpots >= contest.totalSpots;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Contest Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">{contest.name}</h1>
          {contest.match?.format && (
            <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
              {contest.match.format}
            </div>
          )}
        </div>

        {contest.match && (
          <div className="text-sm text-gray-600 flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <span>{contest.match.teamAName}</span>
              <span>vs</span>
              <span>{contest.match.teamBName}</span>
            </div>
            <span>•</span>
            <div className="flex items-center">
              <FaClock className="mr-1 text-gray-400" />
              {new Date(contest.match.startTime).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Contest Details */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-gray-600 text-sm">Entry Fee</p>
            <p className="font-semibold">₹{contest.entryFee}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Prize Pool</p>
            <p className="font-semibold">
              ₹{contest.totalPrize.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">First Prize</p>
            <p className="font-semibold">
              ₹{contest.firstPrize.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Winners</p>
            <p className="font-semibold">{contest.winnerCount}</p>
          </div>
        </div>

        {/* Entry progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              <FaUsers className="inline-block mr-1" />
              {contest.filledSpots}/{contest.totalSpots} Entries
            </span>
            <span>{contest.totalSpots - contest.filledSpots} spots left</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{
                width: `${(contest.filledSpots / contest.totalSpots) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Contest Status */}
        {matchStarted && (
          <div className="text-center text-amber-600 p-2 bg-amber-50 rounded">
            <FaClock className="inline-block mr-1" />
            Match has started, entries are closed
          </div>
        )}

        {contestIsFull && !matchStarted && (
          <div className="text-center text-red-600 p-2 bg-red-50 rounded">
            <FaExclamationCircle className="inline-block mr-1" />
            Contest is full
          </div>
        )}

        {contest.isGuaranteed && (
          <div className="mt-2 text-center text-green-700 text-sm">
            <span className="bg-green-100 px-2 py-1 rounded">
              Guaranteed Contest
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
