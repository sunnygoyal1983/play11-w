import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      // Deduct entry fee from wallet
      await tx.user.update({
        where: { id: user.id },
        data: { walletBalance: { decrement: contest.entryFee } },
      });

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

      // Update contest filled spots
      await tx.contest.update({
        where: { id: params.id },
        data: { filledSpots: { increment: 1 } },
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
    return NextResponse.json(
      { error: 'Failed to join contest' },
      { status: 500 }
    );
  }
}
