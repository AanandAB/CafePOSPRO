import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Define notification types
type NotificationType =
  | "new_order"
  | "order_update"
  | "low_stock"
  | "order_ready"
  | "waiter_call"
  | "water_request";

export const getAllNotifications = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query a notifications table
    // For this demo, we'll return an empty array
    return [];
  },
});

export const createNotification = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    message: v.string(),
    userId: v.optional(v.id("staff")),
    orderId: v.optional(v.string()),
    tableId: v.optional(v.id("tables")),
    tableNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would insert into a notifications table
    // For this demo, we'll just log to console
    console.log("New notification:", args);

    // In a real app, you might use a service like Firebase Cloud Messaging or WebSocket connections
    return "Notification created";
  },
});

// Function to notify kitchen staff of new orders
export const notifyKitchenOfNewOrder = mutation({
  args: {
    orderId: v.string(),
    tableNumber: v.optional(v.string()),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const message = `New order ${args.orderId} for ${args.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}${args.tableNumber ? ` at Table ${args.tableNumber}` : ""}`;

    // Notify all kitchen staff
    const kitchenStaff = await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", "kitchen"))
      .collect();

    const notifications = [];
    for (const staff of kitchenStaff) {
      const notificationId = await ctx.db.insert("notifications", {
        type: "new_order",
        title: "New Order Received",
        message,
        userId: staff._id,
        orderId: args.orderId,
        timestamp: Date.now(),
        read: false,
      });
      notifications.push(notificationId);
    }

    return `Notified ${notifications.length} kitchen staff members`;
  },
});

// Function to notify waiters of customer requests (waiter call or water request)
export const notifyWaitersOfCustomerRequest = mutation({
  args: {
    type: v.union(v.literal("waiter_call"), v.literal("water_request")),
    tableId: v.id("tables"),
    tableNumber: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the message based on request type
    const title = args.type === "waiter_call" ? "Waiter Needed" : "Water Request";
    const fullMessage = `${args.message} at Table ${args.tableNumber}`;

    // Notify all available waiters
    const waiters = await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", "waiter"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const notifications = [];
    for (const waiter of waiters) {
      const notificationId = await ctx.db.insert("notifications", {
        type: args.type,
        title,
        message: fullMessage,
        userId: waiter._id,
        tableId: args.tableId,
        tableNumber: args.tableNumber,
        timestamp: Date.now(),
        read: false,
        accepted: false, // Initially not accepted
      });
      notifications.push(notificationId);
    }

    return `Notified ${notifications.length} waiters`;
  },
});

// Function to accept a notification (waiter accepts the request)
export const acceptNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    // Update the notification to mark it as accepted
    await ctx.db.patch(args.notificationId, {
      accepted: true,
      acceptedBy: args.staffId,
      acceptedAt: Date.now(),
      read: true,
      readAt: Date.now(),
    });

    return "Notification accepted";
  },
});

// Function to get pending notifications for a user (not accepted)
export const getPendingNotifications = query({
  args: {
    userId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("accepted"), false))
      .collect();
  },
});

// Function to mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.notificationId, {
      read: true,
      readAt: Date.now(),
    });
  },
});

// Function to get unread notifications for a user
export const getUnreadNotifications = query({
  args: {
    userId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
  },
});

// Function to get accepted notifications for a table
export const getAcceptedNotificationsForTable = query({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .filter((q) => q.eq(q.field("accepted"), true))
      .collect();
    
    // Sort by accepted time, newest first
    return notifications.sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0));
  },
});
