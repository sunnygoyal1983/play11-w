import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the contest
    const contest = await prisma.contest.findUnique({
      where: { id: params.id },
      include: {
        entries: true,
        match: true,
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    // Check if contest is full
    if (contest.filledSpots >= contest.totalSpots) {
      return NextResponse.json({ error: 'Contest is full' }, { status: 400 });
    }

    // Check if match has started
    const now = new Date();
    const matchStartTime = new Date(contest.match.startTime);
    if (now >= matchStartTime) {
      return NextResponse.json(
        { error: 'Match has already started' },
        { status: 400 }
      );
    }

    // Verify that the team exists and belongs to the user
    const team = await prisma.fantasyTeam.findUnique({
      where: {
        id: teamId,
        userId: user.id,
        matchId: contest.matchId,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Check if user has already joined this contest with this team
    const existingEntry = await prisma.contestEntry.findFirst({
      where: {
        contestId: params.id,
        userId: user.id,
        fantasyTeamId: teamId,
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'You have already joined this contest with this team' },
        { status: 400 }
      );
    }

    // Check wallet balance
    if (user.walletBalance < contest.entryFee) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Create contest entry and update wallet balance in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      // Atomically deduct only if balance is sufficient
      const walletUpdate = await tx.user.updateMany({
        where: {
          id: user.id,
          walletBalance: { gte: contest.entryFee },
        },
        data: { walletBalance: { decrement: contest.entryFee } },
      });

      if (walletUpdate.count !== 1) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Atomically claim a contest spot only if not full
      const contestUpdate = await tx.contest.updateMany({
        where: {
          id: params.id,
          filledSpots: { lt: contest.totalSpots },
        },
        data: { filledSpots: { increment: 1 } },
      });

      if (contestUpdate.count !== 1) {
        throw new Error('CONTEST_FULL');
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -contest.entryFee,
          type: 'contest_join',
          status: 'completed',
          reference: `Joined contest: ${contest.name}`,
        },
      });

      // Create contest entry
      return tx.contestEntry.create({
        data: {
          contestId: params.id,
          userId: user.id,
          fantasyTeamId: teamId,
        },
      });
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error joining contest:', error);
    if (error instanceof Error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }
      if (error.message === 'CONTEST_FULL') {
        return NextResponse.json({ error: 'Contest is full' }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: 'Failed to join contest' },
      { status: 500 }
    );
  }
}
