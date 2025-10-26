import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllTables = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tables").collect();
  },
});

export const getAvailableTables = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
  },
});

export const addTable = mutation({
  args: {
    tableNumber: v.string(),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("tables", {
      ...args,
      status: "available",
    });
  },
});

export const updateTableStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("reserved")),
    currentOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { tableId, ...updates } = args;
    await ctx.db.patch(tableId, updates);
  },
});
