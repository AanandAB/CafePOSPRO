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

// New function for Labor Cost Management
export const getLaborCostAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get attendance records for the period
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => 
        q.gte("date", startTimestamp).lte("date", endTimestamp)
      )
      .collect();
    
    // Get staff information
    const staffMembers = await ctx.db.query("staff").collect();
    
    // Calculate labor costs
    const laborCosts = await Promise.all(
      staffMembers.map(async (staff) => {
        // Get attendance for this staff member
        const staffAttendance = attendanceRecords.filter(
          (record) => record.staffId === staff._id
        );
        
        // Calculate total hours worked
        let totalHours = 0;
        staffAttendance.forEach((record) => {
          if (record.totalHours) {
            totalHours += record.totalHours;
          } else if (record.checkIn && record.checkOut) {
            const hours = (record.checkOut - record.checkIn) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });
        
        // Calculate cost based on monthly salary
        const monthlySalary = staff.monthlySalary || 0;
        const hourlyRate = monthlySalary / (30 * 8); // Assuming 8 hours/day
        const totalCost = totalHours * hourlyRate;
        
        return {
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          totalHours,
          hourlyRate,
          totalCost,
        };
      })
    );
    
    // Calculate productivity ratios
    const productivityData = await Promise.all(
      staffMembers.map(async (staff) => {
        // Get orders handled by this staff member
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_waiter", (q) => q.eq("waiterId", staff._id))
          .collect();
        
        // Filter orders within the date range
        const recentOrders = orders.filter(
          (order) => order._creationTime >= startTimestamp && order._creationTime <= endTimestamp
        );
        
        // Get attendance for this staff member
        const staffAttendance = attendanceRecords.filter(
          (record) => record.staffId === staff._id
        );
        
        // Calculate total hours worked
        let totalHours = 0;
        staffAttendance.forEach((record) => {
          if (record.totalHours) {
            totalHours += record.totalHours;
          } else if (record.checkIn && record.checkOut) {
            const hours = (record.checkOut - record.checkIn) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });
        
        // Calculate orders per hour
        const ordersPerHour = totalHours > 0 ? recentOrders.length / totalHours : 0;
        
        // Calculate revenue generated
        const revenueGenerated = recentOrders.reduce(
          (sum, order) => sum + order.finalAmount,
          0
        );
        
        // Calculate revenue per hour
        const revenuePerHour = totalHours > 0 ? revenueGenerated / totalHours : 0;
        
        return {
          staffId: staff._id,
          name: staff.name,
          role: staff.role,
          totalOrders: recentOrders.length,
          totalHours,
          ordersPerHour,
          revenueGenerated,
          revenuePerHour,
        };
      })
    );
    
    const totalLaborCost = laborCosts.reduce((sum, staff) => sum + staff.totalCost, 0);
    const totalRevenue = productivityData.reduce((sum, staff) => sum + staff.revenueGenerated, 0);
    const laborCostRatio = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0;
    
    return {
      laborCosts,
      productivityData,
      totalLaborCost,
      totalRevenue,
      laborCostRatio,
    };
  },
});

