import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as QRCode from "qrcode.react";

interface Table {
  _id: Id<"tables">;
  tableNumber: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  currentOrderId?: Id<"orders">;
}

export function TableQRDisplay() {
  const tables = useQuery(api.tables.getAllTables);
  const [networkIPs, setNetworkIPs] = useState<string[]>([]);
  const [selectedIP, setSelectedIP] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect network interfaces using the same logic as StaffManagement
    const detectNetworkInterfaces = async () => {
      setIsLoading(true);
      try {
        console.log("Detecting network interfaces for QR codes...");
        // Try to get network interfaces from Electron
        if (
          (window as any).electronAPI &&
          typeof (window as any).electronAPI.getNetworkInterfaces === "function"
        ) {
          console.log("Using Electron IPC for network interfaces");
          const result = await (
            window as any
          ).electronAPI.getNetworkInterfaces();
          console.log("Electron IPC result:", result);

          if (result.success && Array.isArray(result.interfaces)) {
            // Add port to each IP address
            const port = window.location.port || "5173";
            const interfacesWithPort = result.interfaces.map(
              (ip: string) => `http://${ip}:${port}`
            );
            
            // Filter out localhost and invalid addresses
            const validIPs = interfacesWithPort.filter(
              (url: string) =>
                !url.includes("127.0.0.1") &&
                !url.includes("localhost") &&
                url.includes(".") &&
                !url.includes("169.254.")
            );

            // Add localhost as an option
            const allIPs = [...validIPs, `http://localhost:${port}`];
            setNetworkIPs(allIPs);

            // Select the first valid IP if available, otherwise localhost
            if (validIPs.length > 0) {
              setSelectedIP(validIPs[0]);
            } else {
              setSelectedIP(`http://localhost:${port}`);
            }
            setIsLoading(false);
            return;
          }
        }
        
        // Fallback to getting actual network interfaces using multiple methods
        await getActualNetworkInterfaces();
      } catch (error) {
        console.warn("Could not detect network interfaces:", error);
        // Fallback to getting actual network interfaces
        await getActualNetworkInterfaces();
      }
    };

    // Function to get actual network interfaces using multiple approaches
    const getActualNetworkInterfaces = async () => {
      try {
        // Method 1: Try WebRTC approach
        const ipAddresses = await getDeviceIPAddresses();
        if (ipAddresses.length > 0) {
          const port = window.location.port || "5173";
          const interfacesWithPort = ipAddresses.map(
            (ip: string) => `http://${ip}:${port}`
          );
          setNetworkIPs(interfacesWithPort);
          setSelectedIP(interfacesWithPort[0]);
          setIsLoading(false);
          return;
        }
        
        // Method 2: Try to get IP from window.location if we're not on localhost
        const host = window.location.hostname;
        if (host && !host.includes('localhost') && host !== '127.0.0.1' && host !== '[::1]') {
          const port = window.location.port || "5173";
          const url = `http://${host}:${port}`;
          setNetworkIPs([url]);
          setSelectedIP(url);
          setIsLoading(false);
          return;
        }
        
        // Final fallback to default interfaces with better instructions
        const port = window.location.port || "5173";
        const defaultIPs = [
          `http://[YOUR_COMPUTER_IP]:${port}`,
          `http://192.168.1.10:${port}`,
          `http://192.168.0.10:${port}`,
          `http://localhost:${port}`
        ];
        setNetworkIPs(defaultIPs);
        setSelectedIP(defaultIPs[0]);
      } catch (error) {
        console.error("Error in getActualNetworkInterfaces:", error);
        // Final fallback to default interfaces
        const port = window.location.port || "5173";
        const defaultIPs = [
          `http://[YOUR_COMPUTER_IP]:${port}`,
          `http://192.168.1.10:${port}`,
          `http://192.168.0.10:${port}`,
          `http://localhost:${port}`
        ];
        setNetworkIPs(defaultIPs);
        setSelectedIP(defaultIPs[0]);
      } finally {
        setIsLoading(false);
      }
    };

    // Helper function to get device IP addresses using WebRTC
    const getDeviceIPAddresses = (): Promise<string[]> => {
      return new Promise((resolve) => {
        try {
          // Create a WebRTC connection to discover local IP addresses
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" }
            ]
          });
          
          // Add a dummy data channel
          pc.createDataChannel('');
          
          // Listen for ICE candidates which contain IP addresses
          const ipAddresses: string[] = [];
          let finished = false;
          
          const finish = () => {
            if (!finished) {
              finished = true;
              pc.close();
              // Remove duplicates and localhost addresses
              const uniqueIPs = [...new Set(ipAddresses)].filter(ip => 
                !ip.startsWith('127.') && 
                !ip.startsWith('0.') && 
                !ip.match(/^169\.254\./) &&
                ip !== '127.0.0.1'
              );
              resolve(uniqueIPs);
            }
          };
          
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate.candidate;
              // Extract IP address from candidate string
              const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
              const match = candidate.match(ipRegex);
              if (match && match[1]) {
                const ip = match[1];
                if (!ipAddresses.includes(ip)) {
                  ipAddresses.push(ip);
                }
              }
            } else if (event.candidate === null) {
              // No more candidates, finish
              finish();
            }
          };
          
          // Create an offer to trigger ICE candidate generation
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(err => {
              console.error("WebRTC error:", err);
              finish();
            });
          
          // Timeout to resolve the promise in case WebRTC doesn't work
          setTimeout(() => {
            finish();
          }, 3000);
        } catch (error) {
          console.error("Error in getDeviceIPAddresses:", error);
          resolve([]);
        }
      });
    };

    void detectNetworkInterfaces();
  }, []);

  if (!tables || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Table QR Codes
        </h2>
        <p className="text-gray-600 mb-4">
          Print these QR codes and place them on each table. Customers can scan
          them to place self-service orders.
        </p>

        {selectedIP.includes("[YOUR_COMPUTER_IP]") || selectedIP.includes("localhost") ? (
          <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Note:</span> The system is currently
              running on localhost. For customer devices to access the ordering
              system, you need to:
            </p>
            <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
              <li>Connect all devices to the same WiFi network</li>
              <li>
                Find your computer's network IP address (e.g., 192.168.1.10)
              </li>
              <li>
                Replace "localhost" in the URLs below with that IP address
              </li>
            </ol>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Network Address:</span> {selectedIP.replace('http://', '').replace(/:\d+$/, '')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Customers can scan the QR codes below to access the ordering
              system
            </p>
          </div>
        )}

        {networkIPs.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Network Interface:
            </label>
            <select
              value={selectedIP}
              onChange={(e) => setSelectedIP(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {networkIPs.map((url) => (
                <option key={url} value={url}>
                  {url.replace('http://', '').replace(/:\d+$/, '')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table: Table) => {
          // Generate URL with selected network IP
          const baseUrl = selectedIP;
          const qrUrl = `${baseUrl}/self-service/${table._id}`;

          return (
            <div
              key={table._id}
              className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Table {table.tableNumber}
                    </h3>
                    <p className="text-gray-600">{table.capacity} seats</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      table.status === "available"
                        ? "bg-green-100 text-green-800"
                        : table.status === "occupied"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-center">
                  <QRCode.QRCodeSVG value={qrUrl} size={128} />
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <p className="font-medium mb-1">Scan URL:</p>
                  <p className="font-mono break-all bg-gray-100 p-2 rounded">
                    {qrUrl}
                  </p>
                </div>

                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(qrUrl);
                    alert("URL copied to clipboard!");
                  }}
                  className="w-full bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Copy URL
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}