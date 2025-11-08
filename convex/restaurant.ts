import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getRestaurantProfile = query({
  args: {},
  handler: async (ctx) => {
    const restaurant = await ctx.db.query("restaurant").first();
    return restaurant || {
      name: "My Café",
      address: "",
      gstNumber: "",
      currency: "$",
      theme: "coffee",
      enableVAT: true,
      vatRate: 5,
    };
  },
});

export const updateRestaurantProfile = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    gstNumber: v.optional(v.string()),
    currency: v.string(),
    theme: v.string(),
    enableVAT: v.optional(v.boolean()),
    vatRate: v.optional(v.number()),
    upiId: v.optional(v.string()), // Add the missing upiId field
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("restaurant").first();
    
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("restaurant", args);
    }
  },
});