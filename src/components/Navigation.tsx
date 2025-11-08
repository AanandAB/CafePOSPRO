import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStaffAuth } from "../contexts/StaffAuthContext";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const staffDetails = useQuery(api.auth.getStaffDetails);
  const { staff: staffAuth } = useStaffAuth();

  // Get the actual staff details (either from Convex Auth for managers or custom auth for staff)
  const actualStaffDetails = staffDetails || staffAuth;

  // Define menu items for different roles
  const managerItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "pos", label: "POS System", icon: "🛒" },
    { id: "orders", label: "Orders", icon: "📋" },
    { id: "inventory", label: "Inventory", icon: "📦" },
    { id: "tables", label: "Tables", icon: "🪑" },
    { id: "staff", label: "Staff", icon: "👥" },
    { id: "tips", label: "Tip Management", icon: "💰" }, // Add tip management
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "feedback", label: "Feedback", icon: "💬" },
    { id: "sales", label: "Sales", icon: "💰" },
    { id: "analytics", label: "Analytics", icon: "🔍" },
    { id: "uaetax", label: "UAE VAT Reports", icon: "🧾" }, // Add UAE tax reports
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const waiterItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "pos", label: "POS System", icon: "🛒" },
    { id: "orders", label: "My Orders", icon: "📋" },
    { id: "tables", label: "Tables", icon: "🪑" },
    { id: "notifications", label: "Notifications", icon: "🔔" }, // Add notifications
    { id: "mytips", label: "My Tips", icon: "💰" }, // Add my tips for waiters
  ];

  const cashierItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "pos", label: "POS System", icon: "🛒" },
    { id: "orders", label: "Orders", icon: "📋" },
    { id: "tables", label: "Tables", icon: "🪑" },
    { id: "sales", label: "Sales", icon: "💰" },
  ];

  const kitchenItems = [
    { id: "kitchen", label: "Kitchen Dashboard", icon: "🍳" },
  ];

  // Filter menu items based on user role
  const getMenuItems = () => {
    if (!actualStaffDetails) {
      return managerItems; // Default to manager items if no staff details
    }

    switch (actualStaffDetails.role) {
      case "manager":
        return managerItems;
      case "waiter":
        return waiterItems;
      case "cashier":
        return cashierItems;
      case "kitchen":
        return kitchenItems;
      default:
        return managerItems; // Default to manager items
    }
  };

  const items = getMenuItems();

  return (
    <nav className="w-64 bg-white border-r border-amber-200 shadow-sm h-full">
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg text-left transition-colors ${
                currentView === item.id
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-gray-700 hover:bg-amber-50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-sm sm:text-base">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
