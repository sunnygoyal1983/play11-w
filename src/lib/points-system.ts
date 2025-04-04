/**
 * Points System for Fantasy Cricket
 *
 * This file defines the rules for calculating fantasy points based on player performances
 */

// Point values for batting
export const BATTING_POINTS = {
  RUN: 1.0, // Per run scored
  BOUNDARY_BONUS: {
    FOUR: 1.0, // Additional points for each four
    SIX: 2.0, // Additional points for each six
  },
  MILESTONE_BONUS: {
    HALF_CENTURY: 4.0, // Additional points for scoring 50+ runs
    CENTURY: 8.0, // Additional points for scoring 100+ runs
  },
  DUCK: -2.0, // Negative points for scoring 0 (only for batsmen/all-rounders/wicket-keepers)
  STRIKE_RATE_BONUS: {
    GT_60_LT_70: -2.0, // Strike rate between 60-70 (min 20 balls)
    GT_70_LT_80: -1.0, // Strike rate between 70-80 (min 20 balls)
    GT_100_LT_120: 1.0, // Strike rate between 100-120 (min 20 balls)
    GT_120: 2.0, // Strike rate above 120 (min 20 balls)
  },
};

// Point values for bowling
export const BOWLING_POINTS = {
  WICKET: 25.0, // Per wicket taken
  BONUS_WICKET: {
    LBW_BOWLED: 8.0, // Additional points for LBW or Bowled wickets
  },
  MAIDEN_OVER: 12.0, // Per maiden over bowled
  MILESTONE_BONUS: {
    THREE_WICKETS: 4.0, // Additional points for 3 wickets in match
    FOUR_WICKETS: 8.0, // Additional points for 4 wickets in match
    FIVE_WICKETS: 16.0, // Additional points for 5 wickets in match
  },
  ECONOMY_RATE_BONUS: {
    LT_5: 6.0, // Economy rate < 5 runs per over (min 2 overs)
    GT_5_LT_6: 4.0, // Economy rate between 5-6 (min 2 overs)
    GT_6_LT_7: 2.0, // Economy rate between 6-7 (min 2 overs)
    GT_9_LT_10: -2.0, // Economy rate between 9-10 (min 2 overs)
    GT_10_LT_11: -4.0, // Economy rate between 10-11 (min 2 overs)
    GT_11: -6.0, // Economy rate > 11 (min 2 overs)
  },
};

// Point values for fielding
export const FIELDING_POINTS = {
  CATCH: 8.0, // Per catch taken
  STUMPING: 12.0, // Per stumping made
  RUN_OUT: {
    DIRECT_HIT: 12.0, // Direct hit run out
    INDIRECT_HIT: 6.0, // Indirect hit run out (with assistance)
  },
};

// Other point values
export const OTHER_POINTS = {
  CAPTAIN_MULTIPLIER: 2.0, // Captain points are multiplied by this value
  VICE_CAPTAIN_MULTIPLIER: 1.5, // Vice captain points are multiplied by this value
};

/**
 * Calculate batting points for a player
 */
export function calculateBattingPoints(
  runs: number,
  balls: number,
  fours: number,
  sixes: number,
  isOut: boolean,
  playerRole: string
): number {
  let points = 0;

  // Points for runs scored
  points += runs * BATTING_POINTS.RUN;

  // Boundary bonuses
  points += fours * BATTING_POINTS.BOUNDARY_BONUS.FOUR;
  points += sixes * BATTING_POINTS.BOUNDARY_BONUS.SIX;

  // Milestone bonuses
  if (runs >= 100) {
    points += BATTING_POINTS.MILESTONE_BONUS.CENTURY;
  } else if (runs >= 50) {
    points += BATTING_POINTS.MILESTONE_BONUS.HALF_CENTURY;
  }

  // Duck penalty (only applicable to recognized batsmen)
  if (isOut && runs === 0 && balls > 0) {
    // Only apply duck penalty to batsmen, all-rounders, and wicket-keepers
    const battingRoles = ['BAT', 'AR', 'WK'];
    if (battingRoles.includes(playerRole.toUpperCase())) {
      points += BATTING_POINTS.DUCK;
    }
  }

  // Strike rate bonuses (only if faced 20+ balls)
  if (balls >= 20) {
    const strikeRate = (runs / balls) * 100;

    if (strikeRate > 120) {
      points += BATTING_POINTS.STRIKE_RATE_BONUS.GT_120;
    } else if (strikeRate > 100) {
      points += BATTING_POINTS.STRIKE_RATE_BONUS.GT_100_LT_120;
    } else if (strikeRate < 70 && strikeRate >= 60) {
      points += BATTING_POINTS.STRIKE_RATE_BONUS.GT_60_LT_70;
    } else if (strikeRate < 80 && strikeRate >= 70) {
      points += BATTING_POINTS.STRIKE_RATE_BONUS.GT_70_LT_80;
    }
  }

  return points;
}

