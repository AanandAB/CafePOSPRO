import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import * as QRCode from "qrcode.react";
import { toast } from "sonner";
import { getAppBaseURL, getAllAccessibleURLs } from "../utils/network";

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
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect network interfaces using dynamic detection
    const detectNetworkInterfaces = async () => {
      setIsLoading(true);
      try {
        // Get all accessible URLs (works in both dev and prod)
        const urls = await getAllAccessibleURLs();
        
        setNetworkIPs(urls);
        // Select the first URL as default (should be the current IP)
        setSelectedIP(urls[0]);
        setIsLoading(false);
      } catch (error) {
        console.warn("Could not detect network interfaces:", error);
        // Fallback to localhost
        const port = window.location.port || "5173";
        const defaultIPs = [`http://localhost:${port}`];
        
        setNetworkIPs(defaultIPs);
        setSelectedIP(defaultIPs[0]);
        setIsLoading(false);
      }
    };

    // Run the detection when component mounts
    void detectNetworkInterfaces();
    
    // Refresh IP detection every 10 seconds to catch network changes quickly
    const interval = setInterval(() => {
      // Only refresh in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        void detectNetworkInterfaces();
      }
    }, 10000); // Check every 10 seconds instead of 30
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Handle IP selection change
  const handleIPChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIP(e.target.value);
  };

  // Print all QR codes
  const printAllQRCodes = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Table QR Codes</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px;
                  padding: 0;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #333;
                  padding-bottom: 15px;
                }
                .header h1 {
                  color: #333;
                  margin: 0;
                }
                .header p {
                  color: #666;
                  margin: 5px 0 0 0;
                }
                .qr-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 30px;
                  margin-top: 20px;
                }
                .qr-item {
                  text-align: center;
                  padding: 15px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .qr-item h3 {
                  margin: 10px 0;
                  color: #333;
                }
                .qr-item .table-number {
                  font-size: 18px;
                  font-weight: bold;
                  color: #e67e22;
                }
                .qr-code {
                  margin: 15px 0;
                }
                .qr-code svg {
                  max-width: 150px;
                  height: auto;
                }
                .url {
                  font-size: 12px;
                  color: #666;
                  word-break: break-all;
                  background: #f8f8f8;
                  padding: 8px;
                  border-radius: 4px;
                  margin-top: 10px;
                }
                .print-info {
                  margin-top: 30px;
                  text-align: center;
                  font-size: 14px;
                  color: #666;
                  border-top: 1px solid #eee;
                  padding-top: 15px;
                }
                @media print {
                  body {
                    margin: 0;
                    padding: 20px;
                  }
                  .qr-grid {
                    grid-template-columns: repeat(3, 1fr);
                  }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Table QR Codes</h1>
                <p>Scan to order from your table</p>
              </div>
              <div class="qr-grid">
                ${tables?.map(table => `
                  <div class="qr-item">
                    <div class="table-number">Table ${table.tableNumber}</div>
                    <div class="qr-code">
                      ${document.querySelector(`#qr-${table._id}`)?.innerHTML || ''}
                    </div>
                    <div class="url">${selectedIP}/self-service/${table._id}</div>
                  </div>
                `).join('')}
              </div>
              <div class="print-info">
                <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  // window.close(); // Uncomment to auto-close after printing
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Table QR Codes</h3>
        <button
          onClick={printAllQRCodes}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>🖨️</span> Print All QR Codes
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3"></div>
          <span className="text-gray-600">Detecting network addresses...</span>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network Address for QR Codes
            </label>
            <div className="flex gap-2">
              <select
                value={selectedIP}
                onChange={handleIPChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {networkIPs.map((url, index) => (
                  <option key={index} value={url}>
                    {url}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(selectedIP)
                    .then(() => {
                      toast.success("Link copied to clipboard");
                    })
                    .catch(() => {
                      toast.error("Failed to copy link");
                    });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select the network address that devices on your local network can access
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables?.map((table) => (
              <div
                key={table._id}
                className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200"
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  Table {table.tableNumber}
                </h4>
                <div className="flex justify-center mb-3">
                  <QRCode.QRCodeSVG
                    id={`qr-${table._id}`}
                    value={`${selectedIP}/self-service/${table._id}`}
                    size={150}
                    level={"H"}
                    includeMargin={true}
                    className="bg-white p-2 rounded-lg"
                  />
                </div>
                <p className="text-sm text-gray-600 break-all">
                  {selectedIP}/self-service/{table._id}
                </p>
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      table.status === "available"
                        ? "bg-green-100 text-green-800"
                        : table.status === "occupied"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}