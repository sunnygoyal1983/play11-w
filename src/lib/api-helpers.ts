/**
 * API helper functions for working with contests, matches, and other data.
 */

/**
 * Fetch contest details by ID
 */
export async function getContest(contestId: string) {
  const response = await fetch(`/api/contests/${contestId}`, {
    // Add cache: 'no-store' to always fetch fresh data
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contest: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch prize breakup for a contest by ID
 */
export async function getPrizeBreakup(contestId: string) {
  try {
    const response = await fetch(`/api/admin/contests/${contestId}/prizes`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      // If admin API fails, try the public endpoint
      const publicResponse = await fetch(`/api/contests/${contestId}/prizes`, {
        cache: 'no-store',
      });

      if (!publicResponse.ok) {
        return []; // Return empty array if both APIs fail
      }

      return await publicResponse.json();
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching prize breakup:', error);
    return []; // Return empty array in case of error
  }
}

/**
 * Fetch match details by ID
 */
export async function getMatch(matchId: string) {
  const response = await fetch(`/api/matches/${matchId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch match: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch user teams for a match
 */
export async function getUserTeamsForMatch(matchId: string) {
  const response = await fetch(`/api/user/teams?matchId=${matchId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return []; // Return empty array if API fails
  }

  return await response.json();
}

/**
 * Fetch contests for a match
 */
export async function getContestsForMatch(matchId: string) {
  const response = await fetch(`/api/contests?matchId=${matchId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return []; // Return empty array if API fails
  }

  return await response.json();
}
