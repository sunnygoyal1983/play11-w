import {
  buildApiUrl,
  rateLimitedFetch,
  prisma,
  getDateRange,
  logApiRequest,
} from './utils';

/**
 * Create a match from API data
 */
export const createMatch = async (match: any) => {
  try {
    // Use a transaction to ensure all related entities are created before the match
    return await prisma.$transaction(async (tx) => {
      // 1. Ensure tournament exists
      if (match.league?.id) {
        const tournament = await tx.tournament.findUnique({
          where: { sportMonkId: match.league.id.toString() },
        });

        if (!tournament) {
          console.log(
            `Tournament ${match.league.id} not found, creating it first...`
          );

          // Create tournament directly in the transaction
          await tx.tournament.create({
            data: {
              id: match.league.id.toString(),
              sportMonkId: match.league.id.toString(),
              name: match.league?.name || 'Unknown League',
              shortName: match.league?.code || '',
              image: match.league?.image_path || '',
              country: '',
              season: '',
              isActive: true,
            },
          });
        }
      }

      // 2. Ensure team A exists
      if (match.localteam?.id) {
        await tx.team.upsert({
          where: { sportMonkId: match.localteam.id.toString() },
          update: {
            name: match.localteam.name || '',
            shortName: match.localteam.code || '',
            image: match.localteam.image_path || '',
            country: '',
            isActive: true,
          },
          create: {
            id: match.localteam.id.toString(),
            sportMonkId: match.localteam.id.toString(),
            name: match.localteam.name || '',
            shortName: match.localteam.code || '',
            image: match.localteam.image_path || '',
            country: '',
            isActive: true,
          },
        });
      }

      // 3. Ensure team B exists
      if (match.visitorteam?.id) {
        await tx.team.upsert({
          where: { sportMonkId: match.visitorteam.id.toString() },
          update: {
            name: match.visitorteam.name || '',
            shortName: match.visitorteam.code || '',
            image: match.visitorteam.image_path || '',
            country: '',
            isActive: true,
          },
          create: {
            id: match.visitorteam.id.toString(),
            sportMonkId: match.visitorteam.id.toString(),
            name: match.visitorteam.name || '',
            shortName: match.visitorteam.code || '',
            image: match.visitorteam.image_path || '',
            country: '',
            isActive: true,
          },
        });
      }

      // 4. Now create or update the match
      // Determine match status based on starting_at date
      const startingDate = match.starting_at
        ? new Date(match.starting_at)
        : new Date();
      const currentDate = new Date();

      // Default status is 'upcoming' but we'll override it for past and live matches
      let matchStatus = 'upcoming';

      // If match start date is in the past
      if (startingDate < currentDate) {
        // Check if it's marked as completed
        if (match.status === 'Finished' || match.status === 'finished') {
          matchStatus = 'completed';
        } else if (
          match.status === 'LIVE' ||
          match.status === 'live' ||
          match.status === 'inprogress'
        ) {
          matchStatus = 'live';
        } else {
          // For past matches that don't have a completed status, mark as completed
          console.log(
            `Match ${
              match.id
            } has past date (${startingDate.toISOString()}) but status '${
              match.status
            }'. Setting as completed.`
          );
          matchStatus = 'completed';
        }
      }

      return await tx.match.upsert({
        where: { sportMonkId: match.id.toString() },
        update: {
          name: `${match.localteam?.name || 'TBA'} vs ${
            match.visitorteam?.name || 'TBA'
          }`,
          format: match.type || 'unknown',
          status:
            match.status === 'Finished'
              ? 'completed'
              : match.status === 'LIVE'
              ? 'live'
              : matchStatus,
          startTime: startingDate,
          // Set endTime for completed matches
          endTime: matchStatus === 'completed' ? currentDate : undefined,
          venue: match.venue?.name || 'TBA',
          teamAId: match.localteam?.id?.toString() || '',
          teamAName: match.localteam?.name || 'TBA',
          teamALogo: match.localteam?.image_path || '',
          teamBId: match.visitorteam?.id?.toString() || '',
          teamBName: match.visitorteam?.name || 'TBA',
          teamBLogo: match.visitorteam?.image_path || '',
          leagueId: match.league?.id?.toString() || '',
          leagueName: match.league?.name || 'Unknown League',
          isActive: true,
        },
        create: {
          id: match.id.toString(),
          sportMonkId: match.id.toString(),
          name: `${match.localteam?.name || 'TBA'} vs ${
            match.visitorteam?.name || 'TBA'
          }`,
          format: match.type || 'unknown',
          status:
            match.status === 'Finished'
              ? 'completed'
              : match.status === 'LIVE'
              ? 'live'
              : matchStatus,
          startTime: startingDate,
          // Set endTime for completed matches
          endTime: matchStatus === 'completed' ? currentDate : null,
          venue: match.venue?.name || 'TBA',
          teamAId: match.localteam?.id?.toString() || '',
          teamAName: match.localteam?.name || 'TBA',
          teamALogo: match.localteam?.image_path || '',
          teamBId: match.visitorteam?.id?.toString() || '',
          teamBName: match.visitorteam?.name || 'TBA',
          teamBLogo: match.visitorteam?.image_path || '',
          leagueId: match.league?.id?.toString() || '',
          leagueName: match.league?.name || 'Unknown League',
          isActive: true,
        },
      });
    });
  } catch (error) {
    console.error(`Error creating match ${match.id}:`, error);
    throw error;
  }
};

