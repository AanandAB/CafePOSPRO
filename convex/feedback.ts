import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Submit customer feedback
export const submitFeedback = mutation({
  args: {
    customerName: v.optional(v.string()),
    tableId: v.optional(v.id("tables")),
    orderId: v.optional(v.id("orders")),
    rating: v.number(),
    comment: v.string(),
    category: v.union(
      v.literal("food"),
      v.literal("service"),
      v.literal("ambiance"),
      v.literal("overall"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    // Validate rating (1-5)
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Create feedback entry
    const feedbackId = await ctx.db.insert("feedback", {
      customerId: undefined, // Not implemented yet, for future use
      customerName: args.customerName,
      tableId: args.tableId,
      orderId: args.orderId,
      rating: args.rating,
      comment: args.comment,
      category: args.category,
      status: "pending",
      timestamp: Date.now(),
    });

    return feedbackId;
  },
});

// Get all feedback
export const getAllFeedback = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("feedback").order("desc").collect();
  },
});

// Get feedback by status
export const getFeedbackByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedback")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get feedback by table
export const getFeedbackByTable = query({
  args: {
    tableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedback")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .collect();
  },
});

// Update feedback status
export const updateFeedbackStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      status: args.status,
    });
  },
});

// Get feedback statistics
export const getFeedbackStats = query({
  args: {},
  handler: async (ctx) => {
    const feedback = await ctx.db.query("feedback").collect();

    if (feedback.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        categoryDistribution: {
          food: 0,
          service: 0,
          ambiance: 0,
          overall: 0,
          other: 0,
        },
      };
    }

    // Calculate statistics
    const totalFeedback = feedback.length;
    const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = totalRating / totalFeedback;

    // Rating distribution
    const ratingDistribution = {
      1: feedback.filter((item) => item.rating === 1).length,
      2: feedback.filter((item) => item.rating === 2).length,
      3: feedback.filter((item) => item.rating === 3).length,
      4: feedback.filter((item) => item.rating === 4).length,
      5: feedback.filter((item) => item.rating === 5).length,
    };

    // Category distribution
    const categoryDistribution = {
      food: feedback.filter((item) => item.category === "food").length,
      service: feedback.filter((item) => item.category === "service").length,
      ambiance: feedback.filter((item) => item.category === "ambiance").length,
      overall: feedback.filter((item) => item.category === "overall").length,
      other: feedback.filter((item) => item.category === "other").length,
    };

    return {
      totalFeedback,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingDistribution,
      categoryDistribution,
    };
  },
});
