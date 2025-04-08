const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAdminPrize() {
  const contestId = 'd9c62fb0-e436-4a61-b412-41fa14a51bed';

  try {
    console.log(`Fixing prizes for contest: ${contestId}`);

    // Get contest details
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { match: true },
    });

    if (!contest) {
      console.log('Contest not found');
      return;
    }

    console.log(`Found contest: ${contest.name}`);

    // Get prize breakup
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    if (prizeBreakup.length === 0) {
      console.log('No prize breakup found for this contest');
      return;
    }

    // Get admin entries with winAmount=0
    const adminEntries = await prisma.contestEntry.findMany({
      where: {
        contestId,
        winAmount: 0,
        user: {
          role: 'ADMIN',
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${adminEntries.length} admin entries with winAmount=0`);

    // Process each admin entry
    for (const entry of adminEntries) {
      // Find the matching prize for the admin's rank
      const prize = prizeBreakup.find((p) => {
        // Handle rank as string or string range
        if (p.rank.includes('-')) {
          const [start, end] = p.rank.split('-').map(Number);
          return entry.rank >= start && entry.rank <= end;
        } else {
          return parseInt(p.rank) === entry.rank;
        }
      });

      if (!prize) {
        console.log(`No prize found for rank ${entry.rank}`);
        continue;
      }

      console.log(`Found prize for rank ${entry.rank}: ${prize.prize}`);

      // 1. Update the contest entry winAmount
      await prisma.contestEntry.update({
        where: { id: entry.id },
        data: { winAmount: prize.prize },
      });

      console.log(`Updated contest entry winAmount to ${prize.prize}`);

      // 2. Check if a transaction already exists
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          userId: entry.userId,
          type: 'contest_win',
          reference: {
            contains: `Contest Win: ${contest.name}`,
          },
        },
      });

      if (existingTransaction) {
        console.log(
          'Transaction already exists, skipping transaction creation'
        );
        continue;
      }

      // 3. Update wallet balance
      await prisma.user.update({
        where: { id: entry.userId },
        data: {
          walletBalance: {
            increment: prize.prize,
          },
        },
      });

      console.log(`Updated wallet balance for user ${entry.user.name}`);

      // 4. Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: entry.userId,
          amount: prize.prize,
          type: 'contest_win',
          status: 'completed',
          reference: `Contest Win: ${contest.name} - Rank ${entry.rank} (manual fix)`,
        },
      });

      console.log(`Created transaction record: ${transaction.id}`);
    }

    console.log('Fix completed successfully');
  } catch (error) {
    console.error('Error fixing admin prizes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPrize().catch(console.error);
