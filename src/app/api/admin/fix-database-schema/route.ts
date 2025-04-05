import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * This endpoint fixes database schema issues by directly running SQL queries
 * It's useful when Prisma migrations fail or when you need to quickly add missing columns
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Check if we need to add the substitute columns to MatchLineup table
    const results = [];
    let needsMigration = false;

    try {
      // Try to query the new columns - if this fails, we need to add them
      await prisma.$queryRaw`SELECT "teamASubstitutes" FROM "MatchLineup" LIMIT 1`;
      results.push('teamASubstitutes column exists - no changes needed');
    } catch (error) {
      console.log('teamASubstitutes column does not exist, will add it');
      needsMigration = true;
    }

    if (!needsMigration) {
      return NextResponse.json({
        success: true,
        message: 'Database schema is already up to date',
        results,
      });
    }

    // Add the missing columns
    try {
      // Add teamASubstitutes column
      await prisma.$executeRaw`ALTER TABLE "MatchLineup" ADD COLUMN IF NOT EXISTS "teamASubstitutes" JSONB`;
      results.push('Added teamASubstitutes column');
    } catch (error) {
      console.error('Error adding teamASubstitutes column:', error);
      results.push(
        `Error adding teamASubstitutes column: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    try {
      // Add teamBSubstitutes column
      await prisma.$executeRaw`ALTER TABLE "MatchLineup" ADD COLUMN IF NOT EXISTS "teamBSubstitutes" JSONB`;
      results.push('Added teamBSubstitutes column');
    } catch (error) {
      console.error('Error adding teamBSubstitutes column:', error);
      results.push(
        `Error adding teamBSubstitutes column: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Update all existing rows to set the new columns to empty arrays
    try {
      await prisma.$executeRaw`UPDATE "MatchLineup" SET "teamASubstitutes" = '[]'::jsonb, "teamBSubstitutes" = '[]'::jsonb WHERE "teamASubstitutes" IS NULL OR "teamBSubstitutes" IS NULL`;
      results.push('Updated existing rows with default values');
    } catch (error) {
      console.error('Error updating existing rows:', error);
      results.push(
        `Error updating existing rows: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // Run Prisma generateClient to update the client
    try {
      results.push(
        '⚠️ Note: You should run "npx prisma generate" to update the Prisma client'
      );
    } catch (error) {
      console.error('Error generating Prisma client:', error);
      results.push(
        `Error generating Prisma client: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema has been updated',
      results,
    });
  } catch (error) {
    console.error('Error fixing database schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix database schema',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
