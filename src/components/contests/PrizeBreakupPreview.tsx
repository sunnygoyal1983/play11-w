import React from 'react';

interface PrizeItem {
  rank: string | number;
  amount: number;
  percentage: number;
}

interface PrizeBreakupPreviewProps {
  prizeBreakup: PrizeItem[];
  totalPrize: number;
  winnerCount: number;
}

const PrizeBreakupPreview: React.FC<PrizeBreakupPreviewProps> = ({
  prizeBreakup,
  totalPrize,
  winnerCount,
}) => {
  console.log('PrizeBreakupPreview component received:', {
    prizeBreakup,
    totalPrize,
    winnerCount,
    isArray: Array.isArray(prizeBreakup),
    prizeBreakupLength: prizeBreakup?.length,
  });

  // Validate prize breakup data
  if (
    !prizeBreakup ||
    !Array.isArray(prizeBreakup) ||
    prizeBreakup.length === 0
  ) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700 font-medium">
          No valid prize breakup data available
        </p>
        <p className="text-sm text-red-600">
          Please try refreshing the preview or check the contest parameters.
        </p>
      </div>
    );
  }

  // Calculate total winners covered
  let totalWinnersCovered = 0;
  prizeBreakup.forEach((prize) => {
    if (typeof prize.rank === 'number') {
      totalWinnersCovered += 1;
    } else if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      const [start, end] = prize.rank.split('-').map(Number);
      totalWinnersCovered += end - start + 1;
    }
  });

  // Check if we have a mismatch
  const winnersMismatch = totalWinnersCovered !== winnerCount;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Prize Breakup Preview</h3>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Total Prize:</span> ₹
          {totalPrize.toLocaleString()}
        </div>
      </div>

      {winnersMismatch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          <p className="font-medium">Warning: Prize distribution mismatch</p>
          <p>
            Expected {winnerCount} winners but distribution covers{' '}
            {totalWinnersCovered} winners. This may cause issues with prize
            allocation.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prize Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Prize Pool
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prizeBreakup.map((prize, index) => (
              <tr key={index}>
                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {typeof prize.rank === 'number'
                    ? `#${prize.rank}`
                    : prize.rank}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  ₹{prize.amount.toLocaleString()}
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                  {prize.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prizeBreakup.length > 10 && (
        <div className="text-center text-sm text-gray-500">
          Showing {prizeBreakup.length} prize tiers covering{' '}
          {totalWinnersCovered} winners
        </div>
      )}
    </div>
  );
};

export default PrizeBreakupPreview;
