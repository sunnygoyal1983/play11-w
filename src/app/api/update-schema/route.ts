import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/services/sportmonk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

// Convert exec to use Promises
const execPromise = util.promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const generateClient = searchParams.get('generateClient') === 'true';

    // Execute the schema update
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Tournament" 
      ADD COLUMN IF NOT EXISTS "seasonId" TEXT;
    `);

    // Get the current database schema structure
    const schemaResult = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Tournament'
      ORDER BY ordinal_position;
    `;

    // Create a temporary schema.prisma file with the updated schema
    const prismaSchemaPath = path.join(
      process.cwd(),
      'prisma',
      'schema.prisma'
    );

    // Read existing schema
    let schema = fs.readFileSync(prismaSchemaPath, 'utf-8');

    // Check if seasonId already exists in the schema
    if (!schema.includes('seasonId')) {
      // Add the seasonId field to the Tournament model in the schema
      schema = schema.replace('model Tournament {', 'model Tournament {');

      schema = schema.replace(
        'season      String?',
        'season      String?\n  seasonId    String?'
      );

      // Write the updated schema back to the file
      fs.writeFileSync(prismaSchemaPath, schema, 'utf-8');
    }

    // Check if we should try to regenerate the client
    let regenerateResult = null;
    if (generateClient) {
      try {
        // Try to run the prisma generate command
        console.log('Attempting to regenerate Prisma client...');
        regenerateResult = await execPromise('npx prisma generate', {
          cwd: process.cwd(),
        });
        console.log('Prisma client regenerated successfully');
      } catch (genError: unknown) {
        console.error('Error regenerating Prisma client:', genError);
        regenerateResult = {
          error:
            genError instanceof Error ? genError.message : String(genError),
          success: false,
        };
      }
    }

    // Create a workaround for client generation
    const workaroundFilePath = path.join(
      process.cwd(),
      'prisma',
      'workaround.js'
    );
    fs.writeFileSync(
      workaroundFilePath,
      `
// This file is a workaround to help regenerate the Prisma client
// Run this file with: node prisma/workaround.js
const { execSync } = require('child_process');
console.log('Regenerating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma client regenerated successfully!');
} catch (error) {
  console.error('Error regenerating Prisma client:', error);
  process.exit(1);
}
`,
      'utf8'
    );

    // Get tournament count
    const tournamentCount = await prisma.tournament.count();

    return NextResponse.json({
      success: true,
      message: 'Schema updated successfully',
      schema: schemaResult,
      tournamentCount,
      clientRegeneration: regenerateResult,
      note: `To regenerate the Prisma client, run "node prisma/workaround.js" in your terminal or visit /api/update-schema?generateClient=true`,
      workaround:
        'A workaround file was created at prisma/workaround.js to help regenerate the client',
    });
  } catch (error) {
    console.error('Error updating schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Schema update failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
