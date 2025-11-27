import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function DashboardOverview() {
  const stats = useQuery(api.analytics.getDashboardStats);
  const revenueChart = useQuery(api.analytics.getRevenueChart, { days: 7 });

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          Dashboard Overview
        </h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Today's Revenue
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  ₹{stats.todayRevenue.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg sm:text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Today's Orders
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {stats.todayOrders}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg sm:text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Active Orders
                </p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {stats.activeOrders}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg sm:text-xl">🔄</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Occupied Tables
                </p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {stats.occupiedTables}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg sm:text-xl">🪑</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        {revenueChart && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-amber-100 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              7-Day Revenue Trend
            </h3>
            <div className="h-48 sm:h-64 flex items-end justify-between gap-1 sm:gap-2">
              {revenueChart.map((day, index) => {
                const maxRevenue = Math.max(
                  ...revenueChart.map((d) => d.revenue)
                );
                const height =
                  maxRevenue > 0 ? (day.revenue / maxRevenue) * 160 : 0;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="w-full flex flex-col items-center">
                      <div
                        className="w-6 sm:w-8 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 hover:from-amber-600 hover:to-amber-500"
                        style={{ height: `${height}px` }}
                        title={`₹${day.revenue.toLocaleString()}`}
                      ></div>
                      <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 text-center">
                        <div>
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="font-medium">
                          ₹{day.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low Stock Alert */}
        {stats.lowStockItems > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-sm">⚠️</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-red-900">
                Low Stock Alert
              </h3>
            </div>
            <p className="text-red-700 text-sm sm:text-base mb-3 sm:mb-4">
              {stats.lowStockItems} items are running low on stock
            </p>
            <div className="space-y-2">
              {stats.lowStockItemsList.map((item) => (
                <div
                  key={item._id}
                  className="flex justify-between items-center bg-white rounded-lg p-2 sm:p-3"
                >
                  <span className="font-medium text-gray-900 text-sm sm:text-base">
                    {item.itemName}
                  </span>
                  <span className="text-red-600 font-semibold text-sm">
                    {item.quantity} left (Min: {item.lowStockThreshold})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
