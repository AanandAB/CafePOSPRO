import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface Notification {
  _id: Id<"notifications">;
  type: string;
  title: string;
  message: string;
  tableNumber?: string;
  timestamp: number;
  accepted?: boolean;
  acceptedBy?: Id<"staff">;
  acceptedAt?: number;
  read?: boolean;
  readAt?: number;
}

interface StaffMember {
  _id: Id<"staff">;
  name: string;
  role: string;
}

export function StaffNotifications({ staffId }: { staffId: Id<"staff"> }) {
  const [activeTab, setActiveTab] = useState<"pending" | "accepted">("pending");
  
  // Get pending notifications
  const pendingNotifications = useQuery(api.notifications.getPendingNotifications, {
    userId: staffId,
  });
  
  // Get all notifications (for accepted tab)
  const allNotifications = useQuery(api.notifications.getUnreadNotifications, {
    userId: staffId,
  });
  
  // Get all staff members to show who accepted notifications
  const allStaff = useQuery(api.staff.getAllStaff);
  
  const acceptNotification = useMutation(api.notifications.acceptNotification);
  const markNotificationAsRead = useMutation(api.notifications.markNotificationAsRead);

  const handleAcceptNotification = async (notificationId: Id<"notifications">) => {
    try {
      await acceptNotification({
        notificationId,
        staffId,
      });
      toast.success("Request accepted! Customer will be notified.");
    } catch (error) {
      toast.error("Failed to accept request. Please try again.");
      console.error("Error accepting notification:", error);
    }
  };

  const handleMarkAsDone = async (notificationId: Id<"notifications">) => {
    try {
      await markNotificationAsRead({
        notificationId,
      });
      toast.success("Notification marked as done!");
    } catch (error) {
      toast.error("Failed to mark notification as done. Please try again.");
      console.error("Error marking notification as done:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sort notifications by timestamp (newest first)
  const pendingList = pendingNotifications
    ?.filter((notification: any) => !notification.accepted)
    ?.sort((a: any, b: any) => b.timestamp - a.timestamp) || [];
  
  const acceptedList = allNotifications
    ?.filter((notification: any) => notification.accepted)
    ?.sort((a: any, b: any) => b.timestamp - a.timestamp) || [];

  // Get staff member name by ID
  const getStaffName = (staffId: Id<"staff">) => {
    const staffMember = allStaff?.find(s => s._id === staffId);
    return staffMember ? staffMember.name : "Unknown Staff";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Requests</h3>
      
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "pending"
              ? "text-amber-600 border-b-2 border-amber-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Pending ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "accepted"
              ? "text-amber-600 border-b-2 border-amber-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Accepted
        </button>
      </div>

      {activeTab === "pending" ? (
        pendingList.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">🔔</span>
            </div>
            <p className="text-gray-500">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pendingList.map((notification: any) => (
              <div
                key={notification._id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          notification.type === "waiter_call"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {notification.type === "waiter_call" ? "🔔 Waiter" : "💧 Water"}
                      </span>
                      {notification.tableNumber && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Table {notification.tableNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">{notification.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      void handleAcceptNotification(notification._id);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        acceptedList.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">✅</span>
            </div>
            <p className="text-gray-500">No accepted requests</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {acceptedList.map((notification: any) => (
              <div
                key={notification._id}
                className="border border-gray-200 rounded-lg p-4 bg-green-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          notification.type === "waiter_call"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-cyan-100 text-cyan-800"
                        }`}
                      >
                        {notification.type === "waiter_call" ? "🔔 Waiter" : "💧 Water"}
                      </span>
                      {notification.tableNumber && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Table {notification.tableNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 font-medium">{notification.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                    {notification.acceptedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Accepted at {new Date(notification.acceptedAt).toLocaleTimeString()}
                      </p>
                    )}
                    {notification.acceptedBy && (
                      <p className="text-xs text-gray-600 mt-1">
                        Accepted by: {getStaffName(notification.acceptedBy)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(notification.timestamp)}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                      Accepted
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      void handleMarkAsDone(notification._id);
                    }}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}