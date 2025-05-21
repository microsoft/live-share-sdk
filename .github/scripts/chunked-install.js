/**
 * This script performs npm install in smaller chunks to avoid timeouts
 * when downloading and installing a large number of dependencies.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Main function to perform chunked installation
function runChunkedInstall() {
  console.log('Starting chunked npm install process...');
  
  try {
    // First, install only production dependencies
    console.log('\n--- Installing production dependencies ---');
    execSync('npm install --production --no-package-lock', { stdio: 'inherit' });
    
    // Then install dev dependencies
    console.log('\n--- Installing dev dependencies ---');
    execSync('npm install --only=dev', { stdio: 'inherit' });
    
    // Finally install any remaining dependencies and generate package-lock.json
    console.log('\n--- Finalizing installation ---');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n✅ All dependencies installed successfully.');
  } catch (error) {
    console.error('\n❌ Error during installation:', error.message);
    process.exit(1);
  }
}

runChunkedInstall();