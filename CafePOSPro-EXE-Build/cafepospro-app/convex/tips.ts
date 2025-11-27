import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel"; // Import Id type

// Function to add a tip for an order
export const addTip = mutation({
  args: {
    orderId: v.id("orders"),
    amount: v.number(),
    assignedTo: v.id("staff"), // The waiter who receives the tip
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create tip record
    const tipId = await ctx.db.insert("tips", {
      orderId: args.orderId,
      amount: args.amount,
      assignedTo: args.assignedTo,
      status: "pending",
      date: Date.now(),
    });

    return tipId;
  },
});

// Function to get tips for a specific waiter
export const getTipsForWaiter = query({
  args: {
    staffId: v.string(), // Accept string ID
    status: v.optional(v.union(v.literal("pending"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    // Convert string ID to Convex ID
    const staffId = args.staffId as unknown as Id<"staff">;
    
    let query = ctx.db
      .query("tips")
      .withIndex("by_staff", (q) => q.eq("assignedTo", staffId));
      
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query.collect();
  },
});

// Function to get all tips (for managers)
export const getAllTips = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("tips");
      
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query.collect();
  },
});

// Function to mark tip as paid (manager action)
export const markTipAsPaid = mutation({
  args: {
    tipId: v.id("tips"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Update tip status to paid
    await ctx.db.patch(args.tipId, {
      status: "paid",
      paymentDate: Date.now(),
    });

    return "Tip marked as paid";
  },
});

// Function to get total pending tips for a waiter
export const getTotalPendingTipsForWaiter = query({
  args: {
    staffId: v.string(), // Accept string ID
  },
  handler: async (ctx, args) => {
    // Convert string ID to Convex ID
    const staffId = args.staffId as unknown as Id<"staff">;
    
    const tips = await ctx.db
      .query("tips")
      .withIndex("by_staff", (q) => q.eq("assignedTo", staffId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return tips.reduce((sum, tip) => sum + tip.amount, 0);
  },
});

// Function to get total paid tips for a waiter
export const getTotalPaidTipsForWaiter = query({
  args: {
    staffId: v.string(), // Accept string ID
  },
  handler: async (ctx, args) => {
    // Convert string ID to Convex ID
    const staffId = args.staffId as unknown as Id<"staff">;
    
    const tips = await ctx.db
      .query("tips")
      .withIndex("by_staff", (q) => q.eq("assignedTo", staffId))
      .filter((q) => q.eq(q.field("status"), "paid"))
      .collect();

    return tips.reduce((sum, tip) => sum + tip.amount, 0);
  },
});