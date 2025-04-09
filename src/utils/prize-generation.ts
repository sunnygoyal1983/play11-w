import { MAX_WINNER_COUNT, MIN_PRIZE_AMOUNT } from './contest-validation';

export interface PrizeItem {
  rank: string | number;
  amount: number;
  percentage: number;
}

export interface ContestParams {
  totalPrize: number;
  winnerCount: number;
  firstPrize: number;
  entryFee: number;
  prizeStructure?: 'topHeavy' | 'balanced' | 'distributed' | 'winnerTakesAll';
}

/**
 * Generates a prize breakup based on contest parameters
 */
export function generatePrizeBreakup(params: ContestParams): PrizeItem[] {
  const {
    totalPrize,
    winnerCount,
    firstPrize,
    entryFee,
    prizeStructure = 'balanced',
  } = params;

  // Validate inputs
  if (totalPrize <= 0) throw new Error('Total prize must be greater than 0');
  if (winnerCount <= 0) throw new Error('Winner count must be greater than 0');
  if (winnerCount > MAX_WINNER_COUNT)
    throw new Error(`Winner count cannot exceed ${MAX_WINNER_COUNT}`);
  if (firstPrize <= 0) throw new Error('First prize must be greater than 0');
  if (firstPrize > totalPrize)
    throw new Error('First prize cannot exceed total prize');

  const prizeBreakup: PrizeItem[] = [];
  const remainingPrize = totalPrize - firstPrize;

  // Always add first prize
  prizeBreakup.push({
    rank: 1,
    amount: firstPrize,
    percentage: Math.round((firstPrize / totalPrize) * 100),
  });

  // Different distribution strategies based on contest size and structure
  if (winnerCount <= 3) {
    return generateSmallContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      remainingPrize
    );
  } else if (winnerCount < 100) {
    return generateMediumContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      remainingPrize,
      prizeStructure
    );
  } else {
    return generateMegaContestPrizes(
      totalPrize,
      winnerCount,
      firstPrize,
      entryFee,
      prizeStructure
    );
  }

  // Ensure total percentage is 100%
  const totalPercentage = prizeBreakup.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  if (totalPercentage !== 100) {
    const diff = 100 - totalPercentage;
    prizeBreakup[0].percentage += diff;
  }

  return prizeBreakup;
}

/**
 * Generates prize breakdown for small contests (2-3 winners)
 */
function generateSmallContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  remainingPrize: number
): PrizeItem[] {
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  if (winnerCount === 2) {
    // Second prize is all remaining
    prizeBreakup.push({
      rank: 2,
      amount: remainingPrize,
      percentage: Math.round((remainingPrize / totalPrize) * 100),
    });
  } else if (winnerCount === 3) {
    // For 3 winners, split 60/40 for 2nd and 3rd
    const secondPrize = Math.floor(remainingPrize * 0.6);
    const thirdPrize = remainingPrize - secondPrize;

    prizeBreakup.push({
      rank: 2,
      amount: secondPrize,
      percentage: Math.round((secondPrize / totalPrize) * 100),
    });

    prizeBreakup.push({
      rank: 3,
      amount: thirdPrize,
      percentage: Math.round((thirdPrize / totalPrize) * 100),
    });
  }

  return prizeBreakup;
}

/**
 * Generates prize breakdown for medium contests (4-99 winners)
 */
function generateMediumContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  remainingPrize: number,
  prizeStructure:
    | 'topHeavy'
    | 'balanced'
    | 'distributed'
    | 'winnerTakesAll' = 'balanced'
): PrizeItem[] {
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  // Distribute remainder using weighted approach based on prize structure
  // Determine top tier allocation percentage and size
  let topTierPercentage = 0.7; // default balanced
  let middleTierPercentage = 0.2;
  let bottomTierPercentage = 0.1;

  switch (prizeStructure) {
    case 'topHeavy':
      topTierPercentage = 0.8;
      middleTierPercentage = 0.15;
      bottomTierPercentage = 0.05;
      break;
    case 'distributed':
      topTierPercentage = 0.5;
      middleTierPercentage = 0.3;
      bottomTierPercentage = 0.2;
      break;
    case 'balanced':
    default:
      // Use default values
      break;
  }

  // Define tier ranges based on winner count
  const topTierMax = Math.min(5, Math.floor(winnerCount * 0.2));
  const middleTierMax = Math.min(
    Math.floor(winnerCount * 0.5),
    winnerCount - topTierMax - 1
  );
  const bottomTierCount = winnerCount - topTierMax - middleTierMax - 1; // -1 for first prize

  // Allocate prize money to tiers
  const topTierAmount = Math.floor(remainingPrize * topTierPercentage);
  const middleTierAmount = Math.floor(remainingPrize * middleTierPercentage);
  const bottomTierAmount = remainingPrize - topTierAmount - middleTierAmount;

  // Top tier (ranks 2 to topTierMax + 1) - Decreasing distribution
  const topTierWeightSum = calculateWeightSum(topTierMax);
  for (let i = 0; i < topTierMax; i++) {
    const rank = i + 2; // Start from rank 2
    const weight = (topTierMax - i) / topTierWeightSum;
    const prize = Math.floor(topTierAmount * weight);

    prizeBreakup.push({
      rank,
      amount: prize,
      percentage: Math.round((prize / totalPrize) * 100),
    });
  }

  // Middle tier (more even distribution)
  if (middleTierMax > 0) {
    const middleTierBaseAmount = Math.floor(middleTierAmount / middleTierMax);

    for (let i = 0; i < middleTierMax; i++) {
      const rank = topTierMax + i + 2; // Start after top tier
      const prize = middleTierBaseAmount;

      prizeBreakup.push({
        rank,
        amount: prize,
        percentage: Math.round((prize / totalPrize) * 100),
      });
    }
  }

  // Bottom tier (entry fee return or minimum prize)
  if (bottomTierCount > 0) {
    const bottomTierBaseAmount = Math.max(
      MIN_PRIZE_AMOUNT,
      Math.floor(bottomTierAmount / bottomTierCount)
    );

    prizeBreakup.push({
      rank: `${topTierMax + middleTierMax + 2}-${winnerCount}`,
      amount: bottomTierBaseAmount,
      percentage: Math.round(
        ((bottomTierBaseAmount * bottomTierCount) / totalPrize) * 100
      ),
    });
  }

  return prizeBreakup;
}

/**
 * Generates prize breakdown for mega contests (100+ winners)
 */
