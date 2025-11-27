/**
 * Utility functions for IP detection using system scripts
 * These functions are designed to work in an Electron environment
 */

/**
 * Check if we're running in an Electron environment
 * @returns boolean indicating if we're in Electron
 */
function isElectron(): boolean {
  // Check if we're in an Electron environment
  return typeof window !== "undefined" && !!(window as any).electronAPI;
}

/**
 * Check if we're running in a Node.js environment
 * @returns boolean indicating if we're in Node.js
 */
function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    !!process.versions &&
    !!process.versions.node
  );
}

/**
 * Get local IP using Python script
 * @returns Promise<string> The local IP address
 */
export async function getLocalIPFromPython(): Promise<string | null> {
  try {
    // In an Electron environment, this would execute the Python script
    if (isElectron()) {
      // Use the Electron API to execute the Python script
      const result = await (window as any).electronAPI.executePythonScript();
      if (result && result.success && result.local_ip) {
        return result.local_ip;
      }
    } else if (isNode()) {
      // For development/testing, try to execute directly in Node.js environment
      try {
        // Dynamically import child_process only in Node.js environment
        const { execSync } = await import("child_process");
        const output = execSync("python scripts/get_local_ip.py", {
          encoding: "utf8",
        });
        const result = JSON.parse(output);
        if (result && result.local_ip) {
          return result.local_ip;
        }
      } catch (execError) {
        console.warn("Failed to execute Python script directly:", execError);
      }
    }

    // For browser environments, return null to fall back to other methods
    return null;
  } catch (error) {
    console.warn("Failed to get IP from Python script:", error);
    return null;
  }
}

/**
 * Get local IP using PowerShell script
 * @returns Promise<string> The local IP address
 */
export async function getLocalIPFromPowerShell(): Promise<string | null> {
  try {
    // In an Electron environment, this would execute the PowerShell script
    if (isElectron()) {
      // Use the Electron API to execute the PowerShell script
      const result = await (
        window as any
      ).electronAPI.executePowerShellScript();
      if (result && result.success && result.local_ip) {
        return result.local_ip;
      }
    } else if (isNode()) {
      // For development/testing, try to execute directly in Node.js environment
      try {
        // Dynamically import child_process only in Node.js environment
        const { execSync } = await import("child_process");
        const output = execSync(
          "powershell -ExecutionPolicy Bypass -File scripts/get_local_ip.ps1",
          { encoding: "utf8" }
        );
        const result = JSON.parse(output);
        if (result && result.local_ip) {
          return result.local_ip;
        }
      } catch (execError) {
        console.warn(
          "Failed to execute PowerShell script directly:",
          execError
        );
      }
    }

    // For browser environments, return null to fall back to other methods
    return null;
  } catch (error) {
    console.warn("Failed to get IP from PowerShell script:", error);
    return null;
  }
}

/**
 * Get the best local IP address using available methods
 * @returns Promise<string> The local IP address
 */
export async function getBestLocalIP(): Promise<string> {
  try {
    // Try Python script first
    const pythonIP = await getLocalIPFromPython();
    if (pythonIP && pythonIP !== "127.0.0.1" && isValidIPv4(pythonIP)) {
      return pythonIP;
    }

    // Try PowerShell script
    const psIP = await getLocalIPFromPowerShell();
    if (psIP && psIP !== "127.0.0.1" && isValidIPv4(psIP)) {
      return psIP;
    }

    // Fall back to other methods
    return "127.0.0.1";
  } catch (error) {
    console.warn("Failed to get local IP, falling back to localhost:", error);
    return "127.0.0.1";
  }
}

/**
 * Check if a string is a valid IPv4 address
 * @param ip The IP address to validate
 * @returns True if valid IPv4, false otherwise
 */
function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split(".");
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}
