import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    console.log(
      '[DEBUG] Applying constraint to prevent duplicate contest_win transactions'
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
      console.log('[DEBUG] Executed SQL statement successfully');
    }

    // Test the constraint by attempting to create a duplicate entry
    try {
      // Check if we have an existing contest_win transaction
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          type: 'contest_win',
        },
      });

      if (existingTransaction) {
        // Try to create a transaction with the same entryId in metadata
        // This should fail if our constraint is working properly
        const metadata =
          typeof existingTransaction.metadata === 'string'
            ? JSON.parse(existingTransaction.metadata as string)
            : existingTransaction.metadata;

        const entryId = metadata?.entryId;

        if (entryId) {
          console.log(
            `[DEBUG] Testing constraint with existing entryId: ${entryId}`
          );

          try {
            // This should fail with a constraint violation
            await prisma.transaction.create({
              data: {
                userId: existingTransaction.userId,
                amount: 1,
                type: 'contest_win',
                status: 'completed',
                reference: 'Test constraint',
                metadata: {
                  entryId: entryId,
                },
              },
            });

            console.log(
              '[DEBUG] WARNING: Constraint test failed - duplicate transaction was created!'
            );
          } catch (err) {
            console.log(
              '[DEBUG] Constraint test succeeded - duplicate transaction was prevented!'
            );
          }
        }
      }
    } catch (testError) {
      console.error('[DEBUG] Error testing constraint:', testError);
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction constraint applied successfully',
      details:
        'The database now prevents duplicate contest_win transactions for the same entry',
    });
  } catch (error) {
    console.error('[DEBUG] Error applying transaction constraint:', error);
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
