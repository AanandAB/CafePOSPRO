import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function Settings() {
  const [activeTab, setActiveTab] = useState("restaurant");

  const restaurantProfile = useQuery(api.restaurant.getRestaurantProfile);
  const updateRestaurant = useMutation(api.restaurant.updateRestaurantProfile);

  const [restaurantData, setRestaurantData] = useState({
    name: "",
    address: "",
    gstNumber: "",
    upiId: "",
    currency: "₹",
    theme: "coffee",
  });

  // Update form when data loads
  React.useEffect(() => {
    if (restaurantProfile) {
      setRestaurantData({
        name: restaurantProfile.name || "",
        address: restaurantProfile.address || "",
        gstNumber: restaurantProfile.gstNumber || "",
        upiId: restaurantProfile.upiId || "",
        currency: restaurantProfile.currency || "₹",
        theme: restaurantProfile.theme || "coffee",
      });
    }
  }, [restaurantProfile]);

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateRestaurant(restaurantData);
      toast.success("Restaurant profile updated successfully");
    } catch (error) {
      toast.error("Failed to update restaurant profile");
    }
  };

  // Export functions
  const exportSales = useQuery(api.dataExport.exportSalesData, {
    startDate: undefined,
    endDate: undefined,
  });
  const exportInventory = useQuery(api.dataExport.exportInventoryData, {});
  const exportStaff = useQuery(api.dataExport.exportStaffData, {});
  const exportLedger = useQuery(api.dataExport.exportLedgerData, {
    startDate: undefined,
    endDate: undefined,
  });

  const handleExport = async (exportData: any, fileName: string) => {
    try {
      // For queries, we need to access the data directly
      if (exportData && typeof exportData === "string") {
        const blob = new Blob([exportData], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${fileName} successfully`);
      } else {
        toast.error("Failed to export data: No data available");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(`Failed to export data: ${error.message || "Unknown error"}`);
    }
  };

  const tabs = [
    { id: "restaurant", label: "Restaurant Profile", icon: "🏪" },
    { id: "system", label: "System Settings", icon: "⚙️" },
    { id: "backup", label: "Backup & Export", icon: "💾" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Restaurant Profile Tab */}
      {activeTab === "restaurant" && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Restaurant Information
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRestaurantSubmit(e);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  value={restaurantData.name}
                  onChange={(e) =>
                    setRestaurantData({
                      ...restaurantData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={restaurantData.currency}
                  onChange={(e) =>
                    setRestaurantData({
                      ...restaurantData,
                      currency: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="₹">₹ (Indian Rupee)</option>
                  <option value="$">$ (US Dollar)</option>
                  <option value="€">€ (Euro)</option>
                  <option value="£">£ (British Pound)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={restaurantData.address}
                onChange={(e) =>
                  setRestaurantData({
                    ...restaurantData,
                    address: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter your restaurant's full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  value={restaurantData.gstNumber}
                  onChange={(e) =>
                    setRestaurantData({
                      ...restaurantData,
                      gstNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Enter GST registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={restaurantData.upiId}
                  onChange={(e) =>
                    setRestaurantData({
                      ...restaurantData,
                      upiId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="your-upi@bank"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={restaurantData.theme}
                onChange={(e) =>
                  setRestaurantData({
                    ...restaurantData,
                    theme: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="coffee">Coffee Shop</option>
                <option value="restaurant">Restaurant</option>
                <option value="fastfood">Fast Food</option>
                <option value="bakery">Bakery</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Save Restaurant Profile
            </button>
          </form>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tax Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  defaultValue={18}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Currently set to 18% (GST)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Receipt Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Print Receipt Automatically
                  </h4>
                  <p className="text-sm text-gray-600">
                    Auto-print receipt when order is completed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Show GST Details
                  </h4>
                  <p className="text-sm text-gray-600">
                    Display GST breakdown on receipts
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Low Stock Alerts
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get notified when items are running low
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Order Notifications
                  </h4>
                  <p className="text-sm text-gray-600">
                    Sound alerts for new orders
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup & Export Tab */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Automatic Backup Schedule
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-2">
                  Scheduled Backups
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  Backups are automatically created and saved to your system.
                  All backups include your complete cafe data.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Daily</h5>
                    <p className="text-sm text-gray-600">At 11:00 PM</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Weekly</h5>
                    <p className="text-sm text-gray-600">
                      Every Sunday at 11:00 PM
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900">Monthly</h5>
                    <p className="text-sm text-gray-600">
                      Last day of month at 11:00 PM
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-3">
                  Note: Automatic backups require the CafePOSPro Manager to be
                  running. Backups are stored in your system's
                  Documents/CafePOSPro/Backups folder.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Data Export
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Sales Report</h4>
                  <p className="text-sm text-gray-600">
                    Export sales data as CSV
                  </p>
                </div>
                <button
                  onClick={() => {
                    void handleExport(exportSales, "sales-report.csv");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Inventory Report
                  </h4>
                  <p className="text-sm text-gray-600">
                    Export inventory data as CSV
                  </p>
                </div>
                <button
                  onClick={() => {
                    void handleExport(exportInventory, "inventory-report.csv");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Staff Report</h4>
                  <p className="text-sm text-gray-600">
                    Export staff data as CSV
                  </p>
                </div>
                <button
                  onClick={() => {
                    void handleExport(exportStaff, "staff-report.csv");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Ledger Report</h4>
                  <p className="text-sm text-gray-600">
                    Export ledger data as CSV
                  </p>
                </div>
                <button
                  onClick={() => {
                    void handleExport(exportLedger, "ledger-report.csv");
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Database Backup
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Create Full Backup
                  </h4>
                  <p className="text-sm text-gray-600">
                    Complete database backup (SQL format)
                  </p>
                </div>
                <button
                  onClick={() => {
                    // This will trigger the Electron app's backup functionality
                    toast.info(
                      "Please use the CafePOSPro Manager app to create a full database backup"
                    );
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Create Backup
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">CafePOSPro v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Database:</span>
                <span className="font-medium">Convex</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Backup:</span>
                <span className="font-medium">Auto-synced</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">
              ⚠️ Danger Zone
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-red-900">Clear All Data</h4>
                  <p className="text-sm text-red-700">
                    This will permanently delete all your data
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
