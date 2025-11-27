import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllSales = query({
  args: {},
  handler: async (ctx) => {
    try {
      const sales = await ctx.db.query("sales").collect();
      return sales;
    } catch (error) {
      console.error("Error fetching all sales:", error);
      return [];
    }
  },
});

export const getDailySales = query({
  args: { date: v.number() },
  handler: async (ctx, args) => {
    try {
      const startOfDay = new Date(args.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(args.date);
      endOfDay.setHours(23, 59, 59, 999);

      const sales = await ctx.db
        .query("sales")
        .withIndex("by_date", (q) =>
          q.gte("date", startOfDay.getTime()).lte("date", endOfDay.getTime())
        )
        .collect();

      return sales;
    } catch (error) {
      console.error("Error fetching daily sales:", error);
      return [];
    }
  },
});

export const getSalesReport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Validate date range
      if (args.startDate > args.endDate) {
        throw new Error("Start date cannot be after end date");
      }

      const sales = await ctx.db
        .query("sales")
        .withIndex("by_date", (q) =>
          q.gte("date", args.startDate).lte("date", args.endDate)
        )
        .collect();

      const totalRevenue = sales.reduce(
        (sum, sale) => sum + sale.finalAmount,
        0
      );
      const totalOrders = sales.length;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const paymentModeBreakdown = sales.reduce(
        (acc, sale) => {
          const mode = sale.paymentMode || "unknown";
          acc[mode] = (acc[mode] || 0) + sale.finalAmount;
          return acc;
        },
        {} as Record<string, number>
      );

      const topItems = sales
        .flatMap((sale) => sale.items)
        .reduce(
          (acc, item) => {
            const key = item.itemName;
            if (!acc[key]) {
              acc[key] = { name: key, quantity: 0, revenue: 0 };
            }
            acc[key].quantity += item.quantity;
            acc[key].revenue += item.total;
            return acc;
          },
          {} as Record<
            string,
            { name: string; quantity: number; revenue: number }
          >
        );

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        paymentModeBreakdown,
        topItems: Object.values(topItems)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        sales,
      };
    } catch (error) {
      console.error("Error generating sales report:", error);
      // Return default values instead of throwing
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        paymentModeBreakdown: {},
        topItems: [],
        sales: [],
      };
    }
  },
});
