import React from 'react';

interface BattingCardProps {
  batsman1: string;
  batsman1Score: string;
  batsman2: string;
  batsman2Score: string;
  lastWicket: string;
}

const BattingCard: React.FC<BattingCardProps> = ({
  batsman1,
  batsman1Score,
  batsman2,
  batsman2Score,
  lastWicket,
}) => {
  return (
    <div className="bg-white p-4 rounded-md shadow-md">
      <h2 className="text-xl font-bold border-b pb-2 mb-4">Batting</h2>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="font-medium">{batsman1}</div>
          <div>{batsman1Score}</div>
        </div>

        <div className="flex justify-between">
          <div className="font-medium">{batsman2}</div>
          <div>{batsman2Score}</div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-md font-bold border-b pb-1 mb-2">Last Wicket</h3>
        <div className="bg-red-50 p-2 rounded-md text-red-800 text-sm">
          {lastWicket}
        </div>
      </div>
    </div>
  );
};

export default BattingCard;
