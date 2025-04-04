import React from 'react';

interface RecentOversCardProps {
  recentOvers: string;
}

const RecentOversCard: React.FC<RecentOversCardProps> = ({ recentOvers }) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <h2 className="text-xl font-bold border-b pb-2 mb-4">Recent Overs</h2>

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="text-lg font-mono tracking-wider">
          {recentOvers ? recentOvers : '- - - - - -'}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <span className="bg-blue-100 text-blue-800 px-1 rounded">4</span> =
        Four,
        <span className="bg-purple-100 text-purple-800 px-1 rounded ml-1">
          6
        </span>{' '}
        = Six,
        <span className="bg-red-100 text-red-800 px-1 rounded ml-1">W</span> =
        Wicket
      </div>
    </div>
  );
};

export default RecentOversCard;
