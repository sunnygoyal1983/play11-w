import { NextResponse } from 'next/server';
import { fetchLiveMatchDetails } from '@/services/live-scoring-service';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Fetching live data for match: ${params.id}`);

    // Get match from our database first
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
        teamAId: true,
        teamBId: true,
        status: true,
        sportMonkId: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    // If we have a SportMonk ID, use it to fetch live data
    const sportMonkId = match.sportMonkId || params.id;

    // Fetch match details from SportMonk API
    const matchData = await fetchLiveMatchDetails(sportMonkId);

    if (!matchData) {
      return NextResponse.json(
        {
          success: true,
          data: {
            teamAScore: '0/0',
            teamBScore: 'Yet to bat',
            overs: '0.0',
            currentInnings: 1,
            commentary: [],
            currentBatsman1: 'Waiting for data...',
            currentBatsman1Score: '0 (0)',
            currentBatsman2: 'Waiting for data...',
            currentBatsman2Score: '0 (0)',
            currentBowler: 'Waiting for data...',
            currentBowlerFigures: '0/0 (0.0)',
            lastWicket: 'No wickets yet',
            recentOvers: '- - - - - -',
          },
        },
        { status: 200 }
      );
    }

    // Process SportMonk live data
    console.log('Processing SportMonk live data');

    let teamAScore = '0/0';
    let teamBScore = 'Yet to bat';
    let overs = '0.0';
    let currentInnings = 1;
    let commentary: string[] = [];
    let currentBatsman1 = 'Waiting for data...';
    let currentBatsman1Score = '0 (0)';
    let currentBatsman2 = 'Waiting for data...';
    let currentBatsman2Score = '0 (0)';
    let currentBowler = 'Waiting for data...';
    let currentBowlerFigures = '0/0 (0.0)';
    let lastWicket = 'No wickets yet';
    let recentOvers = '- - - - - -';

    // Unwrap data from nested format if needed
    const batting = matchData.batting?.data || matchData.batting || [];
    const bowling = matchData.bowling?.data || matchData.bowling || [];
    const scoreboards =
      matchData.scoreboards?.data || matchData.scoreboards || [];
    const balls = matchData.balls?.data || matchData.balls || [];
    const localteam = matchData.localteam?.data || matchData.localteam;
    const visitorteam = matchData.visitorteam?.data || matchData.visitorteam;

    console.log(
      `Processing data: ${scoreboards.length} scoreboards, ${batting.length} batsmen, ${bowling.length} bowlers, ${balls.length} balls`
    );

    // Get scores from scoreboards
    if (scoreboards && scoreboards.length > 0) {
      // Find team A and team B scoreboard entries
      const teamAScoreboards = scoreboards.filter(
        (sb: any) => sb.team_id.toString() === match.teamAId
      );

      const teamBScoreboards = scoreboards.filter(
        (sb: any) => sb.team_id.toString() === match.teamBId
      );

      // If we can't match by ID, try to match by team name
      if (teamAScoreboards.length === 0 && localteam) {
        const teamAName = match.teamAName.toLowerCase();
        const localTeamName = localteam.name.toLowerCase();

        if (
          localTeamName.includes(teamAName) ||
          teamAName.includes(localTeamName)
        ) {
          console.log(
            `Matched ${match.teamAName} with ${localteam.name} by name`
          );
          const localTeamScoreboards = scoreboards.filter(
            (sb: any) => sb.team_id.toString() === localteam.id.toString()
          );
          if (localTeamScoreboards.length > 0) {
            const latest =
              localTeamScoreboards[localTeamScoreboards.length - 1];
            teamAScore = `${latest.total || 0}/${latest.wickets || 0}`;
            if (latest.overs) {
              overs = latest.overs.toString();
            }
          }
        }
      } else if (teamAScoreboards.length > 0) {
        // Update team A score if available
        const latest = teamAScoreboards[teamAScoreboards.length - 1];
        teamAScore = `${latest.total || 0}/${latest.wickets || 0}`;
        if (latest.overs) {
          overs = latest.overs.toString();
        }
      }

      // Similar approach for team B
      if (teamBScoreboards.length === 0 && visitorteam) {
        const teamBName = match.teamBName.toLowerCase();
        const visitorTeamName = visitorteam.name.toLowerCase();

        if (
          visitorTeamName.includes(teamBName) ||
          teamBName.includes(visitorTeamName)
        ) {
          console.log(
            `Matched ${match.teamBName} with ${visitorteam.name} by name`
          );
          const visitorTeamScoreboards = scoreboards.filter(
            (sb: any) => sb.team_id.toString() === visitorteam.id.toString()
          );
          if (visitorTeamScoreboards.length > 0) {
            const latest =
              visitorTeamScoreboards[visitorTeamScoreboards.length - 1];
            teamBScore = `${latest.total || 0}/${latest.wickets || 0}`;
            if (latest.overs && !teamAScoreboards.length) {
              overs = latest.overs.toString();
            }
          }
        }
      } else if (teamBScoreboards.length > 0) {
        // Update team B score if available
        const latest = teamBScoreboards[teamBScoreboards.length - 1];
        teamBScore = `${latest.total || 0}/${latest.wickets || 0}`;
        if (
          latest.overs &&
          teamBScoreboards.length > 0 &&
          !teamAScoreboards.length
        ) {
          overs = latest.overs.toString();
        }
      }

      // Determine current innings
      currentInnings =
        scoreboards.length > 0 ? Number(scoreboards[0].scoreboard) : 1;
    }

    // Extract current batsmen information from batting data
    if (batting && batting.length > 0) {
      const batsmen = batting.filter((b: any) => b.active && !b.out);

      if (batsmen.length > 0) {
        if (batsmen[0] && batsmen[0].batsman) {
          currentBatsman1 =
            batsmen[0].batsman.fullname ||
            batsmen[0].batsman.name ||
            'Batsman 1';
          currentBatsman1Score = `${batsmen[0].score || 0} (${
            batsmen[0].ball || 0
          })`;
          if (batsmen[0].four) currentBatsman1Score += `, ${batsmen[0].four}x4`;
          if (batsmen[0].six) currentBatsman1Score += `, ${batsmen[0].six}x6`;
        }

        if (batsmen.length > 1 && batsmen[1] && batsmen[1].batsman) {
          currentBatsman2 =
            batsmen[1].batsman.fullname ||
            batsmen[1].batsman.name ||
            'Batsman 2';
          currentBatsman2Score = `${batsmen[1].score || 0} (${
            batsmen[1].ball || 0
          })`;
          if (batsmen[1].four) currentBatsman2Score += `, ${batsmen[1].four}x4`;
          if (batsmen[1].six) currentBatsman2Score += `, ${batsmen[1].six}x6`;
        }
      }

      // Find the last wicket
      const wickets = batting.filter((b: any) => b.out);
      if (wickets.length > 0) {
        const lastWicketData = wickets[wickets.length - 1];
        if (lastWicketData.batsman) {
          const batsmanName =
            lastWicketData.batsman.fullname ||
            lastWicketData.batsman.name ||
            'Unknown';
          lastWicket = `${batsmanName} ${lastWicketData.score || 0} (${
            lastWicketData.ball || 0
          }) - ${lastWicketData.how_out || 'out'}`;
        }
      }
    }

    // Extract current bowler information from bowling data
    if (bowling && bowling.length > 0) {
      const activeBowlers = bowling.filter((b: any) => b.active);

      if (activeBowlers.length > 0 && activeBowlers[0].bowler) {
        const bowler = activeBowlers[0];
        currentBowler =
          bowler.bowler.fullname || bowler.bowler.name || 'Current Bowler';
        currentBowlerFigures = `${bowler.wickets || 0}/${bowler.runs || 0} (${
          bowler.overs || 0
        }.${bowler.medians || 0})`;
      }
    }

    // Extract recent overs from ball-by-ball data if available
    if (balls && balls.length > 0) {
      // Sort balls by their ID to get the most recent ones
      const sortedBalls = [...balls].sort((a, b) => b.id - a.id);
      // Take only the last 6 balls
      const recentBalls = sortedBalls.slice(0, 6).reverse();

      if (recentBalls.length > 0) {
        try {
          // Ensure we're getting a plain string for recent overs
          recentOvers = recentBalls
            .map((ball: any) => {
              console.log('Ball data for recent overs:', JSON.stringify(ball));
              if (ball.is_wicket) return 'W';
              if (ball.is_boundary) return '4';
              if (ball.is_six) return '6';
              // Try multiple paths to get the score
              return ball.score?.toString() || ball.runs?.toString() || '0';
            })
            .join(' ');

          console.log('Processed recent overs:', recentOvers);
        } catch (error) {
          console.error('Error processing recent overs:', error);
          recentOvers = '- - - - - -';
        }
      }
    }

    // Build simple commentary from the last few balls, if available
    if (balls && balls.length > 0) {
      try {
        const sortedBalls = [...balls].sort((a, b) => b.id - a.id);
        // Take only the last 10 balls for commentary
        const commentaryBalls = sortedBalls.slice(0, 10).reverse();

        commentary = commentaryBalls.map((ball: any) => {
          let ballDescription = `${ball.ball || ''}.${
            ball.score || ball.runs || 0
          } ${ball.batsman?.fullname || ball.batsman?.name || 'Batsman'} to ${
            ball.bowler?.fullname || ball.bowler?.name || 'Bowler'
          }`;

          if (ball.is_wicket) {
            ballDescription += ` - WICKET! ${
              ball.out_batsman?.fullname || ball.out_batsman?.name || 'Batsman'
            } ${ball.out_batsman_dismissal || 'out'}`;
          } else if (ball.is_boundary) {
            ballDescription += ' - FOUR!';
          } else if (ball.is_six) {
            ballDescription += ' - SIX!';
          }

          return ballDescription;
        });
      } catch (error) {
        console.error('Error processing commentary:', error);
        commentary = ['Commentary data unavailable'];
      }
    }

    // Return processed data
    return NextResponse.json(
      {
        success: true,
        data: {
          teamAScore,
          teamBScore,
          overs,
          currentInnings,
          commentary,
          currentBatsman1,
          currentBatsman1Score,
          currentBatsman2,
          currentBatsman2Score,
          currentBowler,
          currentBowlerFigures,
          lastWicket,
          recentOvers,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching live match data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live match data' },
      { status: 500 }
    );
  }
}
