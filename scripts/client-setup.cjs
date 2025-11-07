#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 CafePOSPro Client Setup Script');
console.log('=====================================\n');

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
    console.log('📋 Step 1: Client Convex Configuration');
    console.log('--------------------------------------');
    
    const deploymentName = await prompt('Enter the client\'s Convex deployment name: ');
    if (!deploymentName) {
      console.error('❌ Deployment name is required');
      process.exit(1);
    }
    
    const teamName = await prompt('Enter the client\'s Convex team name (press Enter if none): ');
    
    // Update convex.json
    const convexConfig = {
      project: deploymentName,
      ...(teamName && { team: teamName })
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'convex.json'),
      JSON.stringify(convexConfig, null, 2)
    );
    
    console.log('✅ Convex configuration updated\n');
    
    console.log('🔐 Step 2: Authentication Setup');
    console.log('------------------------------');
    
    console.log('Running authentication setup...');
    execSync('npx @convex-dev/auth', { stdio: 'inherit' });
    
    console.log('✅ Authentication configured\n');
    
    console.log('📦 Step 3: Install Dependencies');
    console.log('------------------------------');
    
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed\n');
    
    console.log('🚀 Step 4: Deployment');
    console.log('--------------------');
    
    const deployChoice = await prompt('Deploy to Convex now? (y/N): ');
    if (deployChoice.toLowerCase() === 'y') {
      console.log('Deploying to Convex...');
      execSync('npx convex deploy', { stdio: 'inherit' });
      console.log('✅ Application deployed successfully\n');
    } else {
      console.log('Skipping deployment. You can deploy later with: npx convex deploy\n');
    }
    
    console.log('📚 Step 5: Next Steps for Client');
    console.log('-------------------------------');
    console.log('1. Provide the client with the following information:');
    console.log(`   - Convex Dashboard URL: https://dashboard.convex.dev/d/${deploymentName}`);
    console.log('   - Application URL (after deployment): https://' + deploymentName + '.convex.cloud');
    console.log('2. Instruct client to set environment variables in Convex dashboard:');
    console.log('   - JWT_PRIVATE_KEY (from .env.local file)');
    console.log('   - SITE_URL (https://' + deploymentName + '.convex.cloud)');
    console.log('3. Client can access the application at the URL above');
    console.log('4. First user to register will be the admin');
    
    console.log('\n✅ Client setup completed successfully!');
    console.log('📄 Refer to DEPLOYMENT.md for detailed instructions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}