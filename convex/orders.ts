import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllActiveOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const getOrdersByWaiter = query({
  args: { waiterId: v.id("staff") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_waiter", (q) => q.eq("waiterId", args.waiterId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getKitchenOrders = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return orders
      .map((order) => ({
        ...order,
        pendingItems: order.items.filter(
          (item) => item.status === "pending" || item.status === "preparing"
        ),
      }))
      .filter((order) => order.pendingItems.length > 0);
  },
});

export const createOrder = mutation({
  args: {
    tableId: v.optional(v.id("tables")),
    items: v.array(
      v.object({
        inventoryId: v.id("inventory"),
        itemName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
    waiterId: v.optional(v.id("staff")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For staff members using custom auth, we'll allow order creation
    // The waiterId should be passed from the frontend
    // For managers using Convex Auth, we don't require a waiterId since they're not staff

    // Check stock availability for all items
    for (const item of args.items) {
      const inventoryItem = await ctx.db.get(item.inventoryId);
      if (!inventoryItem) {
        throw new Error(`Item ${item.itemName} not found in inventory`);
      }

      if (inventoryItem.quantity < item.quantity) {
        throw new Error(
          `Not enough ${item.itemName} in stock. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`
        );
      }
    }

    const orderNumber = `ORD-${Date.now()}`;
    const subtotal = args.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.18; // 18% GST
    const finalAmount = subtotal + tax;

    // Only include waiterId in the order if it's a valid staff ID
    const orderData: any = {
      orderNumber,
      tableId: args.tableId,
      items: args.items.map((item) => ({
        ...item,
        status: "pending" as const,
      })),
      subtotal,
      discount: 0,
      tax,
      finalAmount,
      status: "active",
      paymentStatus: "pending",
      notes: args.notes,
    };

    // Only add waiterId if it's provided and valid
    if (args.waiterId) {
      orderData.waiterId = args.waiterId;
    }

    const orderId = await ctx.db.insert("orders", orderData);

    // Update table status if table order
    if (args.tableId) {
      await ctx.db.patch(args.tableId, {
        status: "occupied",
        currentOrderId: orderId,
      });
    }

    // Update inventory (decrease stock)
    for (const item of args.items) {
      const inventoryItem = await ctx.db.get(item.inventoryId);
      if (inventoryItem) {
        await ctx.db.patch(item.inventoryId, {
          quantity: Math.max(0, inventoryItem.quantity - item.quantity),
        });
      }
    }

    return orderId;
  },
});

export const updateOrderItemStatus = mutation({
  args: {
    orderId: v.id("orders"),
    inventoryId: v.id("inventory"),
    status: v.union(
      v.literal("pending"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("served")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const updatedItems = order.items.map((item) =>
      item.inventoryId === args.inventoryId
        ? { ...item, status: args.status }
        : item
    );

    await ctx.db.patch(args.orderId, { items: updatedItems });

    // If item is marked as served, check if all items in order are served
    if (args.status === "served") {
      const allServed = updatedItems.every((item) => item.status === "served");
      if (allServed) {
        // Optionally send notification that order is ready for serving
        // In a real implementation, this could trigger a notification to the waiter
      }
    }
  },
});

export const completeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    paymentMode: v.union(
      v.literal("cash"),
      v.literal("upi"),
      v.literal("card")
    ),
    cashierId: v.id("staff"),
    discount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const discount = args.discount || 0;
    const finalAmount = order.subtotal + order.tax - discount;

    // Update order
    await ctx.db.patch(args.orderId, {
      status: "completed",
      paymentStatus: "paid",
      paymentMode: args.paymentMode,
      cashierId: args.cashierId,
      discount,
      finalAmount,
    });

    // Create sales record
    const table = order.tableId ? await ctx.db.get(order.tableId) : null;
    await ctx.db.insert("sales", {
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      tableNumber: table?.tableNumber,
      items: order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: order.subtotal,
      discount,
      tax: order.tax,
      finalAmount,
      paymentMode: args.paymentMode,
      staffId: args.cashierId,
      date: Date.now(),
    });

    // Update table status
    if (order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "available",
        currentOrderId: undefined,
      });
    }
  },
});
