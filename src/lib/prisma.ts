import { PrismaClient } from '@prisma/client';

// Avoid multiple instances during hot reloading in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Export the Prisma client instance
export const prisma = global.prisma || new PrismaClient();

// Prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