// New function for Food Cost Monitoring
export const getFoodCostAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get sales records for the period
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) => 
        q.gte("date", startTimestamp).lte("date", endTimestamp)
      )
      .collect();
    
    // Get inventory data
    const inventory = await ctx.db.query("inventory").collect();
    
    // Calculate food costs
    const itemCosts: Record<string, number> = {};
    const itemQuantities: Record<string, number> = {};
    
    // Process each sale to calculate item costs
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!itemCosts[item.itemName]) {
          itemCosts[item.itemName] = 0;
          itemQuantities[item.itemName] = 0;
        }
        
        // Find inventory item to get unit cost
        const inventoryItem = inventory.find(
          (inv) => inv.itemName === item.itemName
        );
        
        if (inventoryItem) {
          const unitCost = inventoryItem.unitPrice;
          const totalCost = unitCost * item.quantity;
          
          itemCosts[item.itemName] += totalCost;
          itemQuantities[item.itemName] += item.quantity;
        }
      });
    });
    
    // Calculate food cost percentages
    const foodCostData = Object.keys(itemCosts).map((itemName) => {
      const totalCost = itemCosts[itemName];
      const totalQuantity = itemQuantities[itemName];
      
      // Calculate revenue from this item
      const itemRevenue = sales
        .filter((sale) => 
          sale.items.some((item) => item.itemName === itemName)
        )
        .reduce((sum, sale) => {
          const item = sale.items.find((i) => i.itemName === itemName);
          return sum + (item ? item.total : 0);
        }, 0);
      
      const foodCostPercentage = itemRevenue > 0 ? (totalCost / itemRevenue) * 100 : 0;
      
      return {
        itemName,
        totalCost,
        totalQuantity,
        revenue: itemRevenue,
        foodCostPercentage,
      };
    });
    
    // Sort by food cost percentage (highest first)
    foodCostData.sort((a, b) => b.foodCostPercentage - a.foodCostPercentage);
    
    // Calculate total food costs and revenue
    const totalFoodCost = foodCostData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalRevenue = foodCostData.reduce((sum, item) => sum + item.revenue, 0);
    const overallFoodCostPercentage = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;
    
    return {
      foodCostData,
      totalFoodCost,
      totalRevenue,
      overallFoodCostPercentage,
    };
  },
});



// New function for Vendor Comparison
export const getVendorAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get inventory data with supplier information
    const inventory = await ctx.db.query("inventory").collect();
    
    // Group by supplier
    const supplierData: Record<string, any> = {};
    
    inventory.forEach((item) => {
      if (item.supplier) {
        if (!supplierData[item.supplier]) {
          supplierData[item.supplier] = {
            supplier: item.supplier,
            items: [],
            totalItems: 0,
            totalValue: 0,
          };
        }
        
        supplierData[item.supplier].items.push(item);
        supplierData[item.supplier].totalItems += 1;
        supplierData[item.supplier].totalValue += item.quantity * item.unitPrice;
      }
    });
    
    // Convert to array and sort by total value
    const supplierArray = Object.values(supplierData);
    supplierArray.sort((a, b) => b.totalValue - a.totalValue);
    
    return supplierArray;
  },
});

// New function for Customer Insights
export const getCustomerInsights = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get sales records for the period
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) => 
        q.gte("date", startTimestamp).lte("date", endTimestamp)
      )
      .collect();
    
    // Get inventory data
    const inventory = await ctx.db.query("inventory").collect();
    
    // Calculate popular items
    const itemPopularity: Record<string, any> = {};
    
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!itemPopularity[item.itemName]) {
          itemPopularity[item.itemName] = {
            itemName: item.itemName,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        
        itemPopularity[item.itemName].totalQuantity += item.quantity;
        itemPopularity[item.itemName].totalRevenue += item.total;
        itemPopularity[item.itemName].orderCount += 1;
      });
    });
    
    // Convert to array and sort by quantity
    const popularItems = Object.values(itemPopularity);
    popularItems.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    // Calculate peak dining times
    const hourlyData: Record<number, any> = {};
    
    sales.forEach((sale) => {
      const hour = new Date(sale.date).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          orderCount: 0,
          revenue: 0,
        };
      }
      
      hourlyData[hour].orderCount += 1;
      hourlyData[hour].revenue += sale.finalAmount;
    });
    
    // Convert to array and sort by order count
    const peakHours = Object.values(hourlyData);
    peakHours.sort((a, b) => b.orderCount - a.orderCount);
    
    return {
      popularItems,
      peakHours,
    };
  },
});

