import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    // Today's sales
    const todaySales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) => 
        q.gte("date", todayStart).lt("date", todayEnd)
      )
      .collect();

    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const todayOrders = todaySales.length;

    // Active orders
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Low stock items
    const inventory = await ctx.db.query("inventory").collect();
    const lowStockItems = inventory.filter(item => 
      item.isActive && item.quantity <= item.lowStockThreshold
    );

    // Occupied tables
    const occupiedTables = await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("status", "occupied"))
      .collect();

    return {
      todayRevenue,
      todayOrders,
      activeOrders: activeOrders.length,
      lowStockItems: lowStockItems.length,
      occupiedTables: occupiedTables.length,
      lowStockItemsList: lowStockItems.slice(0, 5),
    };
  },
});

export const getRevenueChart = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const chartData = [];
    const today = new Date();
    
    for (let i = args.days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const daySales = await ctx.db
        .query("sales")
        .withIndex("by_date", (q) => 
          q.gte("date", dayStart).lt("date", dayEnd)
        )
        .collect();
      
      const revenue = daySales.reduce((sum, sale) => sum + sale.finalAmount, 0);
      
      chartData.push({
        date: date.toISOString().split('T')[0],
        revenue,
        orders: daySales.length,
      });
    }
    
    return chartData;
  },
});
