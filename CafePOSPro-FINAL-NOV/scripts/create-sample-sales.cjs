const { ConvexHttpClient } = require("convex/browser");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL);

async function createSampleSales() {
  try {
    console.log("Creating sample order and sale...");

    // Call the mutation to create a sample order and sale
    // Note: We'll need to manually trigger this from the dashboard
    console.log(
      "Please use the Convex Dashboard to run the seed.createSampleOrderAndSale mutation"
    );
    console.log(
      "Alternatively, create an order through the POS system to generate sales data"
    );
  } catch (error) {
    console.error("Error creating sample sales:", error);
  }
}

// Run the function
createSampleSales().catch(console.error);