// New function for Budget Planning
export const getBudgetPlanningData = query({
  args: { months: v.number() },
  handler: async (ctx, args) => {
    const today = new Date();
    const budgetData = [];
    
    // Get data for the specified number of months
    for (let i = 0; i < args.months; i++) {
      const monthDate = new Date(today);
      monthDate.setMonth(monthDate.getMonth() - i);
      
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      
      // Get first and last day of the month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startTimestamp = firstDay.getTime();
      const endTimestamp = lastDay.getTime();
      
      // Get sales for the month
      const monthlySales = await ctx.db
        .query("sales")
        .withIndex("by_date", (q) => 
          q.gte("date", startTimestamp).lte("date", endTimestamp)
        )
        .collect();
      
      // Get ledger entries for the month
      const monthlyLedger = await ctx.db
        .query("ledger")
        .withIndex("by_date", (q) => 
          q.gte("date", startTimestamp).lte("date", endTimestamp)
        )
        .collect();
      
      // Calculate revenue
      const revenue = monthlySales.reduce((sum, sale) => sum + sale.finalAmount, 0);
      
      // Calculate expenses
      const expenses = monthlyLedger
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      // Calculate profit
      const profit = revenue - expenses;
      
      budgetData.push({
        year,
        month: month + 1,
        monthName: monthDate.toLocaleString('default', { month: 'long' }),
        revenue,
        expenses,
        profit,
      });
    }
    
    // Sort by date (newest first)
    budgetData.sort((a, b) => 
      new Date(b.year, b.month - 1).getTime() - new Date(a.year, a.month - 1).getTime()
    );
    
    return budgetData;
  },
});

// New function for Order Prioritization
export const getOrderPrioritizationData = query({
  args: {},
  handler: async (ctx) => {
    // Get active orders
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    // Get inventory data
    const inventory = await ctx.db.query("inventory").collect();
    
    // Calculate preparation times for each order
    const orderPriorityData = await Promise.all(
      activeOrders.map(async (order) => {
        // Get table information
        let tableInfo = null;
        if (order.tableId) {
          const table = await ctx.db.get(order.tableId);
          tableInfo = table ? { tableNumber: table.tableNumber } : null;
        }
        
        // Calculate average preparation time for items in this order
        let totalPrepTime = 0;
        let itemCount = 0;
        
        order.items.forEach((item) => {
          // In a real system, you'd have predefined prep times for each item
          // For now, we'll estimate based on item complexity
          const inventoryItem = inventory.find(
            (inv) => inv.itemName === item.itemName
          );
          
          // Estimate prep time (simplified model)
          const basePrepTime = inventoryItem ? 
            Math.min(30, Math.max(5, inventoryItem.unitPrice / 10)) : 10;
          
          totalPrepTime += basePrepTime * item.quantity;
          itemCount += item.quantity;
        });
        
        // Average prep time per item
        const avgPrepTime = itemCount > 0 ? totalPrepTime / itemCount : 10;
        
        return {
          orderId: order._id,
          orderNumber: order.orderNumber,
          tableInfo,
          itemCount,
          avgPrepTime,
          totalPrepTime,
          status: order.status,
          items: order.items,
        };
      })
    );
    
    // Sort by preparation time (shortest first for prioritization)
    orderPriorityData.sort((a, b) => a.totalPrepTime - b.totalPrepTime);
    
    return orderPriorityData;
  },
});

// New function for Table Turnaround Analysis
export const getTableTurnaroundAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get all tables
    const tables = await ctx.db.query("tables").collect();
    
    // Get orders for the period
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();
    
    // Filter orders within date range
    const recentOrders = orders.filter(
      (order) => order._creationTime >= startTimestamp && order._creationTime <= endTimestamp
    );
    
    // Calculate turnaround time for each table
    const tableData = await Promise.all(
      tables.map(async (table) => {
        // Get orders for this table
        const tableOrders = recentOrders.filter(
          (order) => order.tableId === table._id
        );
        
        // Calculate average turnaround time
        let totalTurnaroundTime = 0;
        let completedOrders = 0;
        
        tableOrders.forEach((order) => {
          // In a real system, you'd track actual table occupancy times
          // For now, we'll estimate based on order completion times
          totalTurnaroundTime += 60; // Estimate 60 minutes per order
          completedOrders += 1;
        });
        
        const avgTurnaroundTime = completedOrders > 0 ? 
          totalTurnaroundTime / completedOrders : 0;
        
        return {
          tableId: table._id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          completedOrders,
          avgTurnaroundTime,
        };
      })
    );
    
    // Calculate overall metrics
    const totalCompletedOrders = tableData.reduce(
      (sum, table) => sum + table.completedOrders, 0
    );
    
    const avgOverallTurnaround = tableData.length > 0 ? 
      tableData.reduce((sum, table) => sum + table.avgTurnaroundTime, 0) / tableData.length : 0;
    
    return {
      tableData,
      totalCompletedOrders,
      avgOverallTurnaround,
    };
  },
});

