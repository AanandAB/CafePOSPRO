import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

// Query to get staff details by authenticated user
// This works for both manager (Convex Auth) and staff (custom auth) users
export const getStaffDetails = query({
  handler: async (ctx) => {
    // First try to get user from Convex Auth (for managers)
    const userId = await getAuthUserId(ctx);
    if (userId) {
      // This is a manager user
      const user = await ctx.db.get(userId);
      if (user) {
        return {
          id: user._id,
          email: user.email,
          name: user.name,
          role: "manager", // Managers have manager role by default
        };
      }
    }

    // If no Convex Auth user, this might be a staff member using custom auth
    // For staff members, we'll need to get their details from the staff table
    // This query should be called in conjunction with our custom auth context
    // which already has the staff details
    return null;
  },
});

// Custom mutation to validate staff PIN and return staff info
export const validateStaffPin = mutation({
  args: {
    email: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if this is a staff member with the correct PIN
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .unique();

    if (!staff) {
      throw new Error("Staff member not found");
    }

    if (!staff.pin || staff.pin !== args.pin) {
      throw new Error("Invalid PIN");
    }

    if (!staff.isActive) {
      throw new Error("Staff account is deactivated");
    }

    // Return staff details for successful validation
    return {
      id: staff._id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    };
  },
});
