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
  | "water_request"
  | "customer_message_to_kitchen";

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

// Function to notify kitchen staff of customer messages
export const notifyKitchenOfCustomerMessage = mutation({
  args: {
    tableId: v.id("tables"),
    tableNumber: v.string(),
    customerName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const fullMessage = `Message from ${args.customerName}: ${args.message}`;

    // Notify all kitchen staff
    const kitchenStaff = await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", "kitchen"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const notifications = [];
    for (const staff of kitchenStaff) {
      const notificationId = await ctx.db.insert("notifications", {
        type: "customer_message_to_kitchen",
        title: "Customer Message",
        message: fullMessage,
        userId: staff._id,
        tableId: args.tableId,
        tableNumber: args.tableNumber,
        timestamp: Date.now(),
        read: false,
        accepted: false, // Initially not accepted
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
    const title =
      args.type === "waiter_call" ? "Waiter Needed" : "Water Request";
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
    return notifications.sort(
      (a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0)
    );
  },
});

// Function to send a chat message
export const sendChatMessage = mutation({
  args: {
    fromUserId: v.id("staff"),
    toUserId: v.id("staff"),
    message: v.string(),
    orderId: v.optional(v.id("orders")),
    tableId: v.optional(v.id("tables")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.insert("chatMessages", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      message: args.message,
      timestamp: Date.now(),
      read: false,
      orderId: args.orderId,
      tableId: args.tableId,
    });

    return message;
  },
});

// Function to get chat messages for a user
export const getChatMessages = query({
  args: {
    userId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    // Get messages sent to this user
    const receivedMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .collect();

    // Get messages sent by this user
    const sentMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", args.userId))
      .collect();

    // Combine and sort all messages by timestamp
    const allMessages = [...receivedMessages, ...sentMessages];
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Function to mark chat messages as read
export const markChatMessagesAsRead = mutation({
  args: {
    userId: v.id("staff"),
    fromUserId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    // Get unread messages from the sender to this user
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("fromUserId"), args.fromUserId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    // Mark all as read
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        read: true,
        readAt: Date.now(),
      });
    }

    return { success: true, markedAsRead: messages.length };
  },
});

// Function to send a chat message from customer to kitchen staff
export const sendCustomerChatMessage = mutation({
  args: {
    fromCustomerId: v.string(), // Customer identifier (name or session ID)
    toUserId: v.id("staff"), // Kitchen staff member ID
    message: v.string(),
    tableId: v.id("tables"),
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.insert("customerChatMessages", {
      fromCustomerId: args.fromCustomerId,
      toUserId: args.toUserId,
      message: args.message,
      timestamp: Date.now(),
      read: false,
      tableId: args.tableId,
      tableName: args.tableName,
      isReply: false, // This is a message from customer to staff
    });

    return message;
  },
});

// Function to accept a customer chat (assign it to a specific kitchen staff member)
export const acceptCustomerChat = mutation({
  args: {
    customerId: v.string(), // Customer identifier
    staffId: v.id("staff"), // Kitchen staff member who is accepting the chat
  },
  handler: async (ctx, args) => {
    // Find all messages from this customer that don't have an assigned staff member
    const messages = await ctx.db
      .query("customerChatMessages")
      .filter((q) =>
        q.and(
          q.eq(q.field("fromCustomerId"), args.customerId),
          q.eq(q.field("acceptedBy"), undefined)
        )
      )
      .collect();

    // Assign all these messages to the accepting staff member
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        acceptedBy: args.staffId,
        toUserId: args.staffId, // Also update the toUserId to ensure messages go to the right person
      });
    }

    return { success: true, updatedMessages: messages.length };
  },
});

// Function to get ALL customer chat messages (for showing available chats)
export const getAllCustomerChatMessages = query({
  handler: async (ctx) => {
    // Get all customer chat messages
    const messages = await ctx.db.query("customerChatMessages").collect();

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Function to get customer chat messages for a kitchen staff member
export const getCustomerChatMessages = query({
  args: {
    userId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    // Get messages sent to this user or accepted by this user
    const messages = await ctx.db
      .query("customerChatMessages")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .collect();

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Function to get customer chat messages for a specific customer
export const getCustomerChatMessagesForCustomer = query({
  args: {
    customerName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all messages for this customer (both sent by customer and replies from staff)
    const messages = await ctx.db
      .query("customerChatMessages")
      .filter((q) => q.eq(q.field("fromCustomerId"), args.customerName))
      .collect();

    return messages.sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Function to mark customer chat messages as read
export const markCustomerChatMessagesAsRead = mutation({
  args: {
    userId: v.id("staff"),
    fromCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get unread messages from the customer to this user
    const messages = await ctx.db
      .query("customerChatMessages")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("fromCustomerId"), args.fromCustomerId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    // Mark all as read
    for (const message of messages) {
      await ctx.db.patch(message._id, {
        read: true,
        readAt: Date.now(),
      });
    }

    return { success: true, markedAsRead: messages.length };
  },
});

// Function to send a reply to a customer chat message
export const sendCustomerChatReply = mutation({
  args: {
    fromUserId: v.id("staff"), // Kitchen staff member ID
    toCustomerId: v.string(), // Customer identifier (name or session ID)
    message: v.string(),
    tableId: v.id("tables"),
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    // Store the reply in the customerChatMessages table
    const message = await ctx.db.insert("customerChatMessages", {
      fromCustomerId: args.toCustomerId, // This is the customer who will receive the reply
      toUserId: args.fromUserId, // This is the kitchen staff member who is sending the reply
      message: args.message,
      timestamp: Date.now(),
      read: false,
      tableId: args.tableId,
      tableName: args.tableName,
      isReply: true, // This is a reply from staff to customer
    });

    return message;
  },
});

// Function to create a default reply for chefs
export const createChefDefaultReply = mutation({
  args: {
    chefId: v.id("staff"),
    triggerKeyword: v.string(),
    replyMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a reply with this keyword already exists for this chef
    const existingReply = await ctx.db
      .query("chefDefaultReplies")
      .withIndex("by_chef", (q) => q.eq("chefId", args.chefId))
      .filter((q) => q.eq(q.field("triggerKeyword"), args.triggerKeyword))
      .first();

    if (existingReply) {
      throw new Error("A default reply with this keyword already exists");
    }

    const reply = await ctx.db.insert("chefDefaultReplies", {
      chefId: args.chefId,
      triggerKeyword: args.triggerKeyword,
      replyMessage: args.replyMessage,
      isActive: true,
    });

    return reply;
  },
});

// Function to update a chef's default reply
export const updateChefDefaultReply = mutation({
  args: {
    replyId: v.id("chefDefaultReplies"),
    replyMessage: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.replyId, {
      replyMessage: args.replyMessage,
      isActive: args.isActive,
    });

    return { success: true };
  },
});

// Function to get chef's default replies
export const getChefDefaultReplies = query({
  args: {
    chefId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chefDefaultReplies")
      .withIndex("by_chef", (q) => q.eq("chefId", args.chefId))
      .collect();
  },
});

// Function to delete a chef's default reply
export const deleteChefDefaultReply = mutation({
  args: {
    replyId: v.id("chefDefaultReplies"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.replyId);
    return { success: true };
  },
});
