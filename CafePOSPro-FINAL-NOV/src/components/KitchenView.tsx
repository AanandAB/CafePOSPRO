import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { useStaffAuth } from "../contexts/StaffAuthContext";
import { ChefChat } from "./ChefChat";
import { KitchenChat } from "./KitchenChat";

export function KitchenView() {
  const [activeTab, setActiveTab] = useState("orders");
  const [showCustomerMessages, setShowCustomerMessages] = useState(true);
  const { staff: staffAuth } = useStaffAuth();
  const staffId = staffAuth?.id;

  const staffDetails = useQuery(api.auth.getStaffDetails);

  // Get the actual staff details (either from Convex Auth for managers or custom auth for staff)
  const actualStaffDetails = staffDetails || staffAuth;

  const kitchenOrders = useQuery(api.orders.getKitchenOrders);
  const updateItemStatus = useMutation(api.orders.updateOrderItemStatus);
  const acceptNotification = useMutation(api.notifications.acceptNotification);

  // Always fetch customer notifications, but with conditional parameters
  const customerNotificationsQuery = useQuery(
    api.notifications.getPendingNotifications,
    actualStaffDetails
      ? {
          userId:
            (actualStaffDetails as any)._id || (actualStaffDetails as any).id,
        }
      : { userId: "dummy" as Id<"staff"> } // Dummy value when no staff details
  );

  // Filter out notifications when we don't have valid staff details
  const customerNotifications = actualStaffDetails
    ? customerNotificationsQuery || []
    : [];

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

  const handleAcceptNotification = async (
    notificationId: Id<"notifications">
  ) => {
    if (!actualStaffDetails) return;

    try {
      const staffId =
        (actualStaffDetails as any)._id || (actualStaffDetails as any).id;
      await acceptNotification({
        notificationId,
        staffId,
      });
      toast.success("Notification accepted!");
    } catch (error) {
      toast.error("Failed to accept notification");
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

  // Check if user has access to kitchen view
  if (!actualStaffDetails) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff details...</p>
        </div>
      </div>
    );
  }

  // Check if user has kitchen role
  if (
    actualStaffDetails.role !== "kitchen" &&
    actualStaffDetails.role !== "manager"
  ) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600">
            You don't have permission to access the kitchen dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Kitchen Dashboard
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomerMessages(!showCustomerMessages)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {showCustomerMessages
                ? "Hide Customer Messages"
                : "Customer Messages"}
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  // If there are customer notifications, switch to the chat tab
                  if (
                    customerNotifications &&
                    customerNotifications.length > 0
                  ) {
                    setActiveTab("chat");
                  } else {
                    setShowNotifications(!showNotifications);
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Notifications{" "}
                {customerNotifications && customerNotifications.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                    {customerNotifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "orders"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "notifications"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "performance"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "chat"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Customer Chat
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Orders
              </h3>
              <p className="text-gray-600">Pending orders would appear here.</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Completed Orders
              </h3>
              <p className="text-gray-600">
                Completed orders would appear here.
              </p>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Notifications
              </h3>
              {customerNotifications && customerNotifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {customerNotifications.map((notification: any) => (
                    <div
                      key={notification._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        // If this is a customer message notification, switch to chat tab
                        if (
                          notification.type === "customer_message_to_kitchen"
                        ) {
                          setActiveTab("chat");
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                notification.type === "waiter_call"
                                  ? "bg-blue-100 text-blue-800"
                                  : notification.type === "water_request"
                                    ? "bg-cyan-100 text-cyan-800"
                                    : notification.type ===
                                        "customer_message_to_kitchen"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {notification.type === "waiter_call"
                                ? "🔔 Waiter"
                                : notification.type === "water_request"
                                  ? "💧 Water"
                                  : notification.type ===
                                      "customer_message_to_kitchen"
                                    ? "💬 Chat"
                                    : notification.type}
                            </span>
                            {notification.tableNumber && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Table {notification.tableNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 font-medium">
                            {notification.title}
                          </p>
                          <p className="text-gray-600 text-sm mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(
                              notification.timestamp
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🔔</span>
                  </div>
                  <p className="text-gray-500">No pending notifications</p>
                </div>
              )}
            </div>
            {staffId && <ChefChat chefId={staffId as Id<"staff">} />}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Chef Performance
            </h3>
            <p className="text-gray-600">
              Performance metrics would appear here.
            </p>
          </div>
        )}

        {activeTab === "chat" && staffId && (
          <KitchenChat kitchenStaffId={staffId as Id<"staff">} />
        )}
      </div>
    </div>
  );
}