// New function for Preparation Time Tracking
export const getPreparationTimeAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get completed orders for the period
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();
    
    // Filter orders within date range
    const recentOrders = orders.filter(
      (order) => order._creationTime >= startTimestamp && order._creationTime <= endTimestamp
    );
    
    // Get inventory data
    const inventory = await ctx.db.query("inventory").collect();
    
    // Track preparation times by item
    const itemPrepTimes: Record<string, any> = {};
    
    recentOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!itemPrepTimes[item.itemName]) {
          itemPrepTimes[item.itemName] = {
            itemName: item.itemName,
            totalPrepTime: 0,
            itemCount: 0,
            avgPrepTime: 0,
          };
        }
        
        // Estimate prep time (simplified model)
        const inventoryItem = inventory.find(
          (inv) => inv.itemName === item.itemName
        );
        
        const estimatedPrepTime = inventoryItem ? 
          Math.min(30, Math.max(5, inventoryItem.unitPrice / 10)) : 10;
        
        itemPrepTimes[item.itemName].totalPrepTime += estimatedPrepTime * item.quantity;
        itemPrepTimes[item.itemName].itemCount += item.quantity;
      });
    });
    
    // Calculate average prep times
    Object.keys(itemPrepTimes).forEach((itemName) => {
      const item = itemPrepTimes[itemName];
      item.avgPrepTime = item.itemCount > 0 ? 
        item.totalPrepTime / item.itemCount : 0;
    });
    
    // Convert to array and sort by average prep time
    const prepTimeData = Object.values(itemPrepTimes);
    prepTimeData.sort((a, b) => b.avgPrepTime - a.avgPrepTime);
    
    // Calculate overall metrics
    const totalItems = prepTimeData.reduce((sum, item) => sum + item.itemCount, 0);
    const totalTime = prepTimeData.reduce((sum, item) => sum + item.totalPrepTime, 0);
    const overallAvgPrepTime = totalItems > 0 ? totalTime / totalItems : 0;
    
    return {
      prepTimeData,
      totalItems,
      totalTime,
      overallAvgPrepTime,
    };
  },
});

// New function for Busy Hour Management
export const getBusyHourAnalysis = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - args.days);
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // Get sales records for the period
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_date", (q) => 
        q.gte("date", startTimestamp).lte("date", endTimestamp)
      )
      .collect();
    
    // Get orders for the period
    const orders = await ctx.db
      .query("orders")
      .collect();
    
    // Filter orders within date range
    const recentOrders = orders.filter(
      (order) => order._creationTime >= startTimestamp && order._creationTime <= endTimestamp
    );
    
    // Analyze by hour
    const hourlyData: Record<number, any> = {};
    
    sales.forEach((sale) => {
      const hour = new Date(sale.date).getHours();
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          orderCount: 0,
          revenue: 0,
          avgOrderValue: 0,
        };
      }
      
      hourlyData[hour].orderCount += 1;
      hourlyData[hour].revenue += sale.finalAmount;
    });
    
    // Calculate average order values
    Object.keys(hourlyData).forEach((hourStr) => {
      const hour = parseInt(hourStr);
      const data = hourlyData[hour];
      data.avgOrderValue = data.orderCount > 0 ? 
        data.revenue / data.orderCount : 0;
    });
    
    // Convert to array
    const hourlyArray = Object.values(hourlyData);
    
    // Sort by order count (busiest hours first)
    hourlyArray.sort((a, b) => b.orderCount - a.orderCount);
    
    // Get peak and slow hours
    const peakHours = hourlyArray.slice(0, 5);
    const slowHours = [...hourlyArray].sort((a, b) => a.orderCount - b.orderCount).slice(0, 5);
    
    return {
      hourlyData: hourlyArray,
      peakHours,
      slowHours,
    };
  },
});