import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllStaff = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

export const getStaffByRole = query({
  args: {
    role: v.union(
      v.literal("manager"),
      v.literal("cashier"),
      v.literal("waiter"),
      v.literal("kitchen")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getStaffByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const addStaff = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("cashier"),
      v.literal("waiter"),
      v.literal("kitchen")
    ),
    pin: v.optional(v.string()),
    monthlySalary: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create the staff record
    const staffId = await ctx.db.insert("staff", {
      ...args,
      isActive: true,
      joinDate: Date.now(),
    });

    return staffId;
  },
});

export const updateStaff = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("manager"),
        v.literal("cashier"),
        v.literal("waiter"),
        v.literal("kitchen")
      )
    ),
    pin: v.optional(v.string()),
    monthlySalary: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { staffId, ...updates } = args;
    await ctx.db.patch(staffId, updates);
  },
});

// New mutation to update staff PIN
export const updateStaffPin = mutation({
  args: {
    staffId: v.id("staff"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify that the user is either the staff member themselves or a manager
    const currentUser = await ctx.db.get(userId as any);
    if (!currentUser) throw new Error("User not found");

    // Type guard to check if currentUser is a staff member
    if (
      "role" in currentUser &&
      currentUser.role !== "manager" &&
      currentUser._id !== args.staffId
    ) {
      throw new Error("Not authorized to update this staff member's PIN");
    }

    await ctx.db.patch(args.staffId, { pin: args.pin });
  },
});
