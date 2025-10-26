import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function KitchenView() {
  const kitchenOrders = useQuery(api.orders.getKitchenOrders);
  const updateItemStatus = useMutation(api.orders.updateOrderItemStatus);
  // For now, we'll just set this to an empty array since we need to pass a userId
  const unreadNotifications: any = [];

  const [showNotifications, setShowNotifications] = useState(false);

  // Show notification when new orders arrive
  useEffect(() => {
    if (kitchenOrders && kitchenOrders.length > 0) {
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
  }, [kitchenOrders]);

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
        <h2 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h2>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            Notifications{" "}
            {unreadNotifications && unreadNotifications.length > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {!kitchenOrders ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : kitchenOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🍳</span>
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
          {kitchenOrders.map((order) => (
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
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">
                    ₹{order.finalAmount}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {(order as any).pendingItems.map((item: any, index: number) => (
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
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
