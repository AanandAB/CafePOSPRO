import { DashboardOverview } from "./DashboardOverview";
import { POSSystem } from "./POSSystem";
import { OrderManagement } from "./OrderManagement";
import { InventoryManagement } from "./InventoryManagement";
import { TableManagement } from "./TableManagement";
import { StaffManagement } from "./StaffManagement";
import { SalesReports } from "./SalesReports";
import { Analytics } from "./Analytics";
import { Settings } from "./Settings";
import { KitchenView } from "./KitchenView";
import { FeedbackManagement } from "./FeedbackManagement";
import { ReportsDashboard } from "./ReportsDashboard";
import { TipManagement } from "./TipManagement";
import { WaiterTips } from "./WaiterTips";
import { StaffNotifications } from "./StaffNotifications";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStaffAuth } from "../contexts/StaffAuthContext";
import { Id } from "../../convex/_generated/dataModel";

interface DashboardProps {
  currentView: string;
}

export function Dashboard({ currentView }: DashboardProps) {
  const staffDetails = useQuery(api.auth.getStaffDetails);
  const { staff: staffAuth } = useStaffAuth();

  // Get the actual staff details (either from Convex Auth for managers or custom auth for staff)
  const actualStaffDetails = staffDetails || staffAuth;

  const renderView = () => {
    // Check if user has permission to access this view
    const hasPermission = (allowedRoles: string[]) => {
      if (!actualStaffDetails) return true; // Allow if no staff details (likely manager)
      return allowedRoles.includes(actualStaffDetails.role);
    };

    switch (currentView) {
      case "dashboard":
        return <DashboardOverview />;
      case "pos":
        // POS system accessible to managers, cashiers, and waiters
        if (!hasPermission(["manager", "cashier", "waiter"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access the POS system.
              </p>
            </div>
          );
        }
        return <POSSystem />;
      case "orders":
        // Orders accessible to managers, cashiers, and waiters
        if (!hasPermission(["manager", "cashier", "waiter"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access orders.
              </p>
            </div>
          );
        }
        return <OrderManagement />;
      case "inventory":
        // Inventory accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access inventory management.
              </p>
            </div>
          );
        }
        return <InventoryManagement />;
      case "tables":
        // Tables accessible to managers, cashiers, and waiters
        if (!hasPermission(["manager", "cashier", "waiter"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access table management.
              </p>
            </div>
          );
        }
        return <TableManagement />;
      case "staff":
        // Staff management accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access staff management.
              </p>
            </div>
          );
        }
        return <StaffManagement />;
      case "sales":
        // Sales accessible to managers and cashiers
        if (!hasPermission(["manager", "cashier"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access sales reports.
              </p>
            </div>
          );
        }
        return <SalesReports />;
      case "reports":
        // Reports accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access reports.
              </p>
            </div>
          );
        }
        return <ReportsDashboard />;
      case "analytics":
        // Analytics accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access analytics.
              </p>
            </div>
          );
        }
        return <Analytics />;
      case "feedback":
        // Feedback accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access feedback management.
              </p>
            </div>
          );
        }
        return <FeedbackManagement />;
      case "settings":
        // Settings accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access settings.
              </p>
            </div>
          );
        }
        return <Settings />;
      case "kitchen":
        // Kitchen view accessible to kitchen staff and managers
        if (!hasPermission(["manager", "kitchen"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access the kitchen dashboard.
              </p>
            </div>
          );
        }
        return <KitchenView />;
      case "tips":
        // Tip management accessible to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access tip management.
              </p>
            </div>
          );
        }
        return <TipManagement />;
      case "mytips":
        // My tips accessible to waiters
        if (!hasPermission(["waiter"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access your tips.
              </p>
            </div>
          );
        }
        // Pass the staffId to the WaiterTips component
        {
          const staffId = actualStaffDetails
            ? (actualStaffDetails as any)._id ||
              (actualStaffDetails as any).id ||
              ""
            : "";
          return <WaiterTips staffId={staffId} />;
        }
      case "notifications":
        // Notifications accessible to waiters
        if (!hasPermission(["waiter"])) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to access notifications.
              </p>
            </div>
          );
        }
        // Pass the staffId to the StaffNotifications component
        {
          const notificationStaffId = actualStaffDetails
            ? (actualStaffDetails as any)._id ||
              (actualStaffDetails as any).id ||
              ""
            : "";
          return <StaffNotifications staffId={notificationStaffId} />;
        }
      default:
        return <DashboardOverview />;
    }
  };

  return <div className="h-full w-full">{renderView()}</div>;
}
