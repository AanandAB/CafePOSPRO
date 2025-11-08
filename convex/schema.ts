import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Restaurant profile and settings
  restaurant: defineTable({
    name: v.string(),
    address: v.string(),
    gstNumber: v.optional(v.string()),
    currency: v.string(),
    logo: v.optional(v.string()),
    theme: v.string(),
    enableVAT: v.optional(v.boolean()),
    vatRate: v.optional(v.number()),
    upiId: v.optional(v.string()), // Add the missing upiId field
  }),

  // Staff management
  staff: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("cashier"),
      v.literal("waiter"),
      v.literal("kitchen")
    ),
    pin: v.optional(v.string()),
    isActive: v.boolean(),
    monthlySalary: v.optional(v.number()),
    joinDate: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Inventory management
  inventory: defineTable({
    itemName: v.string(),
    category: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    lowStockThreshold: v.number(),
    supplier: v.optional(v.string()),
    barcode: v.optional(v.string()),
    image: v.optional(v.string()), // Add image field
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_name", ["itemName"]),

  // Categories for inventory
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
  }),

  // Tables in restaurant
  tables: defineTable({
    tableNumber: v.string(),
    capacity: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("reserved")
    ),
    currentOrderId: v.optional(v.id("orders")),
  }).index("by_status", ["status"]),

  // Orders management
  orders: defineTable({
    orderNumber: v.string(),
    tableId: v.optional(v.id("tables")),
    items: v.array(
      v.object({
        inventoryId: v.id("inventory"),
        itemName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
        cookingInstructions: v.optional(v.string()),
        status: v.union(
          v.literal("pending"),
          v.literal("preparing"),
          v.literal("ready"),
          v.literal("served")
        ),
      })
    ),
    subtotal: v.number(),
    discount: v.number(),
    tax: v.number(),
    tip: v.optional(v.number()), // Add tip field to orders
    tipAssignedTo: v.optional(v.id("staff")), // Track which waiter received the tip
    finalAmount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    paymentStatus: v.union(v.literal("pending"), v.literal("paid")),
    paymentMode: v.optional(
      v.union(v.literal("cash"), v.literal("card"), v.literal("upi"))
    ),
    waiterId: v.optional(v.id("staff")),
    cashierId: v.optional(v.id("staff")),
    notes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_table", ["tableId"])
    .index("by_waiter", ["waiterId"]),

  // Sales records
  sales: defineTable({
    orderId: v.id("orders"),
    orderNumber: v.string(),
    tableNumber: v.optional(v.string()),
    items: v.array(
      v.object({
        itemName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
    subtotal: v.number(),
    discount: v.number(),
    tax: v.number(),
    finalAmount: v.number(),
    paymentMode: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("upi")
    ),
    staffId: v.id("staff"),
    date: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_staff", ["staffId"]),

  // Ledger entries
  ledger: defineTable({
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    date: v.number(),
    relatedSaleId: v.optional(v.id("sales")),
    staffId: v.id("staff"),
  })
    .index("by_type", ["type"])
    .index("by_date", ["date"]),

  // Payroll management
  payroll: defineTable({
    staffId: v.id("staff"),
    month: v.number(),
    year: v.number(),
    baseSalary: v.number(),
    attendanceDays: v.number(),
    totalWorkingDays: v.number(),
    deductions: v.number(),
    bonus: v.number(),
    tips: v.number(), // Add tips field
    finalAmount: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    paymentDate: v.optional(v.number()),
  })
    .index("by_staff", ["staffId"])
    .index("by_month_year", ["month", "year"]),

  // Tips tracking
  tips: defineTable({
    orderId: v.id("orders"),
    amount: v.number(),
    assignedTo: v.id("staff"), // The waiter who receives the tip
    assignedBy: v.optional(v.id("staff")), // Manager who assigned/distributed the tip
    status: v.union(v.literal("pending"), v.literal("paid")), // Track if tip has been paid
    date: v.number(), // Date the tip was received
    paymentDate: v.optional(v.number()), // Date the tip was paid out
  })
    .index("by_staff", ["assignedTo"])
    .index("by_status", ["status"]),

  // Attendance tracking
  attendance: defineTable({
    staffId: v.id("staff"),
    date: v.number(),
    checkIn: v.optional(v.number()),
    checkOut: v.optional(v.number()),
    totalHours: v.optional(v.number()),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("half_day")
    ),
  })
    .index("by_staff", ["staffId"])
    .index("by_date", ["date"]),

  // Notifications
  notifications: defineTable({
    type: v.string(),
    title: v.string(),
    message: v.string(),
    userId: v.optional(v.id("staff")),
    orderId: v.optional(v.string()),
    tableId: v.optional(v.id("tables")),
    tableNumber: v.optional(v.string()),
    timestamp: v.number(),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    accepted: v.optional(v.boolean()), // Track if notification has been accepted
    acceptedBy: v.optional(v.id("staff")), // Track which staff member accepted
    acceptedAt: v.optional(v.number()), // Track when accepted
  })
    .index("by_user", ["userId"])
    .index("by_read", ["read"])
    .index("by_table", ["tableId"])
    .index("by_accepted", ["accepted"]),

  // Customer Feedback
  feedback: defineTable({
    customerId: v.optional(v.id("staff")), // For authenticated customers, if applicable
    customerName: v.optional(v.string()), // For anonymous feedback
    tableId: v.optional(v.id("tables")), // Table reference if feedback is table-specific
    orderId: v.optional(v.id("orders")), // Order reference if feedback is order-specific
    rating: v.number(), // Rating from 1-5
    comment: v.string(), // Feedback comment
    category: v.union(
      v.literal("food"),
      v.literal("service"),
      v.literal("ambiance"),
      v.literal("overall"),
      v.literal("other")
    ), // Feedback category
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved")
    ), // Feedback status
    timestamp: v.number(), // When feedback was submitted
  })
    .index("by_table", ["tableId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_timestamp", ["timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
