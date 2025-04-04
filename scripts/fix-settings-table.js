/**
 * Settings Migration Helper
 *
 * This script helps fix the "Cannot read properties of undefined (reading 'findMany')" error
 * by adding the Setting model to your Prisma schema and running the migrations.
 */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

async function main() {
  try {
    log('='.repeat(80), colors.cyan);
    log('🔧 SETTINGS TABLE FIX SCRIPT', colors.cyan);
    log('='.repeat(80), colors.cyan);
    log('This script will help you fix the Settings functionality.\n');

    // Check if prisma schema exists
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
      log('❌ Prisma schema file not found at: ' + schemaPath, colors.red);
      return;
    }

    log('✅ Found Prisma schema file', colors.green);

    // Read the current schema
    let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Check if Setting model already exists in the schema
    if (schemaContent.includes('model Setting {')) {
      log('✅ Setting model already exists in schema', colors.green);
    } else {
      log('⚙️ Adding Setting model to schema...', colors.yellow);

      // Add Setting model to the end of the schema
      const settingModel = `
model Setting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  type        String   @default("string") // string, number, boolean, json
  category    String   @default("general")
  description String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}`;

      schemaContent += settingModel;
      fs.writeFileSync(schemaPath, schemaContent);
      log('✅ Added Setting model to schema', colors.green);
    }

    log('\n📊 Running Prisma generation and migration...', colors.blue);

    try {
      // Generate Prisma client
      log('\n🔷 Generating Prisma client...', colors.blue);
      execSync('npx prisma generate', { stdio: 'inherit' });
      log('✅ Prisma client generated successfully', colors.green);

      // Run migration
      log('\n🔷 Running migration for Setting model...', colors.blue);
      execSync('npx prisma migrate dev --name add_settings_model', {
        stdio: 'inherit',
      });
      log('✅ Migration completed successfully', colors.green);
    } catch (error) {
      log(`\n❌ Error during Prisma commands: ${error.message}`, colors.red);
      log('\n🔶 Manual steps to fix the issue:', colors.yellow);
      log("1. Run 'npx prisma generate'", colors.yellow);
      log(
        "2. Run 'npx prisma migrate dev --name add_settings_model'",
        colors.yellow
      );
      return;
    }

    log('\n🎉 Setup completed successfully!', colors.green);
    log(
      'You should now be able to access the settings page without errors.\n',
      colors.green
    );
    log(
      'If you encounter any issues, try restarting your development server.',
      colors.yellow
    );
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
  }
}

main().catch((error) => {
  log(`\n❌ Unhandled error: ${error.message}`, colors.red);
});
