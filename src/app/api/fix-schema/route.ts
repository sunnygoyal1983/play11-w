import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a new instance of PrismaClient to avoid conflicts
const directPrisma = new PrismaClient();

export async function GET() {
  try {
    // 1. First check if the column exists
    const checkColumn = await directPrisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tournament' AND column_name = 'seasonId'
    `;

    const columnExists = Array.isArray(checkColumn) && checkColumn.length > 0;
    console.log('Column exists check:', columnExists, checkColumn);

    // 2. If the column doesn't exist, add it
    if (!columnExists) {
      console.log('Adding seasonId column to Tournament table...');
      await directPrisma.$executeRawUnsafe(`
        ALTER TABLE "Tournament" ADD COLUMN "seasonId" TEXT;
      `);
    }

    // 3. Verify the column was added
    const verifyColumn = await directPrisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Tournament' AND column_name = 'seasonId'
    `;

    // 4. Get a sample of the Tournament table to see the structure
    const sampleData = await directPrisma.$queryRaw`
      SELECT * FROM "Tournament" LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      message: columnExists
        ? 'Column already exists'
        : 'Column added successfully',
      columnCheck: checkColumn,
      verifyColumn,
      sampleData,
      nextStep: 'Now restart your application to refresh the Prisma Client',
    });
  } catch (error) {
    console.error('Error fixing schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix schema',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await directPrisma.$disconnect();
  }
}
