import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    console.log(
      '[ADMIN] Applying constraint to prevent duplicate contest_win transactions'
    );

    // Define the SQL statements inline for simplicity
    const sqlStatements = [
      `
      CREATE OR REPLACE FUNCTION get_entry_id(metadata jsonb) 
      RETURNS text AS $$
      BEGIN
        RETURN metadata->>'entryId';
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
      `,
      `
      CREATE UNIQUE INDEX IF NOT EXISTS unique_contest_win_entry
      ON "Transaction" (type, get_entry_id(metadata))
      WHERE type = 'contest_win' AND metadata->>'entryId' IS NOT NULL;
      `,
      `
      COMMENT ON INDEX unique_contest_win_entry IS 'Prevents duplicate contest_win transactions for the same entry';
      `,
    ];

    // Execute each SQL statement
    for (const sql of sqlStatements) {
      await prisma.$executeRawUnsafe(sql);
      console.log('[ADMIN] Executed SQL statement successfully');
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction constraint applied successfully',
      details:
        'The database now prevents duplicate contest_win transactions for the same entry',
    });
  } catch (error) {
    console.error('[ADMIN] Error applying transaction constraint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply transaction constraint',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Also support GET requests for easier testing in the browser
export async function GET(request: NextRequest) {
  return POST(request);
}