/**
 * Fetch match details and update the database
 */
export const fetchMatchDetails = async (matchId: number) => {
  try {
    const url = buildApiUrl(`/fixtures/${matchId}`, {
      include: 'localteam,visitorteam,venue,league,lineup,runs,manofmatch',
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for match details:`, errorText);
      return null;
    }

    const data = await response.json();
    const match = data.data;

    // Create/update the match
    const createdMatch = await createMatch(match);

    // Process the lineup if it exists
    if (
      match.lineup &&
      Array.isArray(match.lineup) &&
      match.lineup.length > 0
    ) {
      console.log(
        `Processing ${match.lineup.length} players in lineup for match ${matchId}`
      );

      // Create a map of players to teams based on the match teams
      const teamMap = new Map();

      // First populate team mappings from the API response
      if (match.localteam?.id && match.localteam?.name) {
        teamMap.set('localteam', {
          id: match.localteam.id.toString(),
          name: match.localteam.name,
        });
      }

      if (match.visitorteam?.id && match.visitorteam?.name) {
        teamMap.set('visitorteam', {
          id: match.visitorteam.id.toString(),
          name: match.visitorteam.name,
        });
      }

      // Process each player in the lineup
      for (const player of match.lineup) {
        try {
          if (!player.id) {
            console.warn('Skipping player with missing ID in lineup');
            continue;
          }

          // Determine team from the lineup structure if team_id is missing
          let teamId = player.team_id?.toString();
          let teamName = player.team_name || '';

          // If team_id is missing, try to determine it from other available information
          if (!teamId) {
            // First check if the player has a team_id in position
            if (player.position?.team_id) {
              teamId = player.position.team_id.toString();
              console.log(
                `Using position.team_id for player ${player.id}: ${teamId}`
              );
            }
            // Check if we can determine team from lineup data
            else if (player.lineup && player.lineup.team_id) {
              teamId = player.lineup.team_id.toString();
              console.log(
                `Using lineup.team_id for player ${player.id}: ${teamId}`
              );
            }
            // If we still don't have a team ID, look for a 'localteam' or 'visitorteam' attribute
            else if (teamMap.size > 0) {
              // Try to determine if the player belongs to localteam or visitorteam
              // This could be from attributes like lineup.team, batting.team_id, etc.
              if (
                teamMap.has('localteam') &&
                (player.lineup?.team === 'home' ||
                  player.batting?.team_id === match.localteam.id ||
                  player.bowling?.team_id === match.localteam.id)
              ) {
                teamId = teamMap.get('localteam').id;
                teamName = teamMap.get('localteam').name;
                console.log(
                  `Assigned player ${player.id} to localteam: ${teamId}`
                );
              } else if (
                teamMap.has('visitorteam') &&
                (player.lineup?.team === 'away' ||
                  player.batting?.team_id === match.visitorteam.id ||
                  player.bowling?.team_id === match.visitorteam.id)
              ) {
                teamId = teamMap.get('visitorteam').id;
                teamName = teamMap.get('visitorteam').name;
                console.log(
                  `Assigned player ${player.id} to visitorteam: ${teamId}`
                );
              }
              // If still no team_id, make an educated guess based on other factors
              // This is a fallback and might not always be correct
              else if (teamMap.has('localteam') && teamMap.has('visitorteam')) {
                // For now, just assign to localteam as a fallback
                // In a real system, you might want better heuristics
                teamId = teamMap.get('localteam').id;
                teamName = teamMap.get('localteam').name;
                console.log(
                  `Fallback: assigned player ${player.id} to localteam ${teamId}`
                );
              }
            }
          }

          if (!teamId) {
            console.warn(
              `Skipping player ${player.id} with missing team_id in lineup`
            );
            continue;
          }

          // Get the actual team name from match data if it's not set
          if (!teamName) {
            if (
              match.localteam?.id &&
              teamId === match.localteam.id.toString()
            ) {
              teamName = match.localteam.name;
              console.log(
                `Using match localteam name for player ${player.id}: ${teamName}`
              );
            } else if (
              match.visitorteam?.id &&
              teamId === match.visitorteam.id.toString()
            ) {
              teamName = match.visitorteam.name;
              console.log(
                `Using match visitorteam name for player ${player.id}: ${teamName}`
              );
            }
          }

          // Create or update the player in the database
          await prisma.player.upsert({
            where: { sportMonkId: player.id.toString() },
            update: {
              name:
                player.fullname ||
                player.firstname + ' ' + player.lastname ||
                'Unknown Player',
              image: player.image_path || '',
              country: player.country_id?.toString() || '',
              teamId: teamId,
              teamName: teamName || player.team_name || 'Unknown Team',
              role: (player.position_id || player.position?.name || '')
                .toString()
                .toLowerCase(),
              battingStyle: player.batting_style || '',
              bowlingStyle: player.bowling_style || '',
              isActive: true,
            },
            create: {
              id: player.id.toString(),
              sportMonkId: player.id.toString(),
              name:
                player.fullname ||
                player.firstname + ' ' + player.lastname ||
                'Unknown Player',
              image: player.image_path || '',
              country: player.country_id?.toString() || '',
              teamId: teamId,
              teamName: teamName || player.team_name || 'Unknown Team',
              role: (player.position_id || player.position?.name || '')
                .toString()
                .toLowerCase(),
              battingStyle: player.batting_style || '',
              bowlingStyle: player.bowling_style || '',
              isActive: true,
            },
          });

          // --- Add Detailed Logging ---
          console.log(
            `[MatchImport Debug] Player ${player.id} (${player.fullname}) Raw Data Snippet:`,
            {
              lineup: player.lineup, // Log the entire lineup object
              substitute: player.substitute, // Log the direct substitute field
              position: player.position, // Log the position object
              // Add any other potentially relevant fields here
            }
          );
          // --- End Detailed Logging ---

          // Now create or update the MatchPlayer record
          console.log(
            `[MatchImport] Processing player ${player.id} (${
              player.fullname || 'Unknown'
            }):`
          );
          console.log(`- Team ID: ${teamId}`);
          console.log(`- Is Captain: ${player.lineup?.captain === true}`);
          console.log(
            `- Is Substitute (current check): ${
              player.lineup?.substitution === true
            }`
          );
          console.log(
            `- Raw lineup data:`,
            JSON.stringify(player.lineup, null, 2)
          );

          await prisma.matchPlayer.upsert({
            where: {
              matchId_playerId: {
                matchId: createdMatch.id,
                playerId: player.id.toString(),
              },
            },
            update: {
              teamId: teamId,
              selected: true,
              isSubstitute: player.lineup?.substitution === true,
              isCaptain: player.lineup?.captain === true,
              isViceCaptain: false, // Set if available in the API
            },
            create: {
              matchId: createdMatch.id,
              playerId: player.id.toString(),
              teamId: teamId,
              selected: true,
              points: 0, // Initial points
              isCaptain: player.lineup?.captain === true,
              isViceCaptain: false,
              isSubstitute: player.lineup?.substitution === true,
            },
          });
        } catch (error) {
          console.error(
            `Error creating match player for ${player.id} in match ${matchId}:`,
            error
          );
        }
      }

      console.log(`Successfully processed lineup for match ${matchId}`);
    } else {
      console.log(`No lineup data available for match ${matchId}`);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching match details for match ${matchId}:`, error);
    throw error;
  }
};

/**
 * Fetch live matches
 */
export const fetchLiveMatches = async (page = 1, perPage = 10) => {
  try {
    const url = buildApiUrl('/livescores', {
      include: 'localteam,visitorteam,venue,league,scoreboards,batting,bowling',
      filter: 'status:LIVE',
      page: page.toString(),
      per_page: perPage.toString(),
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for live matches:`, errorText);
      return null;
    }

    const data = await response.json();
    const matches = data.data;

    // Create/update each match
    for (const match of matches) {
      try {
        await createMatch(match);
      } catch (error) {
        console.error(`Error creating live match ${match.id}:`, error);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

/**
 * Fetch recent matches
 */
export const fetchRecentMatches = async (page = 1, perPage = 10) => {
  try {
    const { startDate, endDate } = getDateRange(7);
    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league,runs',
      filter: `status:Finished,starting_at:${startDate}...${endDate}`,
      sort: '-starting_at',
      page: page.toString(),
      per_page: perPage.toString(),
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for recent matches:`, errorText);
      return null;
    }

    const data = await response.json();
    const matches = data.data;

    // Create/update each match
    for (const match of matches) {
      try {
        await createMatch({
          ...match,
          status: 'completed',
          endTime: new Date(),
        });
      } catch (error) {
        console.error(`Error creating recent match ${match.id}:`, error);
      }
    }

    return data;
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }
};

/**
 * Fetch upcoming matches
 */
export const fetchUpcomingMatches = async (page = 1, perPage = 10) => {
  try {
    const { startDate, endDate } = getDateRange();
    console.log(
      'Fetching upcoming matches between:',
      startDate,
      'and',
      endDate
    );

    const url = buildApiUrl('/fixtures', {
      include: 'localteam,visitorteam,venue,league',
      filter: `starting_between:${startDate},${endDate}`,
      sort: '-starting_at',
      page: page.toString(),
      per_page: perPage.toString(),
    });

    logApiRequest(url);
    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Response for upcoming matches:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Received matches:', data.data?.length || 0);

    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }

    // Create/update each match
    const matches = data.data;
    const createdMatches = [];

    for (const match of matches) {
      try {
        if (!match.id) {
          console.warn('Skipping match with missing ID');
          continue;
        }

        console.log('Processing match:', match.id);
        const createdMatch = await createMatch(match);
        createdMatches.push(createdMatch);
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
      }
    }

    return {
      ...data,
      createdMatches,
    };
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    return {
      error: true,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };
  }
};
