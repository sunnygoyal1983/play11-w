// Validation functions for contest creation

export interface ContestFormData {
  matchId: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  prizePool: number;
  totalPrize: number;
  firstPrize: number;
  winnerPercentage: number;
  firstPrizePercentage: number;
  platformCommission: number;
  isGuaranteed: boolean;
  winnerCount: number;
  status: string;
  filledSpots: number;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Constants for validation rules
export const MAX_WINNER_COUNT = 50000;
export const MIN_PRIZE_AMOUNT = 5;
export const MAX_PLATFORM_COMMISSION = 30;
export const MIN_FIRST_PRIZE_PERCENTAGE = 1;
export const MAX_FIRST_PRIZE_PERCENTAGE = 100;
export const MAX_TOTAL_SPOTS = 100000;

/**
 * Validates contest form data and returns validation errors
 */
export function validateContestForm(
  formData: ContestFormData
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required field validations
  if (!formData.matchId) {
    errors.push({
      field: 'matchId',
      message: 'Match is required',
      severity: 'error',
    });
  }

  if (!formData.name) {
    errors.push({
      field: 'name',
      message: 'Contest name is required',
      severity: 'error',
    });
  }

  // Numerical validations
  if (formData.entryFee < 0) {
    errors.push({
      field: 'entryFee',
      message: 'Entry fee cannot be negative',
      severity: 'error',
    });
  }

  if (formData.totalSpots <= 0) {
    errors.push({
      field: 'totalSpots',
      message: 'Total spots must be greater than 0',
      severity: 'error',
    });
  } else if (formData.totalSpots > MAX_TOTAL_SPOTS) {
    errors.push({
      field: 'totalSpots',
      message: `Total spots cannot exceed ${MAX_TOTAL_SPOTS.toLocaleString()}`,
      severity: 'error',
    });
  }

  if (formData.prizePool <= 0) {
    errors.push({
      field: 'prizePool',
      message: 'Prize pool must be greater than 0',
      severity: 'error',
    });
  }

  if (formData.totalPrize <= 0) {
    errors.push({
      field: 'totalPrize',
      message: 'Total prize must be greater than 0',
      severity: 'error',
    });
  }

  if (formData.firstPrize <= 0) {
    errors.push({
      field: 'firstPrize',
      message: 'First prize must be greater than 0',
      severity: 'error',
    });
  } else if (formData.firstPrize > formData.totalPrize) {
    errors.push({
      field: 'firstPrize',
      message: 'First prize cannot exceed total prize',
      severity: 'error',
    });
  }

  if (formData.winnerPercentage <= 0 || formData.winnerPercentage > 100) {
    errors.push({
      field: 'winnerPercentage',
      message: 'Winner percentage must be between 1 and 100',
      severity: 'error',
    });
  }

  if (formData.winnerCount <= 0) {
    errors.push({
      field: 'winnerCount',
      message: 'Winner count must be greater than 0',
      severity: 'error',
    });
  } else if (formData.winnerCount > MAX_WINNER_COUNT) {
    errors.push({
      field: 'winnerCount',
      message: `Winner count cannot exceed ${MAX_WINNER_COUNT.toLocaleString()}`,
      severity: 'error',
    });
  } else if (formData.winnerCount > formData.totalSpots) {
    errors.push({
      field: 'winnerCount',
      message: 'Winner count cannot exceed total spots',
      severity: 'error',
    });
  }

  if (
    formData.platformCommission < 0 ||
    formData.platformCommission > MAX_PLATFORM_COMMISSION
  ) {
    errors.push({
      field: 'platformCommission',
      message: `Platform commission must be between 0 and ${MAX_PLATFORM_COMMISSION}`,
      severity: 'error',
    });
  }

  if (
    formData.firstPrizePercentage < MIN_FIRST_PRIZE_PERCENTAGE ||
    formData.firstPrizePercentage > MAX_FIRST_PRIZE_PERCENTAGE
  ) {
    errors.push({
      field: 'firstPrizePercentage',
      message: `First prize percentage must be between ${MIN_FIRST_PRIZE_PERCENTAGE} and ${MAX_FIRST_PRIZE_PERCENTAGE}`,
      severity: 'error',
    });
  }

  // Business logic validations
  if (
    formData.winnerCount > 1 &&
    formData.firstPrize >= formData.totalPrize * 0.9
  ) {
    errors.push({
      field: 'firstPrize',
      message: 'First prize is too high, leaving too little for other winners',
      severity: 'warning',
    });
  }

  if (formData.totalPrize !== formData.prizePool) {
    errors.push({
      field: 'totalPrize',
      message: 'Total prize should equal prize pool',
      severity: 'error',
    });
  }

  // Validate minimum prize amount for lowest winner
  const averagePrizeForOthers =
    formData.winnerCount > 1
      ? (formData.totalPrize - formData.firstPrize) / (formData.winnerCount - 1)
      : 0;

  if (formData.winnerCount > 1 && averagePrizeForOthers < MIN_PRIZE_AMOUNT) {
    errors.push({
      field: 'winnerCount',
      message: `Prize amount for lowest winner may be too small (minimum is ₹${MIN_PRIZE_AMOUNT})`,
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Calculates contest fields based on core inputs
 */
export function calculateContestFields(
  entryFee: number,
  totalSpots: number,
  winnerPercentage: number,
  platformCommission: number,
  firstPrizePercentage: number
): Partial<ContestFormData> {
  // Calculate total collection
  const totalCollection = entryFee * totalSpots;

  // Calculate prize pool after commission
  const prizePool = Math.floor(
    totalCollection * ((100 - platformCommission) / 100)
  );

  // Calculate winner count
  const winnerCount = Math.floor((winnerPercentage / 100) * totalSpots) || 1;

  // Calculate first prize
  const firstPrize = Math.floor(prizePool * (firstPrizePercentage / 100));

  return {
    prizePool,
    totalPrize: prizePool,
    winnerCount,
    firstPrize,
  };
}

/**
 * Recommends a first prize percentage based on contest size
 */
export function recommendFirstPrizePercentage(winnerCount: number): number {
  if (winnerCount <= 1) return 100;
  if (winnerCount <= 3) return 60;
  if (winnerCount <= 10) return 40;
  if (winnerCount <= 100) return 25;
  if (winnerCount <= 1000) return 15;
  return 10;
}

/**
 * Adjusts the winner count to ensure minimum prize amounts
 */
export function adjustWinnerCount(
  totalPrize: number,
  firstPrize: number,
  winnerCount: number
): number {
  if (winnerCount <= 1) return 1;

  const remainingPrize = totalPrize - firstPrize;
  const maxPossibleWinners = Math.floor(remainingPrize / MIN_PRIZE_AMOUNT) + 1;

  return Math.min(winnerCount, maxPossibleWinners);
}
