import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface Feedback {
  _id: string;
  customerName?: string;
  tableId?: string;
  orderId?: string;
  rating: number;
  comment: string;
  category: "food" | "service" | "ambiance" | "overall" | "other";
  status: "pending" | "reviewed" | "resolved";
  timestamp: number;
}

export function FeedbackManagement() {
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "reviewed" | "resolved"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "food" | "service" | "ambiance" | "overall" | "other"
  >("all");

  const allFeedback = useQuery(api.feedback.getAllFeedback);
  const feedbackStats = useQuery(api.feedback.getFeedbackStats);
  const updateFeedbackStatus = useMutation(api.feedback.updateFeedbackStatus);

  // Filter feedback based on selected status and category
  const filteredFeedback =
    allFeedback?.filter((feedback) => {
      const statusMatch =
        selectedStatus === "all" || feedback.status === selectedStatus;
      const categoryMatch =
        selectedCategory === "all" || feedback.category === selectedCategory;
      return statusMatch && categoryMatch;
    }) || [];

  const handleStatusUpdate = async (
    feedbackId: string,
    status: "pending" | "reviewed" | "resolved"
  ) => {
    try {
      await updateFeedbackStatus({
        feedbackId: feedbackId as any,
        status,
      });
      toast.success("Feedback status updated successfully");
    } catch (error) {
      toast.error("Failed to update feedback status");
      console.error("Error updating feedback status:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "food":
        return "bg-blue-100 text-blue-800";
      case "service":
        return "bg-green-100 text-green-800";
      case "ambiance":
        return "bg-purple-100 text-purple-800";
      case "overall":
        return "bg-amber-100 text-amber-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "reviewed":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!allFeedback || !feedbackStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Customer Feedback</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedStatus("all");
              setSelectedCategory("all");
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-md">
          <h3 className="text-sm font-medium opacity-90">Total Feedback</h3>
          <p className="text-2xl font-bold">{feedbackStats.totalFeedback}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white shadow-md">
          <h3 className="text-sm font-medium opacity-90">Average Rating</h3>
          <p className="text-2xl font-bold">{feedbackStats.averageRating}/5</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-md">
          <h3 className="text-sm font-medium opacity-90">Positive Feedback</h3>
          <p className="text-2xl font-bold">
            {feedbackStats.ratingDistribution[4] +
              feedbackStats.ratingDistribution[5]}
          </p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-xl p-4 text-white shadow-md">
          <h3 className="text-sm font-medium opacity-90">Needs Attention</h3>
          <p className="text-2xl font-bold">
            {feedbackStats.ratingDistribution[1] +
              feedbackStats.ratingDistribution[2]}
          </p>
        </div>
      </div>

      {/* Rating Distribution Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Rating Distribution
        </h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center">
              <div className="w-12 text-sm font-medium text-gray-700">
                {rating} ★
              </div>
              <div className="flex-1 mx-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-amber-600 h-2.5 rounded-full"
                    style={{
                      width:
                        feedbackStats.totalFeedback > 0
                          ? `${(feedbackStats.ratingDistribution[rating as keyof typeof feedbackStats.ratingDistribution] / feedbackStats.totalFeedback) * 100}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-10 text-sm text-gray-600 text-right">
                {
                  feedbackStats.ratingDistribution[
                    rating as keyof typeof feedbackStats.ratingDistribution
                  ]
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Categories</option>
              <option value="food">Food</option>
              <option value="service">Service</option>
              <option value="ambiance">Ambiance</option>
              <option value="overall">Overall</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-amber-100 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No feedback yet
          </h3>
          <p className="text-gray-600">
            Customers haven't submitted any feedback matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFeedback.map((feedback) => (
            <div
              key={feedback._id}
              className="bg-white rounded-xl p-6 shadow-sm border border-amber-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {feedback.customerName || "Anonymous Customer"}
                    {feedback.tableId && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Table {feedback.tableId.substring(0, 4)}...
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(feedback.timestamp).toLocaleDateString()} at{" "}
                    {new Date(feedback.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${star <= feedback.rating ? "text-amber-500" : "text-gray-300"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(feedback.category)}`}
                    >
                      {feedback.category}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}
                    >
                      {feedback.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {feedback.comment}
                </p>
              </div>

              {/* Status Update */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  {feedback.orderId && (
                    <span>Order: {feedback.orderId.substring(0, 8)}...</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={feedback.status}
                    onChange={(e) => {
                      void handleStatusUpdate(
                        feedback._id,
                        e.target.value as any
                      );
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
