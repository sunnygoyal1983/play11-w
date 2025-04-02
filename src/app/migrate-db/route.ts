import { NextResponse } from 'next/server';
import { prisma } from '@/services/sportmonk';

/**
 * This is a temporary route to run database migrations directly from code
 * It's useful when you can't run the prisma migrate commands
 */
export async function GET() {
  try {
    // Execute raw SQL to add the seasonId column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Tournament" 
      ADD COLUMN IF NOT EXISTS "seasonId" TEXT;
    `);

    // Update all tournaments to get seasonId from the API
    // This will populate tournaments with their season IDs
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE "Tournament"
      SET "seasonId" = "season"
      WHERE "season" ~ '^[0-9]+$' AND "seasonId" IS NULL;
    `);

    // Get the current schema to verify
    const schemaResult = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Tournament';
    `;

    // Get a count of tournaments with season IDs
    const tournamentsWithSeasonId = await prisma.tournament.count({
      where: {
        seasonId: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      schema: schemaResult,
      tournamentsWithSeasonId,
    });
  } catch (error) {
    console.error('Error during database migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database migration failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
