const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContest() {
  const contestId = 'd9c62fb0-e436-4a61-b412-41fa14a51bed';

  try {
    // Get contest details
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        match: true,
      },
    });

    console.log('Contest Details:');
    console.log({
      id: contest.id,
      name: contest.name,
      matchId: contest.matchId,
      matchStatus: contest.match.status,
      totalPrize: contest.totalPrize,
      winnerCount: contest.winnerCount,
    });

    // Get prize breakup
    const prizeBreakup = await prisma.prizeBreakup.findMany({
      where: { contestId },
      orderBy: { rank: 'asc' },
    });

    console.log('\nPrize Breakup:');
    console.log(prizeBreakup);

    // Get contest entries
    const entries = await prisma.contestEntry.findMany({
      where: { contestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            walletBalance: true,
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    console.log('\nEntries:');
    entries.forEach((entry) => {
      console.log({
        id: entry.id,
        rank: entry.rank,
        points: entry.points,
        winAmount: entry.winAmount,
        userId: entry.userId,
        userName: entry.user.name,
        userEmail: entry.user.email,
        userRole: entry.user.role,
        userWalletBalance: entry.user.walletBalance,
      });
    });

    // Check for admin user
    const adminEntry = entries.find((e) => e.user.role === 'ADMIN');
    if (adminEntry) {
      console.log('\nAdmin Entry:');
      console.log({
        id: adminEntry.id,
        rank: adminEntry.rank,
        points: adminEntry.points,
        winAmount: adminEntry.winAmount,
      });

      // Check for transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          userId: adminEntry.userId,
          type: 'contest_win',
          reference: {
            contains: `Contest Win: ${contest.name}`,
          },
        },
      });

      console.log('\nAdmin Transaction:');
      console.log(transaction || 'No transaction found');

      // Check error logs
      const errorLog = await prisma.setting.findFirst({
        where: {
          key: {
            contains: `failed_contest_win_${adminEntry.id}`,
          },
          category: 'error_log',
        },
      });

      console.log('\nError Log:');
      console.log(errorLog ? JSON.parse(errorLog.value) : 'No error log found');
    }
  } catch (error) {
    console.error('Error checking contest:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkContest().catch(console.error);
