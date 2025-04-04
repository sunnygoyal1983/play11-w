import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

/**
 * This script creates a default admin user if one doesn't already exist.
 * It ensures there's always at least one admin in the system.
 */
async function main() {
  console.log('Checking for admin users...');

  const prisma = new PrismaClient();

  try {
    // Admin credentials - you would want to change these in production
    const adminEmail = 'admin@play11.com';
    const adminPassword = 'admin123'; // This should be more secure in production!
    const adminName = 'Admin User';

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('Admin user already exists.');

      // Ensure the user has the admin role
      if (existingAdmin.role !== UserRole.ADMIN) {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { role: UserRole.ADMIN },
        });
        console.log('Updated existing user to admin role.');
      }
    } else {
      // Create new admin user
      const hashedPassword = await hash(adminPassword, 12);

      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });

      console.log('Created new admin user:', newAdmin.email);
    }

    // List all admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
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
    console.error('Error creating/checking admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