/**
 * Calculate bowling points for a player
 */
export function calculateBowlingPoints(
  wickets: number,
  overs: number,
  maidens: number,
  runsConceded: number,
  lbwBowledCount: number
): number {
  let points = 0;

  // Points for wickets taken
  points += wickets * BOWLING_POINTS.WICKET;

  // LBW/Bowled bonus points
  points += lbwBowledCount * BOWLING_POINTS.BONUS_WICKET.LBW_BOWLED;

  // Maiden over points
  points += maidens * BOWLING_POINTS.MAIDEN_OVER;

  // Milestone bonuses
  if (wickets >= 5) {
    points += BOWLING_POINTS.MILESTONE_BONUS.FIVE_WICKETS;
  } else if (wickets >= 4) {
    points += BOWLING_POINTS.MILESTONE_BONUS.FOUR_WICKETS;
  } else if (wickets >= 3) {
    points += BOWLING_POINTS.MILESTONE_BONUS.THREE_WICKETS;
  }

  // Economy rate bonuses/penalties (only if bowled at least 2 overs)
  if (overs >= 2) {
    const economyRate = runsConceded / overs;

    if (economyRate < 5) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.LT_5;
    } else if (economyRate < 6) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.GT_5_LT_6;
    } else if (economyRate < 7) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.GT_6_LT_7;
    } else if (economyRate > 11) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.GT_11;
    } else if (economyRate > 10) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.GT_10_LT_11;
    } else if (economyRate > 9) {
      points += BOWLING_POINTS.ECONOMY_RATE_BONUS.GT_9_LT_10;
    }
  }

  return points;
}

/**
 * Calculate fielding points for a player
 */
export function calculateFieldingPoints(
  catches: number,
  stumpings: number,
  directRunOuts: number,
  indirectRunOuts: number
): number {
  let points = 0;

  // Points for catches
  points += catches * FIELDING_POINTS.CATCH;

  // Points for stumpings
  points += stumpings * FIELDING_POINTS.STUMPING;

  // Points for run outs
  points += directRunOuts * FIELDING_POINTS.RUN_OUT.DIRECT_HIT;
  points += indirectRunOuts * FIELDING_POINTS.RUN_OUT.INDIRECT_HIT;

  return points;
}

/**
 * Calculate total fantasy points for a player
 */
export function calculateTotalPoints(
  // Batting stats
  runs: number,
  balls: number,
  fours: number,
  sixes: number,
  isOut: boolean,

  // Bowling stats
  wickets: number,
  overs: number,
  maidens: number,
  runsConceded: number,
  lbwBowledCount: number,

  // Fielding stats
  catches: number,
  stumpings: number,
  directRunOuts: number,
  indirectRunOuts: number,

  // Player info
  playerRole: string,
  isCaptain: boolean = false,
  isViceCaptain: boolean = false
): number {
  // Calculate base points
  const battingPoints = calculateBattingPoints(
    runs,
    balls,
    fours,
    sixes,
    isOut,
    playerRole
  );
  const bowlingPoints = calculateBowlingPoints(
    wickets,
    overs,
    maidens,
    runsConceded,
    lbwBowledCount
  );
  const fieldingPoints = calculateFieldingPoints(
    catches,
    stumpings,
    directRunOuts,
    indirectRunOuts
  );

  // Sum up the base points
  let totalPoints = battingPoints + bowlingPoints + fieldingPoints;

  // Apply captain/vice-captain multiplier if applicable
  if (isCaptain) {
    totalPoints *= OTHER_POINTS.CAPTAIN_MULTIPLIER;
  } else if (isViceCaptain) {
    totalPoints *= OTHER_POINTS.VICE_CAPTAIN_MULTIPLIER;
  }

  return totalPoints;
}
