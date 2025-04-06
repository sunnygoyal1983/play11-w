import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get total count of users
    const userCount = await prisma.user.count();

    // Get total count of matches
    const matchCount = await prisma.match.count();

    // Get contests info
    const contestCount = await prisma.contest.count();
    const contestStats = await prisma.contest.aggregate({
      _sum: {
        prizePool: true,
        entryFee: true,
      },
    });

    // Get total user fantasy teams
    const teamCount = await prisma.fantasyTeam.count();

    // Get total cricket players
    const playerCount = await prisma.player.count();

    // Calculate revenue (contest entry fees)
    const totalContestJoins = await prisma.contestEntry.count();
    const contestEntriesRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'contest_join',
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total deposits
    const depositRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'deposit',
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    // Get recent 5 users
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        walletBalance: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Get upcoming matches
    const upcomingMatches = await prisma.match.findMany({
      where: {
        status: 'upcoming',
        startTime: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        format: true,
        venue: true,
        startTime: true,
        _count: {
          select: {
            contests: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });

    // Format the upcoming matches data
    const formattedUpcomingMatches = upcomingMatches.map((match) => ({
      id: match.id,
      name: match.name,
      format: match.format,
      venue: match.venue,
      startTime: match.startTime,
      contestCount: match._count.contests,
    }));

    // Get total revenue - absolute sum of contest join amounts
    const totalRevenue =
      Math.abs(Number(contestEntriesRevenue._sum.amount) || 0) +
      Number(depositRevenue._sum.amount || 0);

    return NextResponse.json({
      stats: {
        users: userCount,
        matches: matchCount,
        contests: contestCount,
        teams: teamCount,
        players: playerCount,
        revenue: totalRevenue,
        prizePool: contestStats._sum.prizePool || 0,
      },
      recentUsers: recentUsers.map((user) => ({
        ...user,
        joinedAt: user.createdAt,
      })),
      upcomingMatches: formattedUpcomingMatches,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
