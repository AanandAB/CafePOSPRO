// This file is used to verify that all functions can be imported correctly
// It doesn't execute any tests, but ensures that the imports work without errors

import {
  getDashboardStats,
  getRevenueChart
} from "./analytics";

import {
  getAllInventory,
  getAllInventoryIncludingHidden,
  getInventoryByCategory,
  getLowStockItems,
  addInventoryItem,
  updateInventoryItem,
  updateStock,
  checkStockAvailability,
  getAllCategories,
  addCategory,
  seedDefaultCategories,
  removeDuplicateCategories,
  toggleInventoryItemStatus
} from "./inventory";

import {
  getAllStaff,
  getStaffByRole,
  getStaffByEmail,
  addStaff,
  updateStaff,
  updateStaffPin
} from "./staff";

import {
  getAllActiveOrders,
  getOrderById,
  getOrdersByWaiter,
  getOrdersByTable,
  getKitchenOrders,
  createOrder,
  updateOrderItemStatus,
  completeOrder,
  clearTableOrders,
  addLedgerEntry
} from "./orders";

import {
  getAllTables,
  getAvailableTables,
  addTable,
  updateTableStatus,
  deleteTable
} from "./tables";

import {
  getAllFeedback,
  getFeedbackByStatus,
  getFeedbackByTable,
  updateFeedbackStatus,
  getFeedbackStats
} from "./feedback";

import {
  exportSalesData,
  exportInventoryData,
  exportLedgerData,
  exportStaffData
} from "./dataExport";

// Export all functions to ensure they're properly imported
export {
  // Analytics functions
  getDashboardStats,
  getRevenueChart,
  
  // Inventory functions
  getAllInventory,
  getAllInventoryIncludingHidden,
  getInventoryByCategory,
  getLowStockItems,
  addInventoryItem,
  updateInventoryItem,
  updateStock,
  checkStockAvailability,
  getAllCategories,
  addCategory,
  seedDefaultCategories,
  removeDuplicateCategories,
  toggleInventoryItemStatus,
  
  // Staff functions
  getAllStaff,
  getStaffByRole,
  getStaffByEmail,
  addStaff,
  updateStaff,
  updateStaffPin,
  
  // Order functions
  getAllActiveOrders,
  getOrderById,
  getOrdersByWaiter,
  getOrdersByTable,
  getKitchenOrders,
  createOrder,
  updateOrderItemStatus,
  completeOrder,
  clearTableOrders,
  addLedgerEntry,
  
  // Table functions
  getAllTables,
  getAvailableTables,
  addTable,
  updateTableStatus,
  deleteTable,
  
  // Feedback functions
  getAllFeedback,
  getFeedbackByStatus,
  getFeedbackByTable,
  updateFeedbackStatus,
  getFeedbackStats,
  
  // Data export functions
  exportSalesData,
  exportInventoryData,
  exportLedgerData,
  exportStaffData
};