// Test script to verify IP detection is working
console.log("Testing IP detection functions...");

// Import and test the network functions
import("./src/utils/network.ts")
  .then(async (networkModule) => {
    try {
      console.log("Testing getAllAccessibleURLs...");
      const urls = await networkModule.getAllAccessibleURLs();
      console.log("Detected URLs:", urls);

      console.log("Testing getBestLocalIP...");
      const bestIP = await networkModule.getBestLocalIP();
      console.log("Best local IP:", bestIP);

      console.log("Testing isProduction...");
      const isProd = networkModule.isProduction();
      console.log("Is production:", isProd);
    } catch (error) {
      console.error("Error testing network functions:", error);
    }
  })
  .catch((error) => {
    console.error("Error importing network module:", error);
  });
