#!/usr/bin/env node

// This script is used to import data from SportMonk API to the database
// It can be run from the command line using: npm run import-data

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

console.log('Starting data import process...');

try {
  // Compile TypeScript file
  console.log('Compiling TypeScript...');
  execSync('npx tsc -p scripts/tsconfig.json', {
    stdio: 'inherit'
  });

  // Run the compiled JavaScript file
  console.log('Running data import...');
  execSync('node dist/import-sportmonk-data.js', {
    stdio: 'inherit'
  });

  console.log('Data import completed successfully!');
} catch (error) {
  console.error('Error during data import:', error.message);
  process.exit(1);
}
