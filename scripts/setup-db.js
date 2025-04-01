const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Reset the database
    console.log('Resetting database...');
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run migrations
    console.log('Running migrations...');
    execSync('npx prisma migrate dev --name add_tournament_model', {
      stdio: 'inherit',
    });

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
