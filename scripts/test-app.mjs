#!/usr/bin/env node

import { api } from "../convex/_generated/api.js";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

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
    let testData = await client.query(api.test.testLedgerQuery);

    if (testData.success) {
      console.log("✅ Initial application test successful:");
      console.log(`   - Ledger entries: ${testData.ledgerCount}`);
      console.log(`   - Inventory items: ${testData.inventoryCount}`);
      console.log(`   - Staff members: ${testData.staffCount}`);
    } else {
      console.log("❌ Initial application test failed:");
      console.log(`   - Error: ${testData.error}`);
    }

    // Test adding a ledger entry
    console.log("\nTesting ledger entry creation...");
    const newLedgerEntry = await client.mutation(api.test.testAddLedgerEntry, {
      type: "expense",
      amount: 500,
      category: "Utilities",
      description: "Electricity bill",
      date: Date.now(),
    });

    if (newLedgerEntry.success) {
      console.log("✅ Ledger entry added successfully");

      // Test ledger query again to see if count increased
      testData = await client.query(api.test.testLedgerQuery);
      if (testData.success) {
        console.log("✅ Updated application test successful:");
        console.log(`   - Ledger entries: ${testData.ledgerCount}`);
        console.log(`   - Inventory items: ${testData.inventoryCount}`);
        console.log(`   - Staff members: ${testData.staffCount}`);
      }
    } else {
      console.log("❌ Failed to add ledger entry:");
      console.log(`   - Error: ${newLedgerEntry.error}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    process.exit(1);
  }
}

testApp();
