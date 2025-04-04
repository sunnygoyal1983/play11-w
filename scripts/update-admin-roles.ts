import { PrismaClient } from '@prisma/client';

/**
 * This script updates existing admin users with the ADMIN role
 * It should be run after applying the add_user_role migration
 */
async function main() {
  console.log('Starting admin role update script...');

  const prisma = new PrismaClient();

  try {
    // List of admin emails
    const adminEmails = ['admin@play11.com', 'admin@example.com'];

    // Update users with admin emails to have ADMIN role
    const result = await prisma.user.updateMany({
      where: {
        email: {
          in: adminEmails,
        },
      },
      data: {
        role: 'ADMIN',
      },
    });

    console.log(`Updated ${result.count} users to ADMIN role.`);

    // Display the current admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log('Current admin users:');
    console.table(adminUsers);
  } catch (error) {
    console.error('Error updating admin roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
