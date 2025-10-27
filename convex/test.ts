import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const testLedgerQuery = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Test if we can access ledger data
      const ledgerEntries = await ctx.db.query("ledger").collect();

      // Test if we can access inventory data
      const inventoryItems = await ctx.db.query("inventory").collect();

      // Test if we can access staff data
      const staffMembers = await ctx.db.query("staff").collect();

      return {
        ledgerCount: ledgerEntries.length,
        inventoryCount: inventoryItems.length,
        staffCount: staffMembers.length,
        success: true,
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        success: false,
      };
    }
  },
});

export const testAddLedgerEntry = mutation({
  args: {
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    category: v.string(),
    description: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Get a sample staff member
      const staffMember = await ctx.db.query("staff").first();
      if (!staffMember) {
        throw new Error("No staff member found");
      }

      // Add a ledger entry
      const ledgerEntry = await ctx.db.insert("ledger", {
        type: args.type,
        amount: args.amount,
        category: args.category,
        description: args.description,
        date: args.date,
        staffId: staffMember._id,
      });

      return {
        success: true,
        ledgerEntryId: ledgerEntry,
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        success: false,
      };
    }
  },
});
