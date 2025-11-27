import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { TableQRDisplay } from "./TableQRDisplay";

export function TableManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [formData, setFormData] = useState({
    tableNumber: "",
    capacity: 4,
  });

  const tables = useQuery(api.tables.getAllTables);
  const addTable = useMutation(api.tables.addTable);
  const updateTableStatus = useMutation(api.tables.updateTableStatus);
  const clearTableOrders = useMutation(api.orders.clearTableOrders);
  const deleteTable = useMutation(api.tables.deleteTable);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTable(formData);
      toast.success("Table added successfully");
      setFormData({ tableNumber: "", capacity: 4 });
      setShowAddForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add table");
    }
  };

  const handleStatusChange = async (tableId: string, status: string) => {
    try {
      await updateTableStatus({
        tableId: tableId as any,
        status: status as any,
      });
      toast.success("Table status updated");
    } catch (error) {
      toast.error("Failed to update table status");
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete Table ${tableNumber}? This action cannot be undone.`
      )
    ) {
      try {
        await deleteTable({ tableId: tableId as any });
        toast.success(`Table ${tableNumber} has been deleted successfully`);
      } catch (error: any) {
        // Check if it's the specific error about occupied tables
        if (
          error.message &&
          error.message.includes("Cannot delete occupied table")
        ) {
          toast.error(
            `Cannot delete Table ${tableNumber} because it is currently occupied. Please clear the table first, then try again.`,
            {
              duration: 10000, // Show for 10 seconds
              action: {
                label: "Clear Table",
                onClick: () => {
                  // Find the table to get its data
                  const table = tables?.find((t) => t._id === tableId);
                  if (table) {
                    void handleLeaveTable(tableId, table.tableNumber);
                  }
                },
              },
            }
          );
        } else {
          toast.error(error.message || "Failed to delete table");
        }
      }
    }
  };

  // Manual leave table function for staff
  const handleLeaveTable = async (tableId: string, tableNumber: string) => {
    if (
      window.confirm(
        `Are you sure you want to clear all orders for Table ${tableNumber}? This will mark the table as available.`
      )
    ) {
      try {
        // Clear table orders and update table status to available
        const result = await clearTableOrders({ tableId: tableId as any });
        console.log("Clear table result:", result);

        toast.success(
          `Table ${tableNumber} has been cleared and is now available.`
        );
      } catch (error) {
        console.error("Error clearing table:", error);
        toast.error("Failed to clear table. Please try again.");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "occupied":
        return "bg-red-100 text-red-800 border-red-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return "✅";
      case "occupied":
        return "🔴";
      case "reserved":
        return "⏰";
      default:
        return "❓";
    }
  };

  const toggleQRDisplay = () => {
    setShowQRDisplay(!showQRDisplay);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Table Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Add Table
          </button>
          <button
            onClick={toggleQRDisplay}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            {showQRDisplay ? "Hide QR Codes" : "Show QR Codes"}
          </button>
        </div>
      </div>

      {showQRDisplay && (
        <>
          <TableQRDisplay />
        </>
      )}

      {/* Add Table Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Table
            </h3>
            <form
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Table Number"
                value={formData.tableNumber}
                onChange={(e) =>
                  setFormData({ ...formData, tableNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />

              <input
                type="number"
                placeholder="Capacity"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                min="1"
                required
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ tableNumber: "", capacity: 4 });
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

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {tables?.map((table) => (
          <div
            key={table._id}
            className={`border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${getStatusColor(table.status)}`}
          >
            <div className="text-3xl mb-2">{getStatusIcon(table.status)}</div>
            <h3 className="font-bold text-lg mb-1">
              Table {table.tableNumber}
            </h3>
            <p className="text-sm mb-3">Capacity: {table.capacity}</p>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide">
                {table.status}
              </div>

              <div className="flex flex-col gap-1">
                {table.status !== "available" && (
                  <button
                    onClick={() => {
                      void handleStatusChange(table._id, "available");
                    }}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    Mark Available
                  </button>
                )}

                {table.status !== "occupied" && (
                  <button
                    onClick={() => {
                      void handleStatusChange(table._id, "occupied");
                    }}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    Mark Occupied
                  </button>
                )}

                {table.status !== "reserved" && (
                  <button
                    onClick={() => {
                      void handleStatusChange(table._id, "reserved");
                    }}
                    className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                  >
                    Mark Reserved
                  </button>
                )}

                {/* Manual Leave Table Button for Staff */}
                {table.status !== "available" && (
                  <button
                    onClick={() => {
                      void handleLeaveTable(table._id, table.tableNumber);
                    }}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                  >
                    Clear Table
                  </button>
                )}

                {/* Delete Table Button */}
                <button
                  onClick={() => {
                    void handleDeleteTable(table._id, table.tableNumber);
                  }}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Status Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Table Status Summary
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {tables?.filter((t) => t.status === "available").length || 0}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {tables?.filter((t) => t.status === "occupied").length || 0}
            </div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {tables?.filter((t) => t.status === "reserved").length || 0}
            </div>
            <div className="text-sm text-gray-600">Reserved</div>
          </div>
        </div>
      </div>
    </div>
  );
}
