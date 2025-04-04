import React from 'react';
import { FaTrophy, FaMedal } from 'react-icons/fa';

interface PrizeBreakupItem {
  id?: string;
  rank: number;
  amount: number;
  percentage?: number;
}

interface PrizeBreakupTableProps {
  prizeBreakup: PrizeBreakupItem[];
}

export default function PrizeBreakupTable({
  prizeBreakup,
}: PrizeBreakupTableProps) {
  if (!prizeBreakup || prizeBreakup.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        No prize breakup information available
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Rank
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Prize
            </th>
            {prizeBreakup[0].percentage !== undefined && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                % of Prize Pool
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {prizeBreakup.map((prize) => (
            <tr key={prize.id || `rank-${prize.rank}`}>
              <td className="px-6 py-4 whitespace-nowrap">
                {prize.rank === 1 ? (
                  <div className="flex items-center">
                    <FaTrophy className="text-yellow-500 mr-2" />
                    <span className="font-medium">1st</span>
                  </div>
                ) : prize.rank === 2 ? (
                  <div className="flex items-center">
                    <FaMedal className="text-gray-400 mr-2" />
                    <span className="font-medium">2nd</span>
                  </div>
                ) : prize.rank === 3 ? (
                  <div className="flex items-center">
                    <FaMedal className="text-amber-700 mr-2" />
                    <span className="font-medium">3rd</span>
                  </div>
                ) : (
                  <span>{prize.rank}th</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-medium">
                  ₹{prize.amount.toLocaleString()}
                </span>
              </td>
              {prize.percentage !== undefined && (
                <td className="px-6 py-4 whitespace-nowrap">
                  {prize.percentage}%
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
