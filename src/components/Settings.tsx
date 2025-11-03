import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function Settings() {
  const [activeTab, setActiveTab] = useState("restaurant");
  const [ledgerDateRange, setLedgerDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showAddLedgerForm, setShowAddLedgerForm] = useState(false);
  const [ledgerFormData, setLedgerFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

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

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (ledgerDateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        endDate = new Date();
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        endDate = new Date();
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          return { startDate: undefined, endDate: undefined };
        }
        break;
      default: // all
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    };
  };

  // Export functions with date range
  const dateRange = getDateRange();
  const exportSales = useQuery(api.dataExport.exportSalesData, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const exportInventory = useQuery(api.dataExport.exportInventoryData, {});
  const exportStaff = useQuery(api.dataExport.exportStaffData, {});
  const exportLedger = useQuery(api.dataExport.exportLedgerData, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
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

  const addLedgerEntry = useMutation(api.orders.addLedgerEntry);
  const staffMembers = useQuery(api.staff.getAllStaff);

  const handleAddLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get the currently logged in staff member
      const currentStaff =
        staffMembers?.find((staff) => staff.email === "admin@cafepospro.com") ||
        staffMembers?.[0];

      if (!currentStaff) {
        toast.error(
          "No staff member found. Please ensure you have staff members in the system."
        );
        return;
      }

      await addLedgerEntry({
        type: ledgerFormData.type as "income" | "expense",
        amount: parseFloat(ledgerFormData.amount),
        category: ledgerFormData.category,
        description: ledgerFormData.description,
        date: new Date(ledgerFormData.date).getTime(),
        staffId: currentStaff._id,
      });

      toast.success("Ledger entry added successfully");
      setShowAddLedgerForm(false);
      setLedgerFormData({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error adding ledger entry:", error);
      toast.error("Failed to add ledger entry");
    }
  };

  const [systemSettings, setSystemSettings] = useState({
    autoDownloadBills: false,
    printBillsAutomatically: false,
    notificationSound: true,
    lowStockAlerts: true,
    enableGST: true, // Add GST toggle
  });

  // Load system settings from localStorage
  React.useEffect(() => {
    const savedSettings = localStorage.getItem("systemSettings");
    if (savedSettings) {
      try {
        setSystemSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse system settings", e);
      }
    }
  }, []);

  // Save system settings to localStorage
  const saveSystemSettings = (settings: any) => {
    try {
      localStorage.setItem("systemSettings", JSON.stringify(settings));
      setSystemSettings(settings);
      toast.success("System settings saved successfully");
    } catch (e) {
      toast.error("Failed to save system settings");
    }
  };

  const handleSystemSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(systemSettings);
  };

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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            System Preferences
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSystemSettingsSubmit(e);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Download Bills</h4>
                  <p className="text-sm text-gray-600">
                    Automatically download bill copies to device
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.autoDownloadBills}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        autoDownloadBills: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Print Bills Automatically</h4>
                  <p className="text-sm text-gray-600">
                    Automatically print bills when order is completed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.printBillsAutomatically}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        printBillsAutomatically: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Notification Sounds</h4>
                  <p className="text-sm text-gray-600">
                    Play sounds for notifications and alerts
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.notificationSound}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        notificationSound: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Low Stock Alerts</h4>
                  <p className="text-sm text-gray-600">
                    Show notifications when items are running low
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.lowStockAlerts}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        lowStockAlerts: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Enable GST</h4>
                  <p className="text-sm text-gray-600">
                    Apply 18% GST to all orders
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.enableGST}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        enableGST: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Save System Settings
            </button>
          </form>
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manual Data Export
              </h3>
              <button
                onClick={() => setShowAddLedgerForm(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Add Ledger Entry
              </button>
            </div>

            {/* Date Range Selector for Ledger and Sales */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">
                Export Date Range
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={ledgerDateRange}
                    onChange={(e) => setLedgerDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="year">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {ledgerDateRange === "custom" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

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

          {/* Add Ledger Entry Form Modal */}
          {showAddLedgerForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add Ledger Entry
                </h3>
                <form
                  onSubmit={(e) => {
                    void handleAddLedgerEntry(e);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={ledgerFormData.type}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={ledgerFormData.amount}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          amount: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={ledgerFormData.category}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g., Utilities, Supplies, Rent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={ledgerFormData.description}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Detailed description of the transaction"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={ledgerFormData.date}
                      onChange={(e) =>
                        setLedgerFormData({
                          ...ledgerFormData,
                          date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                      Add Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddLedgerForm(false);
                        setLedgerFormData({
                          type: "expense",
                          amount: "",
                          category: "",
                          description: "",
                          date: new Date().toISOString().split("T")[0],
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
