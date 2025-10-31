#!/usr/bin/env node

const { api } = require("../convex/_generated/api.js");
const { ConvexHttpClient } = require("convex/browser");

// Get the deployment URL from environment variables
const deploymentUrl = process.env.VITE_CONVEX_URL;
if (!deploymentUrl) {
  console.error("VITE_CONVEX_URL environment variable is not set");
  process.exit(1);
}

// Create a client
const client = new ConvexHttpClient(deploymentUrl);

async function testApp() {
  try {
    console.log("Testing CafePOSPro application...");

    // Test ledger query
    const testData = await client.query(api.test.testLedgerQuery);

    if (testData.success) {
      console.log("✅ Application test successful:");
      console.log(`   - Ledger entries: ${testData.ledgerCount}`);
      console.log(`   - Inventory items: ${testData.inventoryCount}`);
      console.log(`   - Staff members: ${testData.staffCount}`);
    } else {
      console.log("❌ Application test failed:");
      console.log(`   - Error: ${testData.error}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    process.exit(1);
  }
}

testApp();
