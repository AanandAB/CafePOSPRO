import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Add sample categories
    const sampleCategories = [
      { name: "Food", description: "Main food items", color: "#FF6B6B" },
      {
        name: "Beverages",
        description: "Drinks and beverages",
        color: "#4ECDC4",
      },
      { name: "Desserts", description: "Sweet treats", color: "#45B7D1" },
      { name: "Breakfast", description: "Morning items", color: "#96CEB4" },
      { name: "Bakery", description: "Fresh baked goods", color: "#FFEAA7" },
    ];

    for (const category of sampleCategories) {
      await ctx.db.insert("categories", category);
    }

    // Add sample inventory items
    const sampleItems = [
      {
        itemName: "Cappuccino",
        category: "Beverages",
        quantity: 50,
        unitPrice: 120,
        lowStockThreshold: 10,
      },
      {
        itemName: "Latte",
        category: "Beverages",
        quantity: 45,
        unitPrice: 140,
        lowStockThreshold: 10,
      },
      {
        itemName: "Espresso",
        category: "Beverages",
        quantity: 60,
        unitPrice: 100,
        lowStockThreshold: 15,
      },
      {
        itemName: "Green Tea",
        category: "Beverages",
        quantity: 30,
        unitPrice: 80,
        lowStockThreshold: 5,
      },
      {
        itemName: "Sandwich",
        category: "Food",
        quantity: 25,
        unitPrice: 180,
        lowStockThreshold: 5,
      },
      {
        itemName: "Grilled Sandwich",
        category: "Food",
        quantity: 20,
        unitPrice: 150,
        lowStockThreshold: 5,
      },
      {
        itemName: "Pasta",
        category: "Food",
        quantity: 15,
        unitPrice: 220,
        lowStockThreshold: 5,
      },
      {
        itemName: "Croissant",
        category: "Bakery",
        quantity: 20,
        unitPrice: 90,
        lowStockThreshold: 5,
      },
      {
        itemName: "Muffin",
        category: "Bakery",
        quantity: 18,
        unitPrice: 70,
        lowStockThreshold: 5,
      },
      {
        itemName: "Danish Pastry",
        category: "Bakery",
        quantity: 15,
        unitPrice: 85,
        lowStockThreshold: 5,
      },
      {
        itemName: "Cheesecake",
        category: "Desserts",
        quantity: 12,
        unitPrice: 220,
        lowStockThreshold: 3,
      },
      {
        itemName: "Chocolate Cake",
        category: "Desserts",
        quantity: 10,
        unitPrice: 180,
        lowStockThreshold: 3,
      },
      {
        itemName: "Ice Cream",
        category: "Desserts",
        quantity: 25,
        unitPrice: 120,
        lowStockThreshold: 5,
      },
      {
        itemName: "Pancakes",
        category: "Breakfast",
        quantity: 20,
        unitPrice: 160,
        lowStockThreshold: 5,
      },
      {
        itemName: "French Toast",
        category: "Breakfast",
        quantity: 15,
        unitPrice: 140,
        lowStockThreshold: 5,
      },
    ];

    for (const item of sampleItems) {
      await ctx.db.insert("inventory", { ...item, isActive: true });
    }

    // Add sample tables
    const sampleTables = [
      { tableNumber: "1", capacity: 2, status: "available" as const },
      { tableNumber: "2", capacity: 4, status: "available" as const },
      { tableNumber: "3", capacity: 2, status: "available" as const },
      { tableNumber: "4", capacity: 6, status: "available" as const },
      { tableNumber: "5", capacity: 4, status: "available" as const },
      { tableNumber: "6", capacity: 2, status: "available" as const },
    ];

    for (const table of sampleTables) {
      await ctx.db.insert("tables", table);
    }

    // Add sample staff
    const sampleStaff = [
      {
        name: "John Manager",
        email: "john@cafe.com",
        role: "manager" as const,
        isActive: true,
        joinDate: Date.now(),
        monthlySalary: 50000,
      },
      {
        name: "Sarah Cashier",
        email: "sarah@cafe.com",
        role: "cashier" as const,
        isActive: true,
        joinDate: Date.now(),
        monthlySalary: 25000,
      },
      {
        name: "Mike Waiter",
        email: "mike@cafe.com",
        role: "waiter" as const,
        isActive: true,
        joinDate: Date.now(),
        monthlySalary: 20000,
      },
      {
        name: "Lisa Chef",
        email: "lisa@cafe.com",
        role: "kitchen" as const,
        isActive: true,
        joinDate: Date.now(),
        monthlySalary: 30000,
      },
    ];

    for (const staff of sampleStaff) {
      await ctx.db.insert("staff", staff);
    }

    return "Sample data created successfully";
  },
});

export const createSampleOrderAndSale = mutation({
  args: {},
  handler: async (ctx) => {
    // Get a sample staff member (cashier)
    const cashier = await ctx.db
      .query("staff")
      .withIndex("by_role", (q) => q.eq("role", "cashier"))
      .first();

    if (!cashier) {
      throw new Error("No cashier found in the database");
    }

    // Get a sample inventory item
    const inventoryItem = await ctx.db.query("inventory").first();
    if (!inventoryItem) {
      throw new Error("No inventory items found");
    }

    // Create a sample order
    const orderNumber = `ORD-${Date.now()}`;
    const subtotal = inventoryItem.unitPrice * 2;
    const tax = subtotal * 0.18; // 18% GST
    const finalAmount = subtotal + tax;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      items: [
        {
          inventoryId: inventoryItem._id,
          itemName: inventoryItem.itemName,
          quantity: 2,
          unitPrice: inventoryItem.unitPrice,
          total: inventoryItem.unitPrice * 2,
          status: "pending",
        },
      ],
      subtotal,
      discount: 0,
      tax,
      finalAmount,
      status: "completed",
      paymentStatus: "paid",
      paymentMode: "cash",
      cashierId: cashier._id,
    });

    // Create a corresponding sales record
    await ctx.db.insert("sales", {
      orderId: orderId,
      orderNumber: orderNumber,
      items: [
        {
          itemName: inventoryItem.itemName,
          quantity: 2,
          unitPrice: inventoryItem.unitPrice,
          total: inventoryItem.unitPrice * 2,
        },
      ],
      subtotal,
      discount: 0,
      tax,
      finalAmount,
      paymentMode: "cash",
      staffId: cashier._id,
      date: Date.now(),
    });

    return "Sample order and sale created successfully";
  },
});
