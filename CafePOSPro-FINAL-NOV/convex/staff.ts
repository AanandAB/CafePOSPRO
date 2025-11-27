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
      // Removed delivery role
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
      // Removed delivery role
    ),
    pin: v.optional(v.string()),
    monthlySalary: v.optional(v.number()),
    // Removed vehicleType and licensePlate fields
  },
  handler: async (ctx, args) => {
    // Check authentication - only managers can add staff
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated - only managers can add staff");
    }
    
    // Get the authenticated user
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if the user has an email
    if (!user.email) {
      throw new Error("User email not found");
    }
    
    // Check if this user is a manager by looking for their email in the staff table
    const staffMember = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .unique();
      
    // Also check if this is a user who was created through Convex Auth (they should be allowed to add staff)
    const isAuthUser = userId !== null;
    
    if ((!staffMember || staffMember.role !== "manager" || !staffMember.isActive) && !isAuthUser) {
      throw new Error("Not authorized - only managers can add staff");
    }

    // Create the staff record
    const staffId = await ctx.db.insert("staff", {
      name: args.name,
      email: args.email,
      role: args.role,
      pin: args.pin,
      monthlySalary: args.monthlySalary,
      // Removed vehicleType and licensePlate fields
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
        // Removed delivery role
      )
    ),
    pin: v.optional(v.string()),
    monthlySalary: v.optional(v.number()),
    // Removed vehicleType and licensePlate fields
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check authentication - only managers can update staff
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Get the authenticated user
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if the user has an email
    if (!user.email) {
      throw new Error("User email not found");
    }
    
    // Check if this user is a manager by looking for their email in the staff table
    const staffMember = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .unique();
      
    // Also check if this is a user who was created through Convex Auth (they should be allowed to update staff)
    const isAuthUser = userId !== null;
    
    if ((!staffMember || staffMember.role !== "manager" || !staffMember.isActive) && !isAuthUser) {
      throw new Error("Not authorized - only managers can update staff");
    }

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
    // Check authentication - only managers can update staff PINs
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Get the authenticated user
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if the user has an email
    if (!user.email) {
      throw new Error("User email not found");
    }
    
    // Check if this user is a manager by looking for their email in the staff table
    const staffMember = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .unique();
      
    // Also check if this is a user who was created through Convex Auth (they should be allowed to update staff PINs)
    const isAuthUser = userId !== null;
    
    if ((!staffMember || staffMember.role !== "manager" || !staffMember.isActive) && !isAuthUser) {
      throw new Error("Not authorized - only managers can update staff PINs");
    }

    await ctx.db.patch(args.staffId, { pin: args.pin });
  },
});