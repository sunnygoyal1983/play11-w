import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
    transactionOptions: {
      maxWait: 10000, // Maximum time to wait for a transaction
      timeout: 30000, // Maximum time a transaction can run
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export { prisma };

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
