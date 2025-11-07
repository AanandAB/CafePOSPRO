import { useState, useEffect } from "react";
import { format } from "date-fns";

interface InventoryReportProps {
  inventoryData: string | undefined;
  dateRange: { start: Date | null; end: Date | null };
  onDateChange: (start: Date | null, end: Date | null) => void;
}

interface InventoryItem {
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lowStockThreshold: number;
  supplier: string;
  barcode: string;
}

export function InventoryReport({
  inventoryData,
  dateRange,
  onDateChange,
}: InventoryReportProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(
    []
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  // Parse CSV data
  useEffect(() => {
    if (inventoryData && typeof inventoryData === "string") {
      const lines = inventoryData.split("\n");
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));
        const dataRows = lines.slice(1).filter((line) => line.trim() !== "");

        const parsedInventory = dataRows.map((line) => {
          const values = line.split(",").map((v) => v.replace(/"/g, ""));
          return {
            itemName: values[0],
            category: values[1],
            quantity: parseInt(values[2]) || 0,
            unitPrice: parseFloat(values[3]) || 0,
            lowStockThreshold: parseInt(values[4]) || 0,
            supplier: values[5],
            barcode: values[6],
          };
        });

        setInventory(parsedInventory);
      }
    }
  }, [inventoryData]);

  // Filter inventory based on category and stock status
  useEffect(() => {
    let filtered = [...inventory];

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Apply stock filter
    if (stockFilter === "low") {
      filtered = filtered.filter(
        (item) => item.quantity <= item.lowStockThreshold
      );
    } else if (stockFilter === "out") {
      filtered = filtered.filter((item) => item.quantity === 0);
    } else if (stockFilter === "high") {
      filtered = filtered.filter(
        (item) => item.quantity > item.lowStockThreshold * 2
      );
    }

    setFilteredInventory(filtered);
  }, [inventory, categoryFilter, stockFilter]);

  // Get unique categories
  const categories = Array.from(
    new Set(inventory.map((item) => item.category))
  );

  // Calculate statistics
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.lowStockThreshold
  ).length;
  const outOfStockItems = inventory.filter(
    (item) => item.quantity === 0
  ).length;
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Inventory Management Report
        </h3>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="high">High Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Total Items</h4>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Low Stock Items</h4>
          <p className="text-2xl font-bold">{lowStockItems}</p>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Out of Stock</h4>
          <p className="text-2xl font-bold">{outOfStockItems}</p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Total Value</h4>
          <p className="text-2xl font-bold">
            ₹
            {totalInventoryValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Stock Level Distribution */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
        <h4 className="font-semibold text-gray-900 mb-4">
          Stock Level Distribution
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:bg-green-50">
            <h5 className="font-medium text-green-700 mb-2">Adequate Stock</h5>
            <p className="text-2xl font-bold text-green-600">
              {
                inventory.filter(
                  (item) => item.quantity > item.lowStockThreshold
                ).length
              }
            </p>
            <p className="text-sm text-gray-600">Items with sufficient stock</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:bg-amber-50">
            <h5 className="font-medium text-amber-700 mb-2">Low Stock</h5>
            <p className="text-2xl font-bold text-amber-600">
              {
                inventory.filter(
                  (item) =>
                    item.quantity <= item.lowStockThreshold && item.quantity > 0
                ).length
              }
            </p>
            <p className="text-sm text-gray-600">Items needing replenishment</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:bg-red-50">
            <h5 className="font-medium text-red-700 mb-2">Out of Stock</h5>
            <p className="text-2xl font-bold text-red-600">
              {inventory.filter((item) => item.quantity === 0).length}
            </p>
            <p className="text-sm text-gray-600">Items unavailable for sale</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
        <h4 className="font-semibold text-gray-900 mb-4">Category Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const categoryItems = inventory.filter(
              (item) => item.category === category
            );
            const categoryValue = categoryItems.reduce(
              (sum, item) => sum + item.quantity * item.unitPrice,
              0
            );
            const lowStockCount = categoryItems.filter(
              (item) => item.quantity <= item.lowStockThreshold
            ).length;

            return (
              <div
                key={category}
                className="border border-gray-200 rounded-lg p-3 transition-all duration-200 hover:bg-amber-50 hover:shadow-sm"
              >
                <h5 className="font-medium text-gray-900">{category}</h5>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-600">Items:</span>{" "}
                    <span className="font-medium">{categoryItems.length}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Value:</span>{" "}
                    <span className="font-medium">
                      ₹
                      {categoryValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                  {lowStockCount > 0 && (
                    <p className="text-sm text-amber-600">
                      <span className="font-medium">{lowStockCount}</span> low
                      stock
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Item Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Category
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Quantity
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Unit Price
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Total Value
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, index) => {
                const totalValue = item.quantity * item.unitPrice;
                let status = "Adequate";
                let statusClass = "bg-green-100 text-green-800";

                if (item.quantity === 0) {
                  status = "Out of Stock";
                  statusClass = "bg-red-100 text-red-800";
                } else if (item.quantity <= item.lowStockThreshold) {
                  status = "Low Stock";
                  statusClass = "bg-amber-100 text-amber-800";
                }

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-amber-50 transition-colors duration-200"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {item.itemName}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.category}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{item.quantity}</span>
                      {item.lowStockThreshold > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (threshold: {item.lowStockThreshold})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      ₹
                      {item.unitPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      ₹
                      {totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass} transition-colors duration-200`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
