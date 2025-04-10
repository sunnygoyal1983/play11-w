import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Get all matches with names that include "Team A" or "Team B"
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { name: { contains: 'Team A' } },
          { name: { contains: 'Team B' } },
        ],
      },
      select: {
        id: true,
        name: true,
        teamAName: true,
        teamBName: true,
      },
    });

    console.log(`Found ${matches.length} matches with generic team names`);

    // Results arrays
    const updated = [];
    const skipped = [];
    const matchSummariesToCheck = [];

    // Process each match
    for (const match of matches) {
      // Skip if both team names are still generic
      if (match.teamAName === 'Team A' && match.teamBName === 'Team B') {
        console.log(
          `Skipping match ${match.id}: both teamAName and teamBName are generic`
        );
        skipped.push({
          id: match.id,
          name: match.name,
          reason: 'Both team names are still generic',
        });
        matchSummariesToCheck.push(match.id);
        continue;
      }

      // Skip if both team names are empty or null
      if (!match.teamAName && !match.teamBName) {
        console.log(
          `Skipping match ${match.id}: both teamAName and teamBName are empty`
        );
        skipped.push({
          id: match.id,
          name: match.name,
          reason: 'Both team names are empty',
        });
        continue;
      }

      // Create new match name from teamAName and teamBName
      const newTeamAName =
        match.teamAName !== 'Team A' ? match.teamAName : 'Team A';
      const newTeamBName =
        match.teamBName !== 'Team B' ? match.teamBName : 'Team B';

      if (newTeamAName === 'Team A' && newTeamBName === 'Team B') {
        console.log(
          `Skipping match ${match.id}: Couldn't find better team names`
        );
        skipped.push({
          id: match.id,
          name: match.name,
          reason: 'No better team names found',
        });
        continue;
      }

      const newName = `${newTeamAName} vs ${newTeamBName}`;

      // Skip if the name doesn't change
      if (match.name === newName) {
        console.log(`Skipping match ${match.id}: Name already correct`);
        skipped.push({
          id: match.id,
          name: match.name,
          reason: 'Name already in correct format',
        });
        continue;
      }

      // Update the match name
      console.log(
        `Updating match ${match.id} name from "${match.name}" to "${newName}"`
      );
      await prisma.match.update({
        where: { id: match.id },
        data: { name: newName },
      });

      updated.push({
        id: match.id,
        oldName: match.name,
        newName: newName,
      });
    }

    // For matches that were skipped due to generic team names, check their MatchSummary
    const matchSummaryResults = [];

    if (matchSummariesToCheck.length > 0) {
      console.log(
        `Checking ${matchSummariesToCheck.length} match summaries for raw data...`
      );

      for (const matchId of matchSummariesToCheck) {
        try {
          const matchSummary = await prisma.matchSummary.findUnique({
            where: { matchId },
            select: { matchId: true, rawData: true },
          });

          if (!matchSummary || !matchSummary.rawData) {
            matchSummaryResults.push({
              matchId,
              result: 'No match summary or raw data found',
            });
            continue;
          }

          const rawData = matchSummary.rawData as any;
          const hasLocalTeam = !!rawData.localteam;
          const hasVisitorTeam = !!rawData.visitorteam;
          const localTeamName =
            rawData.localteam?.name || rawData.localteam?.code || null;
          const visitorTeamName =
            rawData.visitorteam?.name || rawData.visitorteam?.code || null;

          matchSummaryResults.push({
            matchId,
            hasLocalTeam,
            hasVisitorTeam,
            localTeamName,
            visitorTeamName,
          });

          // If we found valid team names, update the match
          if (localTeamName && visitorTeamName) {
            const newName = `${localTeamName} vs ${visitorTeamName}`;

            await prisma.match.update({
              where: { id: matchId },
              data: {
                name: newName,
                teamAName: localTeamName,
                teamBName: visitorTeamName,
              },
            });

            updated.push({
              id: matchId,
              note: 'Updated from MatchSummary raw data',
              newName: newName,
            });
          }
        } catch (error) {
          console.error(`Error checking match summary for ${matchId}:`, error);
          matchSummaryResults.push({
            matchId,
            error: 'Error checking match summary',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: updated,
      skipped: skipped,
      matchSummaryResults: matchSummaryResults,
      totalUpdated: updated.length,
      totalSkipped: skipped.length,
    });
  } catch (error) {
    console.error('Error fixing match names:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix match names' },
      { status: 500 }
    );
  }
}
