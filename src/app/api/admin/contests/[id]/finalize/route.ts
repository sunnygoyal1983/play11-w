import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

/**
 * POST - Finalize contest rankings and distribute prizes
 * This endpoint should be called when a match is completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const contestId = params.id;

    // Check if the contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        match: true,
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Check if match is completed
    if (contest.match.status !== 'completed') {
      return NextResponse.json(
        { error: 'Match must be completed to finalize contest' },
        { status: 400 }
      );
    }

    // Get all entries for this contest
    const entries = await prisma.contestEntry.findMany({
      where: { contestId },
      include: {
        fantasyTeam: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries found for this contest' },
        { status: 404 }
      );
    }

    // Calculate points for each team
    const entriesWithPoints = await Promise.all(
      entries.map(async (entry) => {
        // Calculate total points for the team
        let totalPoints = 0;

        // Get player statistics for this match
        for (const teamPlayer of entry.fantasyTeam.players) {
          const playerStats = await prisma.playerStatistic.findUnique({
            where: {
              matchId_playerId: {
                matchId: contest.matchId,
                playerId: teamPlayer.playerId,
              },
            },
          });

          if (playerStats) {
            // Apply captain/vice-captain multiplier
            let points = playerStats.points;
            if (teamPlayer.isCaptain) {
              points *= 2; // 2x for captain
            } else if (teamPlayer.isViceCaptain) {
              points *= 1.5; // 1.5x for vice-captain
            }
            totalPoints += points;
          }
        }

        return {
          ...entry,
          calculatedPoints: totalPoints,
        };
      })
    );

    // Sort entries by points (descending)
    const sortedEntries = entriesWithPoints.sort(
      (a, b) => b.calculatedPoints - a.calculatedPoints
    );

    // Assign ranks and determine prize winners
    const rankedEntries = sortedEntries.map((entry, index) => {
      // Assign rank (1-based)
      const rank = index + 1;
      return { ...entry, rank };
    });

    // Get prize breakup for this contest
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    // Transaction to update entries and distribute prizes
    const operations = [];

    for (const entry of rankedEntries) {
      // Update the entry with rank and points
      operations.push(
        prisma.contestEntry.update({
          where: { id: entry.id },
          data: {
            rank: entry.rank,
            points: entry.calculatedPoints,
          },
        })
      );

      // Distribute prizes to winners
      const prizeForRank = prizeBreakup.find((p) => p.rank === entry.rank);
      if (prizeForRank) {
        const winAmount = prizeForRank.prize;

        // Update the contest entry with win amount
        operations.push(
          prisma.contestEntry.update({
            where: { id: entry.id },
            data: {
              winAmount,
            },
          })
        );

        // Add to user wallet
        operations.push(
          prisma.user.update({
            where: { id: entry.userId },
            data: {
              walletBalance: {
                increment: winAmount,
              },
            },
          })
        );

        // Create transaction record
        operations.push(
          prisma.transaction.create({
            data: {
              userId: entry.userId,
              amount: winAmount,
              type: 'contest_win',
              status: 'completed',
              reference: `Contest Win: ${contest.name} - Rank ${entry.rank}`,
            },
          })
        );
      }
    }

    // Execute all operations in a transaction
    await prisma.$transaction(operations);

    return NextResponse.json({
      message: 'Contest finalized successfully',
      totalEntries: rankedEntries.length,
      totalPrizesDistributed: prizeBreakup.reduce((sum, p) => sum + p.prize, 0),
    });
  } catch (error) {
    console.error('Error finalizing contest:', error);
    return NextResponse.json(
      { error: 'Failed to finalize contest' },
      { status: 500 }
    );
  }
}
