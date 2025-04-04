import React from 'react';

interface ScoreCardProps {
  teamAName: string;
  teamBName: string;
  teamAScore: string;
  teamBScore: string;
  overs: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  overs,
}) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <h2 className="text-xl font-bold border-b pb-2 mb-4">Match Score</h2>
      <div className="flex justify-between items-center">
        <div className="text-center">
          <h3 className="text-md mb-1">{teamAName}</h3>
          <div className="text-2xl font-bold">{teamAScore}</div>
        </div>

        <div className="text-center">
          <div className="bg-gray-100 px-3 py-1 rounded-md">
            <span className="text-sm">Overs</span>
            <div className="text-xl font-bold">{overs}</div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-md mb-1">{teamBName}</h3>
          <div className="text-2xl font-bold">{teamBScore}</div>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
