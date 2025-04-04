import React from 'react';
import Link from 'next/link';

interface MatchHeaderProps {
  matchId: string;
  teamA: string;
  teamB: string;
  status: string;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({
  matchId,
  teamA,
  teamB,
  status,
}) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md mb-4">
      <h1 className="text-2xl font-bold">
        {teamA} vs {teamB}
      </h1>
      <div className="flex justify-between items-center mt-2">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
            {status.toUpperCase()}
          </span>
        </div>
        <Link
          href={`/matches/${matchId}`}
          className="text-blue-600 text-sm hover:underline"
        >
          Match Details
        </Link>
      </div>
    </div>
  );
};

export default MatchHeader;
