// This script runs the Prisma migrations
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Prisma migrations...');

// First check if we have a .env file
if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
  console.log('⚠️ No .env file found. Creating a default one...');

  // Create a minimal .env file for PostgreSQL
  const envContent = `
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/play11?schema=public"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
  `.trim();

  fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
  console.log(
    '✅ Created default .env file. Please update it with your database credentials.'
  );
}

// Run the migrations
console.log('🔄 Running Prisma migrations...');
const migrationResult = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
});

if (migrationResult.status !== 0) {
  console.error('❌ Failed to run migrations. See errors above.');
  process.exit(1);
}

console.log('✅ Migrations applied successfully!');

// Create admin user
console.log('🔄 Ensuring admin user exists...');
const adminResult = spawnSync(
  'npx',
  ['ts-node', 'scripts/create-admin-user.ts'],
  {
    stdio: 'inherit',
    shell: true,
  }
);

if (adminResult.status !== 0) {
  console.error(
    '❌ Failed to create admin user. This may be ok if the database is not accessible yet.'
  );
} else {
  console.log('✅ Admin user check complete.');
}

console.log('');
console.log('==================================================');
console.log('🎉 Setup complete! You can now run the application.');
console.log('==================================================');
console.log('');
console.log('📝 Default admin credentials:');
console.log('   Email: admin@play11.com');
console.log('   Password: admin123');
console.log('');
console.log('⚠️ Remember to change these credentials in production!');
console.log('');
