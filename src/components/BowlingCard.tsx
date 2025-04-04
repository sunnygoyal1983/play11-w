import React from 'react';

interface BowlingCardProps {
  bowlerName: string;
  figures: string;
}

const BowlingCard: React.FC<BowlingCardProps> = ({ bowlerName, figures }) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <h2 className="text-xl font-bold border-b pb-2 mb-4">Bowling</h2>

      <div className="mb-4">
        <div className="flex justify-between">
          <div className="font-medium">{bowlerName}</div>
          <div>{figures}</div>
        </div>
      </div>

      <div className="mt-8 text-gray-500 italic text-sm">
        Figures show: Wickets/Runs (Overs)
      </div>
    </div>
  );
};

export default BowlingCard;
