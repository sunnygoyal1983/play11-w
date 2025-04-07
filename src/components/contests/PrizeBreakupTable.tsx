import React, { useState } from 'react';
import { FaTrophy, FaMedal } from 'react-icons/fa';

interface PrizeBreakupItem {
  id?: string;
  rank: number | string;
  amount: number;
  percentage?: number;
  endRank?: number | string;
}

interface PrizeBreakupTableProps {
  prizeBreakup: PrizeBreakupItem[];
}

export default function PrizeBreakupTable({
  prizeBreakup,
}: PrizeBreakupTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (!prizeBreakup || prizeBreakup.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        No prize breakup information available
      </div>
    );
  }

  // Sort the prizes by rank (as numbers if possible)
  const sortedPrizes = [...prizeBreakup].sort((a, b) => {
    const rankA =
      typeof a.rank === 'string' ? parseInt(a.rank.split('-')[0]) : a.rank;
    const rankB =
      typeof b.rank === 'string' ? parseInt(b.rank.split('-')[0]) : b.rank;
    return rankA - rankB;
  });

  // Consolidate prizes with same amount for cleaner display
  const consolidatedPrizes = sortedPrizes.reduce((acc, prize) => {
    // For already grouped ranks, just add them directly
    if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      acc.push(prize);
      return acc;
    }

    const lastPrize = acc[acc.length - 1];
    if (
      lastPrize &&
      lastPrize.amount === prize.amount &&
      typeof lastPrize.rank === 'number' &&
      typeof prize.rank === 'number' &&
      lastPrize.endRank === prize.rank - 1
    ) {
      // Extend the range
      lastPrize.endRank = prize.rank;
    } else {
      // Create a new group
      acc.push({
        ...prize,
        endRank: prize.endRank || prize.rank,
      });
    }
    return acc;
  }, [] as PrizeBreakupItem[]);

  // Format for display
  const displayPrizes = consolidatedPrizes.map((prize) => {
    let rankDisplay;

    if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      // Already in range format
      const [start, end] = prize.rank.split('-');
      rankDisplay = `${formatOrdinal(parseInt(start))}-${formatOrdinal(
        parseInt(end)
      )}`;
    } else if (prize.endRank && prize.rank !== prize.endRank) {
      // Range of ranks
      rankDisplay = `${formatOrdinal(prize.rank)}-${formatOrdinal(
        prize.endRank
      )}`;
    } else {
      // Single rank
      rankDisplay = formatOrdinal(prize.rank);
    }

    return { ...prize, rankDisplay };
  });

  // Limit initial display if there are too many prizes
  const displayLimit = 25;
  const limitedPrizes = showAll
    ? displayPrizes
    : displayPrizes.slice(0, displayLimit);
  const hasMore = displayPrizes.length > displayLimit;

  // Calculate total winners
  const totalWinners = calculateTotalWinners(prizeBreakup);

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">
          Prize Breakup - {totalWinners.toLocaleString()} Winners
        </h3>
      </div>

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
            {limitedPrizes[0]?.percentage !== undefined && (
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
          {limitedPrizes.map((prize, index) => (
            <tr
              key={prize.id || `rank-${index}`}
              className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                {prize.rank === 1 || prize.rank === '1' ? (
                  <div className="flex items-center">
                    <FaTrophy className="text-yellow-500 mr-2" />
                    <span className="font-medium">1st</span>
                  </div>
                ) : prize.rank === 2 || prize.rank === '2' ? (
                  <div className="flex items-center">
                    <FaMedal className="text-gray-400 mr-2" />
                    <span className="font-medium">2nd</span>
                  </div>
                ) : prize.rank === 3 || prize.rank === '3' ? (
                  <div className="flex items-center">
                    <FaMedal className="text-amber-700 mr-2" />
                    <span className="font-medium">3rd</span>
                  </div>
                ) : (
                  <span>{prize.rankDisplay}</span>
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

      {hasMore && (
        <div className="bg-gray-50 text-center py-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            {showAll
              ? 'Show Less'
              : `Show All (${displayPrizes.length} Prize Tiers)`}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to format a rank as ordinal (1st, 2nd, 3rd, etc.)
function formatOrdinal(value: number | string): string {
  const num = typeof value === 'string' ? parseInt(value) : value;

  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';

  return `${num}th`;
}

// Helper function to calculate total winners from prize breakup
function calculateTotalWinners(prizes: PrizeBreakupItem[]): number {
  return prizes.reduce((total, prize) => {
    if (typeof prize.rank === 'string' && prize.rank.includes('-')) {
      const [start, end] = prize.rank.split('-').map(Number);
      return total + (end - start + 1);
    }

    if (prize.endRank && prize.endRank !== prize.rank) {
      const start =
        typeof prize.rank === 'string' ? parseInt(prize.rank) : prize.rank;
      const end =
        typeof prize.endRank === 'string'
          ? parseInt(prize.endRank)
          : prize.endRank;
      return total + (end - start + 1);
    }

    return total + 1;
  }, 0);
}
