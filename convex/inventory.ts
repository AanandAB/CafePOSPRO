import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllInventory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("inventory")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// New query to get inventory with limit for better performance in self-service
export const getInventoryWithLimit = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100; // Default to 100 items change this according to the max items that hotel or cafe or restaurents might have
    return await ctx.db
      .query("inventory")
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);
  },
});

export const getAllInventoryIncludingHidden = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inventory").collect();
  },
});

export const getInventoryByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getLowStockItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("inventory")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return items.filter((item) => item.quantity <= item.lowStockThreshold);
  },
});

export const addInventoryItem = mutation({
  args: {
    itemName: v.string(),
    category: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    lowStockThreshold: v.number(),
    supplier: v.optional(v.string()),
    barcode: v.optional(v.string()),
    image: v.optional(v.string()), // Add image field
  },
  handler: async (ctx, args) => {
    // Allow both Convex Auth and custom staff auth
    // const userId = await getAuthUserId(ctx);
    // For inventory management, we'll allow access to both managers and staff
    // In a production app, you might want more specific permission checking

    // Check if item with this name already exists
    const existingItem = await ctx.db
      .query("inventory")
      .withIndex("by_name", (q) => q.eq("itemName", args.itemName))
      .first();

    if (existingItem) {
      throw new Error(`Item "${args.itemName}" already exists in inventory`);
    }

    // Check if category exists, if not create it
    const existingCategory = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.category))
      .first();

    if (!existingCategory) {
      // Create new category with default color
      await ctx.db.insert("categories", {
        name: args.category,
        color: "#3B82F6", // Default blue color
      });
    }

    return await ctx.db.insert("inventory", {
      ...args,
      isActive: true,
    });
  },
});

export const updateInventoryItem = mutation({
  args: {
    itemId: v.id("inventory"),
    itemName: v.optional(v.string()),
    category: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    supplier: v.optional(v.string()),
    barcode: v.optional(v.string()),
    image: v.optional(v.string()), // Add image field
  },
  handler: async (ctx, args) => {
    // Allow both Convex Auth and custom staff auth
    // const userId = await getAuthUserId(ctx);
    // For inventory management, we'll allow access to both managers and staff
    // In a production app, you might want more specific permission checking

    const { itemId, ...updates } = args;

    // If category is being updated, check if it exists and create if not
    if (updates.category) {
      const existingCategory = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("name"), updates.category))
        .first();

      if (!existingCategory) {
        // Create new category with default color
        await ctx.db.insert("categories", {
          name: updates.category,
          color: "#3B82F6", // Default blue color
        });
      }
    }

    await ctx.db.patch(itemId, updates);
  },
});

export const updateStock = mutation({
  args: {
    itemId: v.id("inventory"),
    quantityChange: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const newQuantity = Math.max(0, item.quantity + args.quantityChange);
    await ctx.db.patch(args.itemId, { quantity: newQuantity });
  },
});

// New mutation to check stock availability before order creation
export const checkStockAvailability = query({
  args: {
    items: v.array(
      v.object({
        inventoryId: v.id("inventory"),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const item of args.items) {
      const inventoryItem = await ctx.db.get(item.inventoryId);
      if (!inventoryItem) {
        results.push({
          inventoryId: item.inventoryId,
          available: false,
          message: "Item not found",
          availableQuantity: 0,
        });
        continue;
      }

      if (inventoryItem.quantity < item.quantity) {
        results.push({
          inventoryId: item.inventoryId,
          available: false,
          message: `Only ${inventoryItem.quantity} items available`,
          availableQuantity: inventoryItem.quantity,
        });
        continue;
      }

      results.push({
        inventoryId: item.inventoryId,
        available: true,
        message: "Available",
        availableQuantity: inventoryItem.quantity,
      });
    }

    return results;
  },
});

export const getAllCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

export const addCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Allow both Convex Auth and custom staff auth
    // const userId = await getAuthUserId(ctx);
    // For category management, we'll allow access to both managers and staff
    // In a production app, you might want more specific permission checking

    return await ctx.db.insert("categories", args);
  },
});

export const seedDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Allow both Convex Auth and custom staff auth
    // const userId = await getAuthUserId(ctx);
    // For seeding, we'll allow access to both managers and staff
    // In a production app, you might want more specific permission checking

    const existingCategories = await ctx.db.query("categories").collect();
    if (existingCategories.length > 0) {
      return "Categories already exist";
    }

    const defaultCategories = [
      {
        name: "Beverages",
        description: "Hot and cold drinks",
        color: "#3B82F6",
      },
      { name: "Food", description: "Main dishes and snacks", color: "#EF4444" },
      { name: "Desserts", description: "Sweet treats", color: "#F59E0B" },
      { name: "Bakery", description: "Fresh baked goods", color: "#8B5CF6" },
      { name: "Breakfast", description: "Morning specials", color: "#10B981" },
    ];

    for (const category of defaultCategories) {
      await ctx.db.insert("categories", category);
    }

    return "Default categories created";
  },
});

export const removeDuplicateCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all categories
    const allCategories = await ctx.db.query("categories").collect();

    // Group categories by name
    const categoriesByName: { [key: string]: any[] } = {};
    for (const category of allCategories) {
      const name = category.name;
      if (!categoriesByName[name]) {
        categoriesByName[name] = [];
      }
      categoriesByName[name].push(category);
    }

    // For each group with duplicates, keep the first one and delete the rest
    let deletedCount = 0;
    for (const name in categoriesByName) {
      const categories = categoriesByName[name];
      if (categories.length > 1) {
        // Keep the first one, delete the rest
        for (let i = 1; i < categories.length; i++) {
          await ctx.db.delete(categories[i]._id);
          deletedCount++;
        }
      }
    }

    return {
      success: true,
      message: `Removed ${deletedCount} duplicate categories`,
    };
  },
});

export const toggleInventoryItemStatus = mutation({
  args: {
    itemId: v.id("inventory"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Allow both Convex Auth and custom staff auth
    // const userId = await getAuthUserId(ctx);
    // For inventory management, we'll allow access to both managers and staff
    // In a production app, you might want more specific permission checking

    await ctx.db.patch(args.itemId, {
      isActive: args.isActive,
    });

    return { success: true };
  },
});
