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

export const getBusyHourAnalysis = query({
  args: {},
  handler: async (ctx) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) => 
        q.gte("date", startTimestamp).lte("date", endTimestamp)
      )
      .collect();
      
    const orders = await ctx.db
      .query("orders")
      .collect();
      
    const recentOrders = orders.filter(order => 
      order._creationTime >= startTimestamp && 
      order._creationTime <= endTimestamp &&
      order.status === "completed"
    );
    
    const hourlyData: Record<number, any> = {};
    
    // Process sales data by hour
    sales.forEach(sale => {
      const hour = new Date(sale.date).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          revenue: 0,
          orderCount: 0
        };
      }
      hourlyData[hour].revenue += sale.finalAmount;
      hourlyData[hour].orderCount += 1;
    });
    
    // Convert to array and sort by revenue
    const hourlyArray = Object.values(hourlyData);
    hourlyArray.sort((a, b) => b.revenue - a.revenue);
    
    const peakHours = hourlyArray.slice(0, 5);
    const slowHours = [...hourlyArray].sort((a, b) => a.orderCount - b.orderCount).slice(0, 5);
    
    return {
      peakHours,
      slowHours
    };
  }
});

// Add the missing getSalesData function for UAE tax reports
export const getSalesData = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all sales records
      const salesRecords = await ctx.db.query("sales").collect();
      
      // Map sales records to the format expected by UAE tax reports
      return salesRecords.map(sale => ({
        _id: sale._id,
        orderId: sale.orderId,
        orderNumber: sale.orderNumber || "",
        tableNumber: sale.tableNumber || undefined,
        items: sale.items?.map(item => ({
          itemName: item.itemName || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0
        })) || [],
        subtotal: sale.subtotal || 0,
        discount: sale.discount || 0,
        tax: sale.tax || 0,
        finalAmount: sale.finalAmount || 0,
        paymentMode: sale.paymentMode || "cash",
        staffId: sale.staffId || "",
        date: sale.date || Date.now()
      }));
    } catch (error) {
      console.error("Error fetching sales data:", error);
      return [];
    }
  }
});