function generateMegaContestPrizes(
  totalPrize: number,
  winnerCount: number,
  firstPrize: number,
  entryFee: number,
  prizeStructure:
    | 'topHeavy'
    | 'balanced'
    | 'distributed'
    | 'winnerTakesAll' = 'balanced'
): PrizeItem[] {
  const prizeBreakup: PrizeItem[] = [
    {
      rank: 1,
      amount: firstPrize,
      percentage: Math.round((firstPrize / totalPrize) * 100),
    },
  ];

  const remainingPrize = totalPrize - firstPrize;

  // Define tier structure with their weights and percentage allocations
  const tiers = defineMegaContestTiers(winnerCount, prizeStructure);

  // Calculate weights for allocation
  const totalWeight = tiers.reduce((sum, tier) => sum + tier.weight, 0);

  // Allocate funds to tiers
  for (const tier of tiers) {
    // Calculate range size
    const rangeSize = tier.end - tier.start + 1;

    // Skip invalid tiers
    if (rangeSize <= 0 || tier.start > winnerCount) continue;

    const actualEnd = Math.min(tier.end, winnerCount);
    const actualRangeSize = actualEnd - tier.start + 1;

    // Calculate tier amount
    const tierPercentage = tier.weight / totalWeight;
    const tierAmount = Math.floor(remainingPrize * tierPercentage);

    // For ranks 2-10, we give individual prizes
    if (tier.start < 11) {
      // Individual prizes for top positions
      const individualWeightSum = calculateWeightSum(actualRangeSize);

      for (let i = 0; i < actualRangeSize; i++) {
        const rank = tier.start + i;
        const weight = (actualRangeSize - i) / individualWeightSum;
        const prize = Math.floor(tierAmount * weight);

        prizeBreakup.push({
          rank,
          amount: prize,
          percentage: Math.round((prize / totalPrize) * 100),
        });
      }
    } else {
      // For larger ranges, group by prize amount
      const basePrize = Math.max(
        MIN_PRIZE_AMOUNT,
        Math.floor(tierAmount / actualRangeSize)
      );

      // Use range format (e.g., "101-200")
      prizeBreakup.push({
        rank: `${tier.start}-${actualEnd}`,
        amount: basePrize,
        percentage: Math.round(
          ((basePrize * actualRangeSize) / totalPrize) * 100
        ),
      });
    }
  }

  // Ensure the last prize matches the entry fee
  const lastPrizeIndex = prizeBreakup.length - 1;
  if (lastPrizeIndex >= 0) {
    const lastPrize = prizeBreakup[lastPrizeIndex];
    lastPrize.amount = entryFee;
    if (typeof lastPrize.rank === 'string') {
      const [start, end] = lastPrize.rank.split('-').map(Number);
      const count = end - start + 1;
      lastPrize.percentage = Math.round(
        ((entryFee * count) / totalPrize) * 100
      );
    } else {
      lastPrize.percentage = Math.round((entryFee / totalPrize) * 100);
    }
  }

  return prizeBreakup;
}

/**
 * Defines tier structure for mega contests
 */
function defineMegaContestTiers(
  winnerCount: number,
  prizeStructure: 'topHeavy' | 'balanced' | 'distributed' | 'winnerTakesAll'
): Array<{ start: number; end: number; weight: number }> {
  switch (prizeStructure) {
    case 'topHeavy':
      return [
        { start: 2, end: 10, weight: 5 },
        { start: 11, end: 25, weight: 4 },
        { start: 26, end: 100, weight: 3 },
        { start: 101, end: 500, weight: 2 },
        { start: 501, end: winnerCount, weight: 1 },
      ];

    case 'distributed':
      return [
        { start: 2, end: 10, weight: 3 },
        { start: 11, end: 50, weight: 3 },
        { start: 51, end: 100, weight: 2.5 },
        { start: 101, end: 1000, weight: 2 },
        { start: 1001, end: winnerCount, weight: 1.5 },
      ];

    case 'balanced':
    default:
      return [
        { start: 2, end: 10, weight: 4 },
        { start: 11, end: 50, weight: 3 },
        { start: 51, end: 200, weight: 2 },
        { start: 201, end: 1000, weight: 1.5 },
        { start: 1001, end: 10000, weight: 1 },
        { start: 10001, end: winnerCount, weight: 0.8 },
      ];
  }
}

/**
 * Calculates sum of weights for decreasing distribution
 */
function calculateWeightSum(count: number): number {
  let sum = 0;
  for (let i = 1; i <= count; i++) {
    sum += i;
  }
  return sum;
}

/**
 * Fetches preview prize breakup from the API
 */
export async function fetchPrizeBreakupPreview(
  contestData: any
): Promise<PrizeItem[]> {
  try {
    const response = await fetch('/api/admin/preview-prize-breakup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contestData),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch prize breakup preview');
    }

    const responseData = await response.json();
    console.log('API Response:', responseData);

    // Extract the prizeBreakup array from the response
    if (responseData.prizeBreakup && Array.isArray(responseData.prizeBreakup)) {
      return responseData.prizeBreakup;
    }

    // If the response is already an array, return it directly
    if (Array.isArray(responseData)) {
      return responseData;
    }

    console.error('Unexpected API response format:', responseData);
    return [];
  } catch (error) {
    console.error('Error fetching prize breakup preview:', error);
    return [];
  }
}
