// Export all services
export * from './utils';
export * from './tournaments';
export * from './teams';
export * from './matches';
export * from './players';

// Import and re-export specific functions for convenience
import { prisma } from './utils';
import {
  fetchTournaments,
  fetchTournamentDetails,
  fetchTournamentMatches,
} from './tournaments';
import {
  fetchTeamDetails,
  fetchTournamentTeams,
  fetchTeamPlayers,
  fetchTeamPlayersBySeason,
} from './teams';
import {
  fetchMatchDetails,
  fetchLiveMatches,
  fetchRecentMatches,
  fetchUpcomingMatches,
} from './matches';
import { fetchPlayerDetails, storeMatchLineup } from './players';

// Export the database client
export { prisma };

// Export convenience functions
export const sportmonkApi = {
  // Tournament functions
  tournaments: {
    fetchAll: fetchTournaments,
    fetchDetails: fetchTournamentDetails,
    fetchMatches: fetchTournamentMatches,
  },

  // Team functions
  teams: {
    fetchDetails: fetchTeamDetails,
    fetchByTournament: fetchTournamentTeams,
    fetchPlayers: fetchTeamPlayers,
    fetchPlayersBySeason: fetchTeamPlayersBySeason,
  },

  // Match functions
  matches: {
    fetchDetails: fetchMatchDetails,
    fetchLive: fetchLiveMatches,
    fetchRecent: fetchRecentMatches,
    fetchUpcoming: fetchUpcomingMatches,
  },

  // Player functions
  players: {
    fetchDetails: fetchPlayerDetails,
    storeLineup: storeMatchLineup,
  },
};
