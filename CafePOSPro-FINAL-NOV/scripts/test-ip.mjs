#!/usr/bin/env node

// Simple script to test IP detection
console.log("Testing IP detection...");

// Get network interfaces
import { networkInterfaces } from "os";

const nets = networkInterfaces();
const results = Object.create(null);

for (const [name, net] of Object.entries(nets)) {
  for (const iface of net) {
    // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
    if (iface.family === "IPv4" && !iface.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(iface.address);
    }
  }
}

console.log("Network interfaces found:");
console.log(JSON.stringify(results, null, 2));

// Find the first non-localhost IPv4 address
let firstIP = null;
for (const name in results) {
  if (results[name].length > 0) {
    firstIP = results[name][0];
    break;
  }
}

console.log("First available IP:", firstIP || "None found");
