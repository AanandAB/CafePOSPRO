#!/usr/bin/env node

// Test Electron integration
console.log("Testing Electron integration...");

// Simulate Electron environment
const mockElectronAPI = {
  getNetworkInterfaces: async () => {
    // Return mock network interfaces
    return {
      success: true,
      interfaces: ["192.168.56.1", "192.168.71.2", "192.168.1.10", "localhost"],
    };
  },
};

// Simulate window object
global.window = {
  location: {
    hostname: "localhost",
    port: "5173",
  },
  electronAPI: mockElectronAPI,
};

console.log("Window location:", global.window.location);

// Test the network interface detection
async function testNetworkDetection() {
  try {
    if (
      global.window.electronAPI &&
      typeof global.window.electronAPI.getNetworkInterfaces === "function"
    ) {
      const result = await global.window.electronAPI.getNetworkInterfaces();
      console.log("Network interfaces result:", result);

      if (result.success && Array.isArray(result.interfaces)) {
        const validIPs = result.interfaces.filter(
          (ip) =>
            ip !== "127.0.0.1" &&
            ip !== "localhost" &&
            ip.includes(".") &&
            !ip.startsWith("169.254.")
        );

        console.log("Valid IPs:", validIPs);

        if (validIPs.length > 0) {
          console.log("Selected IP for QR codes:", validIPs[0]);
        } else {
          console.log("Falling back to localhost");
        }
      }
    } else {
      console.log("Electron API not available");
    }
  } catch (error) {
    console.error("Error testing network detection:", error);
  }
}

testNetworkDetection();
