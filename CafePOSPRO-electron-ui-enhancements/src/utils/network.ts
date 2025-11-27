/**
 * Utility functions for network operations
 */
import { getBestLocalIP } from "./ipDetection";

/**
 * Get the local IP address of the current device
 * @returns Promise<string> The local IP address
 */
export async function getLocalIPAddress(): Promise<string> {
  try {
    // Try to get IP using our system scripts first
    const scriptIP = await getBestLocalIP();
    if (
      scriptIP &&
      scriptIP !== "127.0.0.1" &&
      isValidIPv4(scriptIP) &&
      isPrivateIP(scriptIP)
    ) {
      return scriptIP;
    }

    // Try to get IP using WebRTC (works in browsers)
    const ip = await getIPFromWebRTC();
    if (ip && isValidIPv4(ip) && isPrivateIP(ip)) {
      return ip;
    }

    // Fallback to window.location if WebRTC fails and it's a valid IPv4
    const host = window.location.hostname;
    if (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      isValidIPv4(host) &&
      isPrivateIP(host)
    ) {
      return host;
    }

    // Try to get all network IPs and find the best one
    const allIPs = await getAllNetworkIPsFromSystem();
    // Prioritize private IPs
    const privateIP = allIPs.find(
      (ip) => isValidIPv4(ip) && ip !== "127.0.0.1" && isPrivateIP(ip)
    );
    if (privateIP) {
      return privateIP;
    }

    // If no private IP found, return the first valid one
    const validIP = allIPs.find((ip) => isValidIPv4(ip) && ip !== "127.0.0.1");
    if (validIP) {
      return validIP;
    }

    // Final fallback to localhost
    return "127.0.0.1";
  } catch (error) {
    console.warn("Error getting local IP address:", error);
    return "127.0.0.1";
  }
}

/**
 * Get network information including local and public IPs
 * @returns Promise<{localIP: string, publicIP?: string}>
 */
export async function getNetworkInfo(): Promise<{
  localIP: string;
  publicIP?: string;
}> {
  try {
    const localIP = await getLocalIPAddress();
    return { localIP };
  } catch (error) {
    console.error("Error getting network info:", error);
    return { localIP: "127.0.0.1" };
  }
}

/**
 * Check if the application is running in a production environment
 * @returns boolean indicating if app is in production
 */
function isProduction(): boolean {
  // In development, we're running on localhost or local IPs
  // In production, we're running on a deployed domain
  const hostname = window.location.hostname;

  // If we're on localhost or a local IP, we're in development
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    isPrivateIP(hostname)
  ) {
    return false;
  }

  // If we're on a deployed domain, we're in production
  return (
    hostname.includes("convex") ||
    hostname.includes("cafepospro") ||
    (typeof import.meta !== "undefined" && import.meta.env?.PROD === true) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production")
  );
}

/**
 * Get the specific IPv4 address for this machine
 * @returns Promise that resolves to the specific IPv4 address
 */
export async function getCurrentIPv4(): Promise<string | null> {
  try {
    // Try to get IP using our system scripts first
    const scriptIP = await getBestLocalIP();
    if (
      scriptIP &&
      scriptIP !== "127.0.0.1" &&
      isValidIPv4(scriptIP) &&
      isPrivateIP(scriptIP)
    ) {
      return scriptIP;
    }

    // Try to get IP using WebRTC (works in browsers)
    const ip = await getIPFromWebRTC();
    if (ip && isValidIPv4(ip) && isPrivateIP(ip)) {
      return ip;
    }

    // Fallback to window.location if WebRTC fails and it's a valid IPv4
    const host = window.location.hostname;
    if (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      isValidIPv4(host) &&
      isPrivateIP(host)
    ) {
      return host;
    }

    // Try to get all network IPs and find the best one
    const allIPs = await getAllNetworkIPsFromSystem();
    // Prioritize private IPs
    const privateIP = allIPs.find(
      (ip) => isValidIPv4(ip) && ip !== "127.0.0.1" && isPrivateIP(ip)
    );
    if (privateIP) {
      return privateIP;
    }

    // If no private IP found, return the first valid one
    const validIP = allIPs.find((ip) => isValidIPv4(ip) && ip !== "127.0.0.1");
    if (validIP) {
      return validIP;
    }

    // Final fallback
    return null;
  } catch (error) {
    console.warn("Error detecting current IP address:", error);
    return null;
  }
}

/**
 * Get all network IPs from the system using WebRTC
 * @returns Promise that resolves to an array of IP addresses
 */
async function getAllNetworkIPsFromSystem(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips: string[] = [];
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.createDataChannel("");

    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;

      const myIP =
        /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(
          ice.candidate.candidate
        );

      if (myIP && myIP[1] && isValidIPv4(myIP[1])) {
        ips.push(myIP[1]);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve([]));

    // Resolve after 3 seconds
    setTimeout(() => {
      pc.close();
      resolve([...new Set(ips)]); // Remove duplicates
    }, 3000);
  });
}

/**
 * Get the appropriate base URL for the application
 * In development: uses local network IP for device access
 * In production: uses the current domain
 * @returns Promise that resolves to the base URL
 */
