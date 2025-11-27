import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function createSampleSales() {
  try {
    console.log("Creating sample order and sale...");
    
    // Call the mutation to create a sample order and sale
    const result = await client.mutation(api.seed.createSampleOrderAndSale, {});
    console.log(result);
    
    console.log("Sample order and sale created successfully!");
  } catch (error) {
    console.error("Error creating sample sales:", error);
  }
}

// Run the function
createSampleSales().catch(console.error);