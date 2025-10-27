import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function OrderManagement() {
  const [selectedView, setSelectedView] = useState<"all" | "kitchen">("all");

  const activeOrders = useQuery(api.orders.getAllActiveOrders);
  const kitchenOrders = useQuery(api.orders.getKitchenOrders);
  const staff = useQuery(api.staff.getAllStaff);
  const updateItemStatus = useMutation(api.orders.updateOrderItemStatus);
  const completeOrder = useMutation(api.orders.completeOrder);

  const orders = selectedView === "kitchen" ? kitchenOrders : activeOrders;

  // Show notification when new kitchen orders arrive
  useEffect(() => {
    if (selectedView === "kitchen" && kitchenOrders) {
      // In a real implementation, you would use a more sophisticated notification system
      // For now, we'll just show a toast when there are pending items
      const hasPendingItems = kitchenOrders.some((order) =>
        (order as any).pendingItems?.some(
          (item: any) => item.status === "pending"
        )
      );

      if (hasPendingItems) {
        toast.info("New kitchen orders received!", {
          duration: 5000,
        });
      }
    }
  }, [kitchenOrders, selectedView]);

  const handleItemStatusUpdate = async (
    orderId: string,
    inventoryId: string,
    status: string
  ) => {
    try {
      await updateItemStatus({
        orderId: orderId as any,
        inventoryId: inventoryId as any,
        status: status as any,
      });

      // Show notification based on status change
      let message = "";
      switch (status) {
        case "preparing":
          message = "Item is now being prepared";
          break;
        case "ready":
          message = "Item is ready to serve";
          break;
        case "served":
          message = "Item has been served";
          break;
      }

      if (message) {
        toast.success(message);
      }
    } catch (error) {
      toast.error("Failed to update item status");
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      // Find a cashier or manager to assign the order to
      const cashiers = staff?.filter(
        (s) => s.role === "cashier" || s.role === "manager"
      );
      const cashierId =
        cashiers && cashiers.length > 0 ? cashiers[0]._id : null;

      if (!cashierId) {
        toast.error(
          "No cashier available. Please add a cashier or manager first."
        );
        return;
      }

      await completeOrder({
        orderId: orderId as any,
        paymentMode: "cash",
        cashierId: cashierId as any,
      });
      toast.success("Order completed");
    } catch (error) {
      toast.error("Failed to complete order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "served":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === "all"
                ? "bg-amber-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => setSelectedView("kitchen")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === "kitchen"
                ? "bg-amber-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
            }`}
          >
            Kitchen View
          </button>
        </div>
      </div>

      {!orders ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Active Orders
          </h3>
          <p className="text-gray-600">
            All orders have been completed or there are no new orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl p-6 shadow-sm border border-amber-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(order._creationTime).toLocaleTimeString()}
                  </p>
                  {/* Display table information if available */}
                  {order.tableInfo && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Table {order.tableInfo.tableNumber}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">
                    ₹{order.finalAmount}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      order.paymentStatus === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {(selectedView === "kitchen"
                  ? (order as any).pendingItems
                  : order.items
                ).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.itemName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </p>
                      {/* Display cooking instructions if available */}
                      {item.cookingInstructions && (
                        <p className="text-xs text-amber-700 mt-1">
                          <span className="font-medium">Note:</span>{" "}
                          {item.cookingInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                      {selectedView === "kitchen" &&
                        item.status !== "served" && (
                          <div className="flex gap-1">
                            {item.status === "pending" && (
                              <button
                                onClick={() => {
                                  void handleItemStatusUpdate(
                                    order._id,
                                    item.inventoryId,
                                    "preparing"
                                  );
                                }}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Start
                              </button>
                            )}
                            {item.status === "preparing" && (
                              <button
                                onClick={() => {
                                  void handleItemStatusUpdate(
                                    order._id,
                                    item.inventoryId,
                                    "ready"
                                  );
                                }}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Ready
                              </button>
                            )}
                            {item.status === "ready" && (
                              <button
                                onClick={() => {
                                  void handleItemStatusUpdate(
                                    order._id,
                                    item.inventoryId,
                                    "served"
                                  );
                                }}
                                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                              >
                                Served
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedView === "all" && order.paymentStatus === "pending" && (
                <button
                  onClick={() => {
                    void handleCompleteOrder(order._id);
                  }}
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Complete Order
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
