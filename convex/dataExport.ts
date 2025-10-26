import { query } from "./_generated/server";
import { v } from "convex/values";

// Export sales data as CSV
export const exportSalesData = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Remove authentication requirement for export functionality
    // Get sales data
    let salesQuery = ctx.db.query("sales");

    if (args.startDate !== undefined && args.endDate !== undefined) {
      salesQuery = salesQuery.filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate!),
          q.lte(q.field("date"), args.endDate!)
        )
      );
    }

    const sales = await salesQuery.collect();

    // Convert to CSV format
    const headers = [
      "Order Number",
      "Date",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Total Amount",
      "Payment Mode",
      "Staff Name",
    ];

    const rows = sales.map((sale) => [
      sale.orderNumber,
      new Date(sale.date).toISOString().split("T")[0],
      sale.items
        .map((item) => `${item.itemName} (${item.quantity})`)
        .join("; "),
      sale.subtotal,
      sale.discount,
      sale.tax,
      sale.finalAmount,
      sale.paymentMode,
      "", // Staff name would need a join with staff table
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },
});

// Export inventory data as CSV
export const exportInventoryData = query({
  args: {},
  handler: async (ctx) => {
    // Remove authentication requirement for export functionality
    // Get inventory data
    const inventory = await ctx.db.query("inventory").collect();

    // Convert to CSV format
    const headers = [
      "Item Name",
      "Category",
      "Quantity",
      "Unit Price",
      "Low Stock Threshold",
      "Supplier",
      "Barcode",
      "Image",
    ];

    const rows = inventory.map((item) => [
      item.itemName,
      item.category,
      item.quantity,
      item.unitPrice,
      item.lowStockThreshold,
      item.supplier || "",
      item.barcode || "",
      item.image || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },
});

// Export staff data as CSV
export const exportStaffData = query({
  args: {},
  handler: async (ctx) => {
    // Remove authentication requirement for export functionality
    // Get staff data
    const staff = await ctx.db.query("staff").collect();

    // Convert to CSV format
    const headers = [
      "Name",
      "Email",
      "Role",
      "Active Status",
      "Monthly Salary",
      "Join Date",
    ];

    const rows = staff.map((member) => [
      member.name,
      member.email,
      member.role,
      member.isActive ? "Active" : "Inactive",
      member.monthlySalary || "",
      new Date(member.joinDate).toISOString().split("T")[0],
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },
});

// Export ledger data as CSV
export const exportLedgerData = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Remove authentication requirement for export functionality
    // Get ledger data
    let ledgerQuery = ctx.db.query("ledger");

    if (args.startDate !== undefined && args.endDate !== undefined) {
      ledgerQuery = ledgerQuery.filter((q) =>
        q.and(
          q.gte(q.field("date"), args.startDate!),
          q.lte(q.field("date"), args.endDate!)
        )
      );
    }

    const ledger = await ledgerQuery.collect();

    // Convert to CSV format
    const headers = [
      "Type",
      "Amount",
      "Category",
      "Description",
      "Date",
      "Staff Name",
    ];

    const rows = ledger.map((entry) => [
      entry.type,
      entry.amount,
      entry.category,
      entry.description,
      new Date(entry.date).toISOString().split("T")[0],
      "", // Staff name would need a join with staff table
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  },
});