export async function getAppBaseURL(): Promise<string> {
  // Check if we're in a production environment (Convex hosting)
  if (isProduction()) {
    // In production, use the current domain
    return window.location.origin;
  }

  // In development, use the local network IP
  try {
    const currentIP = await getCurrentIPv4();
    if (currentIP) {
      const port = window.location.port || "5173"; // Use the actual port from the running server
      return `http://${currentIP}:${port}`;
    }

    // Final fallback to localhost
    const port = window.location.port || "5173"; // Use the actual port from the running server
    return `http://localhost:${port}`;
  } catch (error) {
    console.warn(
      "Error detecting IP address, falling back to localhost:",
      error
    );
    const port = window.location.port || "5173"; // Use the actual port from the running server
    return `http://localhost:${port}`;
  }
}

/**
 * Get all network interfaces with IPv4 addresses for development
 * In production, returns just the current domain
 * @returns Promise that resolves to an array of URLs
 */
export async function getAllAccessibleURLs(): Promise<string[]> {
  console.log("getAllAccessibleURLs called");

  // In production, just return the current domain
  if (isProduction()) {
    console.log(
      "Production environment detected, returning origin:",
      window.location.origin
    );
    return [window.location.origin];
  }

  // In development, get all network IPs
  try {
    // Try to get IP using our system scripts first
    const scriptIP = await getBestLocalIP();
    const port = window.location.port || "5173"; // Use the actual port from the running server

    console.log("Script IP:", scriptIP, "Port:", port);

    if (
      scriptIP &&
      scriptIP !== "127.0.0.1" &&
      isValidIPv4(scriptIP) &&
      isPrivateIP(scriptIP)
    ) {
      console.log("Using script IP for URLs");
      // Return the script IP first, then other network IPs, then localhost as fallback
      const urls: string[] = [`http://${scriptIP}:${port}`];

      // Add other network IPs from Vite
      const viteNetworkIPs = getViteNetworkIPs();
      urls.push(
        ...viteNetworkIPs
          .filter((ip) => ip !== scriptIP) // Avoid duplicates
          .map((ip) => `http://${ip}:${port}`)
      );

      // Add localhost as fallback
      urls.push(`http://localhost:${port}`);

      console.log("Generated URLs:", urls);
      return urls;
    }

    // If script IP detection fails, fall back to WebRTC
    const webRTCIP = await getIPFromWebRTC();
    if (
      webRTCIP &&
      webRTCIP !== "127.0.0.1" &&
      isValidIPv4(webRTCIP) &&
      isPrivateIP(webRTCIP)
    ) {
      const port = window.location.port || "5173";
      const urls: string[] = [`http://${webRTCIP}:${port}`];

      // Add other network IPs from Vite
      const viteNetworkIPs = getViteNetworkIPs();
      urls.push(
        ...viteNetworkIPs
          .filter((ip) => ip !== webRTCIP) // Avoid duplicates
          .map((ip) => `http://${ip}:${port}`)
      );

      // Add localhost as fallback
      urls.push(`http://localhost:${port}`);

      console.log("Generated URLs (WebRTC):", urls);
      return urls;
    }

    // If all else fails, fall back to Vite's network IPs
    const viteNetworkIPs = getViteNetworkIPs();
    const urls: string[] = [];

    // Add Vite's network IPs first (these are the ones shown in the terminal)
    urls.push(...viteNetworkIPs.map((ip) => `http://${ip}:${port}`));

    // Add localhost as fallback
    urls.push(`http://localhost:${port}`);

    console.log("Generated URLs (fallback):", urls);
    return urls;
  } catch (error) {
    console.warn(
      "Error getting network URLs, falling back to localhost:",
      error
    );
    const port = window.location.port || "5173"; // Use the actual port from the running server
    const fallbackUrls = [`http://localhost:${port}`];
    console.log("Fallback URLs:", fallbackUrls);
    return fallbackUrls;
  }
}

/**
 * Get network IPs from Vite's detection (from the terminal output)
 * @returns string[] Array of network IPs
 */
function getViteNetworkIPs(): string[] {
  // These are the IPs that Vite shows in the terminal
  // In a real implementation, we would get these dynamically
  // For now, we'll return the IPs that were shown in your terminal output
  return ["192.168.1.18", "192.168.56.1", "192.168.71.2"];
}

/**
 * Get IP address using WebRTC
 * @returns Promise that resolves to the IPv4 address
 */
function getIPFromWebRTC(): Promise<string | null> {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.createDataChannel("");

    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;

      const myIP =
        /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(
          ice.candidate.candidate
        );

      if (myIP && myIP[1] && isValidIPv4(myIP[1])) {
        pc.close();
        resolve(myIP[1]);
        return;
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve(null));

    // Timeout after 5 seconds
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 5000);
  });
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

/**
 * Check if an IP address is private (RFC 1918)
 * @param ip The IP address to check
 * @returns True if private IP, false otherwise
 */
function isPrivateIP(ip: string): boolean {
  if (!isValidIPv4(ip)) return false;

  const parts = ip.split(".").map(Number);

  // 10.x.x.x
  if (parts[0] === 10) return true;

  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;

  // localhost
  if (ip === "127.0.0.1") return true;

  return false;
}
