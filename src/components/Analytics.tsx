import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const stats = useQuery(api.analytics.getDashboardStats);
  const revenueChart = useQuery(api.analytics.getRevenueChart, { days: selectedPeriod });

  if (!stats || !revenueChart) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const totalRevenue = revenueChart.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = revenueChart.reduce((sum, day) => sum + day.orders, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Calculate growth and insights
  const midPoint = Math.floor(revenueChart.length / 2);
  const firstHalf = revenueChart.slice(0, midPoint);
  const secondHalf = revenueChart.slice(midPoint);
  const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0);
  const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0);
  const growthRate = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

  const bestDay = revenueChart.reduce((best, day) => day.revenue > best.revenue ? day : best);
  const worstDay = revenueChart.reduce((worst, day) => day.revenue < worst.revenue ? day : worst);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
        
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === days
                  ? "bg-amber-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{selectedPeriod}-Day Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
              <div className="flex items-center mt-1">
                <span className={`text-xs font-medium ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growthRate >= 0 ? '↗' : '↘'} {Math.abs(growthRate).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-purple-600">₹{averageOrderValue.toFixed(0)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-orange-600">₹{stats.todayRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{selectedPeriod}-Day Revenue Trend</h3>
        <div className="h-80 flex items-end justify-between gap-1">
          {revenueChart.map((day, index) => {
            const maxRevenue = Math.max(...revenueChart.map(d => d.revenue));
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 280 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 hover:from-amber-600 hover:to-amber-500 min-w-[8px]"
                    style={{ height: `${Math.max(height, 2)}px` }}
                    title={`${day.date}: ₹${day.revenue.toLocaleString()} (${day.orders} orders)`}
                  ></div>
                  {(selectedPeriod <= 14 || index % Math.ceil(selectedPeriod / 14) === 0) && (
                    <div className="mt-2 text-xs text-gray-600 text-center transform -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-medium">Best Day</span>
              <span className="text-green-600 font-bold">
                {revenueChart.reduce((best, day) => day.revenue > best.revenue ? day : best).date}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800 font-medium">Peak Revenue</span>
              <span className="text-blue-600 font-bold">
                ₹{Math.max(...revenueChart.map(d => d.revenue)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-purple-800 font-medium">Most Orders</span>
              <span className="text-purple-600 font-bold">
                {Math.max(...revenueChart.map(d => d.orders))} orders
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Orders</span>
              <span className="font-semibold text-orange-600">{stats.activeOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Occupied Tables</span>
              <span className="font-semibold text-red-600">{stats.occupiedTables}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Low Stock Items</span>
              <span className="font-semibold text-yellow-600">{stats.lowStockItems}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today's Orders</span>
              <span className="font-semibold text-blue-600">{stats.todayOrders}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
