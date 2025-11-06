/**
 * Check if the application is running in a production environment
 * @returns boolean indicating if app is in production
 */
function isProduction(): boolean {
  // Check for Convex production environment
  return (
    import.meta.env?.PROD === true || 
    window.location.hostname.includes('convex') ||
    window.location.hostname.includes('cafepospro') ||
    (!window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1'))
  );
}

/**
 * Get the specific IPv4 address for this machine (192.168.1.10)
 * @returns Promise that resolves to the specific IPv4 address
 */
export async function getCurrentIPv4(): Promise<string | null> {
  try {
    // First, try to get the specific IP address 192.168.1.10
    const targetIP = '192.168.1.10';
    
    // Check if this IP is available on the network
    const isAvailable = await isIPAvailable(targetIP);
    if (isAvailable) {
      return targetIP;
    }
    
    // Try to get IP using WebRTC (works in browsers)
    const ip = await getIPFromWebRTC();
    if (ip && isValidIPv4(ip)) {
      // If we get a 192.168.x.x IP, use it
      if (ip.startsWith('192.168.')) {
        return ip;
      }
    }
    
    // Fallback to window.location if WebRTC fails and it's a valid IPv4
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && isValidIPv4(host)) {
      // If host is a 192.168.x.x IP, use it
      if (host.startsWith('192.168.')) {
        return host;
      }
    }
    
    // Final fallback to the target IP
    return targetIP;
  } catch (error) {
    console.warn('Error detecting current IP address:', error);
    // Always fallback to the target IP
    return '192.168.1.10';
  }
}

/**
 * Check if a specific IP address is available on this device
 * @param targetIP The IP address to check
 * @returns Promise that resolves to true if IP is available
 */
async function isIPAvailable(targetIP: string): Promise<boolean> {
  try {
    // Try to get all network IPs and check if target IP is among them
    const allIPs = await getAllNetworkIPsFromSystem();
    return allIPs.includes(targetIP);
  } catch (error) {
    console.warn(`Could not check if IP ${targetIP} is available:`, error);
    return false;
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;
      
      const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(
        ice.candidate.candidate
      );
      
      if (myIP && myIP[1] && isValidIPv4(myIP[1])) {
        ips.push(myIP[1]);
      }
    };
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
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
  
  // In development, use the specific IPv4 address
  try {
    const currentIP = await getCurrentIPv4();
    if (currentIP) {
      const port = window.location.port || "5173";
      return `http://${currentIP}:${port}`;
    }
    
    // Final fallback to localhost
    const port = window.location.port || "5173";
    return `http://localhost:${port}`;
  } catch (error) {
    console.warn('Error detecting IP address, falling back to localhost:', error);
    const port = window.location.port || "5173";
    return `http://localhost:${port}`;
  }
}

/**
 * Get all network interfaces with IPv4 addresses for development
 * In production, returns just the current domain
 * @returns Promise that resolves to an array of URLs
 */
export async function getAllAccessibleURLs(): Promise<string[]> {
  // In production, just return the current domain
  if (isProduction()) {
    return [window.location.origin];
  }
  
  // In development, get the specific IP and localhost
  try {
    const currentIP = await getCurrentIPv4();
    const port = window.location.port || "5173";
    
    const urls: string[] = [];
    
    // Add current IP if available
    if (currentIP) {
      urls.push(`http://${currentIP}:${port}`);
    }
    
    // Always add localhost as fallback
    urls.push(`http://localhost:${port}`);
    
    // Remove duplicates and return
    return [...new Set(urls)];
  } catch (error) {
    console.warn('Error getting network URLs, falling back to localhost:', error);
    const port = window.location.port || "5173";
    return [`http://localhost:${port}`];
  }
}

/**
 * Get IP address using WebRTC
 * @returns Promise that resolves to the IPv4 address
 */
function getIPFromWebRTC(): Promise<string | null> {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;
      
      const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(
        ice.candidate.candidate
      );
      
      if (myIP && myIP[1] && isValidIPv4(myIP[1])) {
        pc.close();
        resolve(myIP[1]);
        return;
      }
    };
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
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
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}