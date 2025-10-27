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
    // Detect network interfaces
    const detectNetworkInterfaces = async () => {
      setIsLoading(true);
      try {
        console.log("Detecting network interfaces...");
        // Check if we're in Electron environment
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
            // Filter out localhost and invalid addresses
            const validIPs = result.interfaces.filter(
              (ip: string) =>
                ip !== "127.0.0.1" &&
                ip !== "localhost" &&
                ip.includes(".") &&
                !ip.startsWith("169.254.")
            );

            // Add localhost as an option
            const allIPs = [...validIPs, "localhost"];
            setNetworkIPs(allIPs);

            // Select the first valid IP if available, otherwise localhost
            if (validIPs.length > 0) {
              setSelectedIP(validIPs[0]);
            } else {
              setSelectedIP("localhost");
            }
          } else {
            // Fallback if Electron IPC fails
            setNetworkIPs(["localhost"]);
            setSelectedIP("localhost");
          }
        } else {
          // Fallback to window location for web browser
          console.log("Using fallback network detection");
          const hostname = window.location.hostname;
          // Common network IP patterns
          const commonNetworkIPs = [
            "192.168.1.10",
            "192.168.0.10",
            "10.0.0.10",
            "172.16.0.10",
            "192.168.56.1",
            "192.168.71.2",
            "192.168.1.10",
          ];

          if (hostname !== "localhost" && hostname !== "127.0.0.1") {
            setNetworkIPs([hostname, ...commonNetworkIPs, "localhost"]);
            setSelectedIP(hostname);
          } else {
            const allIPs = [...commonNetworkIPs, "localhost"];
            setNetworkIPs(allIPs);
            // Select the first common IP as default if available
            setSelectedIP(commonNetworkIPs[0] || "localhost");
          }
        }
      } catch (error) {
        console.warn("Could not detect network interfaces:", error);
        // Fallback to window location with common IP patterns
        const hostname = window.location.hostname;
        const commonNetworkIPs = [
          "192.168.1.10",
          "192.168.0.10",
          "10.0.0.10",
          "172.16.0.10",
          "192.168.56.1",
          "192.168.71.2",
          "192.168.1.10",
        ];

        if (hostname !== "localhost" && hostname !== "127.0.0.1") {
          setNetworkIPs([hostname, ...commonNetworkIPs, "localhost"]);
          setSelectedIP(hostname);
        } else {
          const allIPs = [...commonNetworkIPs, "localhost"];
          setNetworkIPs(allIPs);
          // Select the first common IP as default if available
          setSelectedIP(commonNetworkIPs[0] || "localhost");
        }
      } finally {
        setIsLoading(false);
      }
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

        {selectedIP === "localhost" ? (
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
              <span className="font-medium">Network Address:</span> {selectedIP}
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
              {networkIPs.map((ip) => (
                <option key={ip} value={ip}>
                  {ip}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table: Table) => {
          // Generate URL with selected network IP
          const port = window.location.port || "5173";
          const baseUrl = `http://${selectedIP}:${port}`;

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
