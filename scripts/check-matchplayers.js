const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMatchPlayers() {
  try {
    const matchId = '65563';

    // Get all players for this match
    const players = await prisma.matchPlayer.findMany({
      where: { matchId },
      include: {
        player: true,
      },
    });

    // Count substitutes and regular players
    const substitutes = players.filter((p) => p.isSubstitute);
    const regularPlayers = players.filter((p) => !p.isSubstitute);

    console.log(`Match ${matchId} has ${players.length} players:`);
    console.log(`- ${regularPlayers.length} regular players`);
    console.log(`- ${substitutes.length} substitutes`);

    // Log the substitutes
    if (substitutes.length > 0) {
      console.log('\nSubstitutes:');
      substitutes.forEach((sub) => {
        console.log(`- ${sub.player.name} (${sub.player.role})`);
      });
    }

    // Group players by team
    const teamAPlayers = players.filter((p) => p.teamId === '6');
    const teamBPlayers = players.filter((p) => p.teamId === '8');

    console.log(`\nTeam A (${teamAPlayers.length} players):`);
    console.log(
      `- Regular: ${teamAPlayers.filter((p) => !p.isSubstitute).length}`
    );
    console.log(
      `- Substitutes: ${teamAPlayers.filter((p) => p.isSubstitute).length}`
    );

    console.log(`\nTeam B (${teamBPlayers.length} players):`);
    console.log(
      `- Regular: ${teamBPlayers.filter((p) => !p.isSubstitute).length}`
    );
    console.log(
      `- Substitutes: ${teamBPlayers.filter((p) => p.isSubstitute).length}`
    );
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMatchPlayers();
