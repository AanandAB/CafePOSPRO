#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚚 CafePOSPro Client Data Migration Tool');
console.log('=========================================\n');

// Check if we're in the right directory
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('❌ Error: This script must be run from the project root directory');
  process.exit(1);
}

// Function to prompt user for input
function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('📋 Data Migration Options');
    console.log('------------------------');
    console.log('1. Export data from current deployment');
    console.log('2. Import data to client deployment');
    console.log('3. Both export and import\n');
    
    const choice = await prompt('Select an option (1-3): ');
    
    switch (choice) {
      case '1':
        await exportData();
        break;
      case '2':
        await importData();
        break;
      case '3':
        await exportData();
        await importData();
        break;
      default:
        console.error('❌ Invalid choice. Please select 1, 2, or 3.');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

async function exportData() {
  try {
    console.log('\n📤 Exporting data from current deployment...');
    
    const filename = await prompt('Enter filename for export (default: client-data-backup.zip): ') || 'client-data-backup.zip';
    
    console.log('Running export command...');
    execSync(`npx convex export --file=${filename}`, { stdio: 'inherit' });
    
    console.log(`✅ Data exported successfully to ${filename}`);
    console.log('Please provide this file to the client for import.');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  }
}

async function importData() {
  try {
    console.log('\n📥 Importing data to client deployment...');
    
    // First ensure convex.json is configured for client
    const deploymentName = await prompt('Enter client\'s Convex deployment name: ');
    if (!deploymentName) {
      console.error('❌ Deployment name is required');
      throw new Error('Deployment name required');
    }
    
    const teamName = await prompt('Enter client\'s Convex team name (press Enter if none): ');
    
    // Update convex.json
    const convexConfig = {
      project: deploymentName,
      ...(teamName && { team: teamName })
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'convex.json'),
      JSON.stringify(convexConfig, null, 2)
    );
    
    console.log('✅ Convex configuration updated');
    
    const filename = await prompt('Enter path to data file to import (default: client-data-backup.zip): ') || 'client-data-backup.zip';
    
    if (!fs.existsSync(filename)) {
      console.error(`❌ File ${filename} not found`);
      throw new Error('File not found');
    }
    
    console.log('Running import command...');
    execSync(`npx convex import ${filename}`, { stdio: 'inherit' });
    
    console.log('✅ Data imported successfully');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  main();
}