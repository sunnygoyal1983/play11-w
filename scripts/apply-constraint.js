// Script to apply the constraint to prevent duplicate contest_win transactions
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyConstraint() {
  console.log(
    'Applying constraint to prevent duplicate contest_win transactions...'
  );

  try {
    // Read the SQL migration file
    const migrationSql = fs.readFileSync(
      path.join(
        __dirname,
        '../prisma/migrations/20240409_prevent_duplicate_contest_win/migration.sql'
      ),
      'utf8'
    );

    // Execute the SQL directly using Prisma's $executeRawUnsafe
    // This is split by semicolon to execute each statement separately
    const statements = migrationSql
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(`${statement};`);
      console.log('Executed SQL statement successfully.');
    }

    console.log('Constraint applied successfully!');
    console.log(
      'You are now protected against duplicate contest_win transactions.'
    );
  } catch (error) {
    console.error('Error applying constraint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
applyConstraint()
  .then(() => {
    console.log('Script completed');
    setTimeout(() => process.exit(0), 1000);
  })
  .catch((err) => {
    console.error('Script execution failed:', err);
    setTimeout(() => process.exit(1), 1000);
  });
