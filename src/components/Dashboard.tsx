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
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStaffAuth } from "../contexts/StaffAuthContext";

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
        // POS system accessible to managers, waiters, and cashiers
        if (!hasPermission(["manager", "waiter", "cashier"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access the POS system.
              </p>
            </div>
          );
        }
        return <POSSystem />;
      case "orders":
        // Orders accessible to managers, waiters, and cashiers
        if (!hasPermission(["manager", "waiter", "cashier"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access orders.
              </p>
            </div>
          );
        }
        return <OrderManagement />;
      case "inventory":
        // Inventory accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access inventory management.
              </p>
            </div>
          );
        }
        return <InventoryManagement />;
      case "tables":
        // Tables accessible to managers, waiters, and cashiers
        if (!hasPermission(["manager", "waiter", "cashier"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access table management.
              </p>
            </div>
          );
        }
        return <TableManagement />;
      case "staff":
        // Staff management accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access staff management.
              </p>
            </div>
          );
        }
        return <StaffManagement />;
      case "sales":
        // Sales reports accessible to managers and cashiers
        if (!hasPermission(["manager", "cashier"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access sales reports.
              </p>
            </div>
          );
        }
        return <SalesReports />;
      case "analytics":
        // Analytics accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access analytics.
              </p>
            </div>
          );
        }
        return <Analytics />;
      case "kitchen":
        // Kitchen view accessible only to kitchen staff and managers
        if (!hasPermission(["manager", "kitchen"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access the kitchen dashboard.
              </p>
            </div>
          );
        }
        return <KitchenView />;
      case "settings":
        // Settings accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access settings.
              </p>
            </div>
          );
        }
        return <Settings />;
      case "feedback":
        // Feedback management accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access feedback management.
              </p>
            </div>
          );
        }
        return <FeedbackManagement />;
      case "reports":
        // Reports accessible only to managers
        if (!hasPermission(["manager"])) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Access Denied
              </h2>
              <p className="text-gray-600">
                You don't have permission to access reports.
              </p>
            </div>
          );
        }
        return <ReportsDashboard />;
      default:
        return <DashboardOverview />;
    }
  };

  return <div className="space-y-6">{renderView()}</div>;
}
