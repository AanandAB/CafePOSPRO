import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [revenueType, setRevenueType] = useState("revenue");
  const stats = useQuery(api.analytics.getDashboardStats);
  const revenueChart = useQuery(api.analytics.getRevenueChart, {
    days: selectedPeriod,
  });

  // Get ledger data for expenses
  const ledgerData = useQuery(api.dataExport.exportLedgerData, {
    startDate: undefined,
    endDate: undefined,
  });

  // Get inventory data for cost calculations
  const inventoryData = useQuery(api.dataExport.exportInventoryData, {});

  // State for ML predictions
  const [predictions, setPredictions] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);

  // Calculate profit/loss
  const calculateProfitLoss = () => {
    if (!revenueChart || !ledgerData)
      return { revenue: 0, expenses: 0, profit: 0, margin: 0 };

    // Calculate total revenue
    const totalRevenue = revenueChart.reduce(
      (sum, day) => sum + day.revenue,
      0
    );

    // Parse ledger data to calculate expenses
    let totalExpenses = 0;
    if (typeof ledgerData === "string" && ledgerData.includes(",")) {
      const lines = ledgerData.split("\n");
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        if (columns.length > 1) {
          const type = columns[0].replace(/"/g, "");
          const amount = parseFloat(columns[1].replace(/"/g, ""));
          if (type === "expense" && !isNaN(amount)) {
            totalExpenses += amount;
          }
        }
      }
    }

    const profit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit,
      margin,
    };
  };

  // Simple ML-like prediction algorithm
  const generatePredictions = () => {
    if (!revenueChart || revenueChart.length < 7) return null;

    // Calculate moving average
    const movingAvg = [];
    const windowSize = 7;

    for (let i = windowSize - 1; i < revenueChart.length; i++) {
      const sum = revenueChart
        .slice(i - windowSize + 1, i + 1)
        .reduce((acc, day) => acc + day.revenue, 0);
      movingAvg.push(sum / windowSize);
    }

    // Calculate trend
    const firstHalf = movingAvg.slice(0, Math.floor(movingAvg.length / 2));
    const secondHalf = movingAvg.slice(Math.floor(movingAvg.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const trend =
      secondAvg > firstAvg
        ? "increasing"
        : secondAvg < firstAvg
          ? "decreasing"
          : "stable";
    const trendPercent =
      firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    // Predict next 7 days
    const lastValue = movingAvg[movingAvg.length - 1];
    const predictions = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const predictionDate = new Date(today);
      predictionDate.setDate(predictionDate.getDate() + i);

      let predictedValue;
      switch (trend) {
        case "increasing":
          predictedValue = lastValue * (1 + (trendPercent / 100) * 0.1);
          break;
        case "decreasing":
          predictedValue = lastValue * (1 + (trendPercent / 100) * 0.1);
          break;
        default:
          predictedValue = lastValue;
      }

      predictions.push({
        date: predictionDate.toISOString().split("T")[0],
        revenue: Math.max(0, predictedValue),
        trend,
      });
    }

    return {
      trend,
      trendPercent,
      predictions,
      confidence: Math.min(95, Math.max(70, 85 - Math.abs(trendPercent) * 0.5)),
    };
  };

  // Calculate trend analysis
  const calculateTrendAnalysis = () => {
    if (!revenueChart || revenueChart.length === 0) return null;

    // Find peak and low days
    const sortedByRevenue = [...revenueChart].sort(
      (a, b) => b.revenue - a.revenue
    );
    const peakDay = sortedByRevenue[0];
    const lowDay = sortedByRevenue[sortedByRevenue.length - 1];

    // Calculate day of week patterns
    const dayOfWeekRevenue: Record<string, number[]> = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    revenueChart.forEach((day) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      if (dayOfWeekRevenue[dayName]) {
        dayOfWeekRevenue[dayName].push(day.revenue);
      }
    });

    const dayOfWeekAverages: Record<string, number> = {};
    Object.keys(dayOfWeekRevenue).forEach((day) => {
      const revenues = dayOfWeekRevenue[day];
      dayOfWeekAverages[day] =
        revenues.length > 0
          ? revenues.reduce((sum, val) => sum + val, 0) / revenues.length
          : 0;
    });

    // Find best and worst performing days
    const bestDayOfWeek = Object.keys(dayOfWeekAverages).reduce((a, b) =>
      dayOfWeekAverages[a] > dayOfWeekAverages[b] ? a : b
    );
    const worstDayOfWeek = Object.keys(dayOfWeekAverages).reduce((a, b) =>
      dayOfWeekAverages[a] < dayOfWeekAverages[b] ? a : b
    );

    return {
      peakDay,
      lowDay,
      bestDayOfWeek,
      worstDayOfWeek,
      dayOfWeekAverages,
    };
  };

  // Generate predictions and trends when data loads
  useEffect(() => {
    if (revenueChart) {
      setPredictions(generatePredictions());
      setTrendData(calculateTrendAnalysis());
    }
  }, [revenueChart]);

  const profitLoss = calculateProfitLoss();
  const totalRevenue = revenueChart
    ? revenueChart.reduce((sum, day) => sum + day.revenue, 0)
    : 0;
  const totalOrders = revenueChart
    ? revenueChart.reduce((sum, day) => sum + day.orders, 0)
    : 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate growth and insights
  const midPoint = Math.floor((revenueChart?.length || 0) / 2);
  const firstHalf = revenueChart?.slice(0, midPoint) || [];
  const secondHalf = revenueChart?.slice(midPoint) || [];
  const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0);
  const secondHalfRevenue = secondHalf.reduce(
    (sum, day) => sum + day.revenue,
    0
  );
  const growthRate =
    firstHalfRevenue > 0
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100
      : 0;

  if (!stats || !revenueChart) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Analytics & Reports
        </h2>

        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Profit & Loss Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{profitLoss.revenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-600">
                ₹{profitLoss.expenses.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p
                className={`text-2xl font-bold ${profitLoss.profit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                ₹{profitLoss.profit.toLocaleString()}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${profitLoss.profit >= 0 ? "bg-green-100" : "bg-red-100"}`}
            >
              <span
                className={`text-xl ${profitLoss.profit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profitLoss.profit >= 0 ? "📈" : "📉"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p
                className={`text-2xl font-bold ${profitLoss.margin >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profitLoss.margin.toFixed(1)}%
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${profitLoss.margin >= 20 ? "bg-green-100" : profitLoss.margin >= 10 ? "bg-yellow-100" : "bg-red-100"}`}
            >
              <span
                className={`text-xl ${profitLoss.margin >= 20 ? "text-green-600" : profitLoss.margin >= 10 ? "text-yellow-600" : "text-red-600"}`}
              >
                {profitLoss.margin >= 20
                  ? "🏆"
                  : profitLoss.margin >= 10
                    ? "👍"
                    : "⚠️"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {selectedPeriod}-Day Revenue
              </p>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center mt-1">
                <span
                  className={`text-xs font-medium ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {growthRate >= 0 ? "↗" : "↘"}{" "}
                  {Math.abs(growthRate).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  vs previous period
                </span>
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
              <p className="text-sm font-medium text-gray-600">
                Avg Order Value
              </p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{averageOrderValue.toFixed(0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Today's Revenue
              </p>
              <p className="text-2xl font-bold text-orange-600">
                ₹{stats.todayRevenue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* ML Predictions */}
      {predictions && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 AI Predictions & Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Revenue Trend</h4>
              <p className="text-2xl font-bold text-blue-700">
                {predictions.trend === "increasing"
                  ? "↗"
                  : predictions.trend === "decreasing"
                    ? "↘"
                    : "→"}{" "}
                {predictions.trendPercent.toFixed(1)}%
              </p>
              <p className="text-sm text-blue-600">
                Based on {selectedPeriod}-day data
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">
                Prediction Confidence
              </h4>
              <p className="text-2xl font-bold text-purple-700">
                {predictions.confidence.toFixed(0)}%
              </p>
              <p className="text-sm text-purple-600">
                Algorithm confidence level
              </p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">
                Next 7 Days Forecast
              </h4>
              <p className="text-2xl font-bold text-amber-700">
                ₹
                {predictions.predictions
                  .reduce((sum: number, p: any) => sum + p.revenue, 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-amber-600">Projected revenue</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Forecast Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {predictions.predictions.map((pred: any, index: number) => (
                <div key={index} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">
                    {new Date(pred.date).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </p>
                  <p className="font-medium">
                    ₹
                    {pred.revenue.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedPeriod}-Day Revenue Trend
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setRevenueType("revenue")}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                revenueType === "revenue"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setRevenueType("orders")}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                revenueType === "orders"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Orders
            </button>
          </div>
        </div>
        <div className="h-80 flex items-end justify-between gap-1">
          {revenueChart.map((day, index) => {
            const maxValue =
              revenueType === "revenue"
                ? Math.max(...revenueChart.map((d) => d.revenue))
                : Math.max(...revenueChart.map((d) => d.orders));

            const value = revenueType === "revenue" ? day.revenue : day.orders;
            const height = maxValue > 0 ? (value / maxValue) * 280 : 0;

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 hover:from-amber-600 hover:to-amber-500 min-w-[8px]"
                    style={{ height: `${Math.max(height, 2)}px` }}
                    title={`${day.date}: ${revenueType === "revenue" ? `₹${day.revenue.toLocaleString()}` : `${day.orders} orders`}`}
                  ></div>
                  {(selectedPeriod <= 14 ||
                    index % Math.ceil(selectedPeriod / 14) === 0) && (
                    <div className="mt-2 text-xs text-gray-600 text-center transform -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend Analysis */}
      {trendData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📅 Trend Analysis
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-green-800 font-medium">
                  Best Performance Day
                </span>
                <span className="text-green-600 font-bold">
                  {new Date(trendData.peakDay.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-800 font-medium">
                  Lowest Performance Day
                </span>
                <span className="text-red-600 font-bold">
                  {new Date(trendData.lowDay.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-800 font-medium">
                  Best Day of Week
                </span>
                <span className="text-blue-600 font-bold">
                  {trendData.bestDayOfWeek}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-purple-800 font-medium">
                  Worst Day of Week
                </span>
                <span className="text-purple-600 font-bold">
                  {trendData.worstDayOfWeek}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⏱️ Performance Insights
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Orders</span>
                <span className="font-semibold text-orange-600">
                  {stats.activeOrders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Occupied Tables</span>
                <span className="font-semibold text-red-600">
                  {stats.occupiedTables}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Low Stock Items</span>
                <span className="font-semibold text-yellow-600">
                  {stats.lowStockItems}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today's Orders</span>
                <span className="font-semibold text-blue-600">
                  {stats.todayOrders}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Performing Items */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏆 Top Performing Items
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.lowStockItemsList &&
            stats.lowStockItemsList
              .slice(0, 5)
              .map((item: any, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 text-center"
                >
                  <div className="font-medium text-gray-900">
                    {item.itemName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} in stock
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    Low stock alert
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
