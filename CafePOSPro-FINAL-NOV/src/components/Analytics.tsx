import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [revenueType, setRevenueType] = useState("revenue");
  const [activeTab, setActiveTab] = useState("overview");

  const stats = useQuery(api.analytics.getDashboardStats);
  const revenueChart = useQuery(api.analytics.getRevenueChart, {
    days: selectedPeriod,
  });

  // New queries for the additional features
  const laborCostAnalysis = useQuery(api.analytics.getLaborCostAnalysis, {
    days: selectedPeriod,
  });

  const customerInsights = useQuery(api.analytics.getCustomerInsights, {
    days: selectedPeriod,
  });

  const budgetPlanningData = useQuery(api.analytics.getBudgetPlanningData, {
    months: 12,
  });

  const tableTurnaroundAnalysis = useQuery(
    api.analytics.getTableTurnaroundAnalysis,
    {
      days: selectedPeriod,
    }
  );

  const preparationTimeAnalysis = useQuery(
    api.analytics.getPreparationTimeAnalysis,
    {
      days: selectedPeriod,
    }
  );

  const busyHourAnalysis = useQuery(api.analytics.getBusyHourAnalysis, {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Tabs for different analytics sections - reordered for better flow
  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "customers", label: "Customer Insights", icon: "👥" },
    { id: "busy", label: "Busy Hours", icon: "⏰" },
    { id: "tables", label: "Table Analysis", icon: "🪑" },
    { id: "prep", label: "Prep Times", icon: "⏱️" },
    { id: "labor", label: "Labor Costs", icon: "👷" },
    { id: "budget", label: "Budget Planning", icon: "💰" },
  ];

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto py-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-base transition-all duration-300 flex-shrink-0 ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-600 bg-amber-50 rounded-t-lg"
                  : "border-transparent text-gray-500 hover:text-amber-600 hover:border-gray-300 hover:bg-gray-50 rounded-t-lg"
              }`}
            >
              <span className="mr-2 text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => setActiveTab("budget")}
            >
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-gray-600">Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(profitLoss.revenue)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => setActiveTab("budget")}
            >
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-gray-600">Profit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(profitLoss.profit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-gray-600">Orders</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats?.todayOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => setActiveTab("budget")}
            >
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <p className="text-xs font-medium text-gray-600">Margin</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPercentage(profitLoss.margin)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
              <h3 className="text-xl font-semibold text-gray-900">
                Revenue Trend
              </h3>
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                    selectedPeriod === 7
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedPeriod(7)}
                >
                  7D
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                    selectedPeriod === 30
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedPeriod(30)}
                >
                  30D
                </button>
                <button
                  className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                    selectedPeriod === 90
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedPeriod(90)}
                >
                  90D
                </button>
              </div>
            </div>
            <div className="h-72 overflow-y-auto">
              {revenueChart ? (
                <div className="space-y-3">
                  {revenueChart.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center group hover:bg-amber-50 p-2 rounded-lg transition-all duration-200"
                    >
                      <div className="w-28 text-sm text-gray-600 truncate">
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="flex items-center">
                          <div
                            className="h-5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 group-hover:h-6 group-hover:shadow-md"
                            style={{
                              width: `${
                                revenueChart &&
                                revenueChart.length > 0 &&
                                Math.max(
                                  ...revenueChart.map((d) => d.revenue)
                                ) > 0
                                  ? Math.min(
                                      100,
                                      (day.revenue /
                                        Math.max(
                                          ...revenueChart.map((d) => d.revenue)
                                        )) *
                                        100
                                    )
                                  : 0
                              }%`,
                            }}
                          ></div>
                          <span className="ml-3 text-base font-medium truncate">
                            {formatCurrency(day.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Labor Costs Tab */}
      {activeTab === "labor" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Labor Cost
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {laborCostAnalysis && laborCostAnalysis.totalLaborCost
                      ? formatCurrency(laborCostAnalysis.totalLaborCost)
                      : "₹0"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Labor Cost Ratio
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {laborCostAnalysis && laborCostAnalysis.laborCostRatio
                      ? formatPercentage(laborCostAnalysis.laborCostRatio)
                      : "0%"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Staff Tracked
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {laborCostAnalysis?.laborCosts?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Labor Cost Details */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              Staff Labor Costs & Productivity
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Orders/Hour
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Revenue/Hour
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {laborCostAnalysis?.productivityData &&
                  laborCostAnalysis.productivityData.length > 0 ? (
                    laborCostAnalysis.productivityData.map((staff: any) => (
                      <tr
                        key={staff.staffId}
                        className="hover:bg-amber-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.name || "Unknown"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            {staff.role || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {staff.totalHours
                            ? staff.totalHours.toFixed(1)
                            : "0.0"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {formatCurrency(staff.totalCost || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {staff.ordersPerHour
                            ? staff.ordersPerHour.toFixed(1)
                            : "0.0"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {formatCurrency(staff.revenuePerHour || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No labor cost data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Comparison Tab - REMOVED */}

      {/* Customer Insights Tab */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Popular Items */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Popular Items
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerInsights?.popularItems &&
                    customerInsights.popularItems.length > 0 ? (
                      customerInsights.popularItems
                        .slice(0, 10)
                        .map((item: any) => (
                          <tr
                            key={item.itemName}
                            className="hover:bg-amber-50 transition-colors duration-200"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.itemName || "Unknown Item"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {item.totalQuantity || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                              {formatCurrency(item.totalRevenue || 0)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-center text-gray-500"
                        >
                          No popular items data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Peak Hours */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Peak Dining Hours
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Hour
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerInsights?.peakHours &&
                    customerInsights.peakHours.length > 0 ? (
                      customerInsights.peakHours
                        .slice(0, 10)
                        .map((hour: any) => (
                          <tr
                            key={hour.hour}
                            className="hover:bg-amber-50 transition-colors duration-200"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {hour.hour}:00 - {hour.hour + 1}:00
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {hour.orderCount || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                              {formatCurrency(hour.revenue || 0)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-center text-gray-500"
                        >
                          No peak hours data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Planning Tab */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              Budget Planning & Historical Data
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {budgetPlanningData && budgetPlanningData.length > 0 ? (
                    budgetPlanningData.map((month: any) => (
                      <tr
                        key={`${month.year}-${month.month}`}
                        className="hover:bg-amber-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {month.monthName || "Unknown"} {month.year || ""}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {formatCurrency(month.revenue || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {formatCurrency(month.expenses || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`font-medium text-lg ${
                              (month.profit || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(month.profit || 0)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No budget data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Management Tab - REMOVED */}

      {/* Table Analysis Tab */}
      {activeTab === "tables" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <span className="text-2xl">🪑</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Completed Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tableTurnaroundAnalysis?.totalCompletedOrders || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Turnaround Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tableTurnaroundAnalysis
                      ? `${tableTurnaroundAnalysis.avgOverallTurnaround.toFixed(1)} mins`
                      : "0 mins"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              Table Turnaround Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Completed Orders
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Turnaround
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableTurnaroundAnalysis?.tableData &&
                  tableTurnaroundAnalysis.tableData.length > 0 ? (
                    tableTurnaroundAnalysis.tableData.map((table: any) => (
                      <tr
                        key={table.tableId}
                        className="hover:bg-amber-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          Table {table.tableNumber || "N/A"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {table.capacity || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {table.completedOrders || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {(table.avgTurnaroundTime || 0).toFixed(1)} mins
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No table data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Preparation Times Tab */}
      {activeTab === "prep" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-4 bg-amber-100 rounded-lg">
                  <span className="text-3xl">⏱️</span>
                </div>
                <div className="ml-5">
                  <p className="text-base font-medium text-gray-600">
                    Overall Avg. Prep Time
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {preparationTimeAnalysis
                      ? `${preparationTimeAnalysis.overallAvgPrepTime.toFixed(1)} mins`
                      : "0 mins"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-4 bg-blue-100 rounded-lg">
                  <span className="text-3xl">🍽️</span>
                </div>
                <div className="ml-5">
                  <p className="text-base font-medium text-gray-600">
                    Total Items Prepared
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {preparationTimeAnalysis?.totalItems || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-4 bg-green-100 rounded-lg">
                  <span className="text-3xl">📋</span>
                </div>
                <div className="ml-5">
                  <p className="text-base font-medium text-gray-600">
                    Items Tracked
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {preparationTimeAnalysis?.prepTimeData?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              Preparation Time Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Items Prepared
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Total Prep Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Prep Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preparationTimeAnalysis?.prepTimeData &&
                  preparationTimeAnalysis.prepTimeData.length > 0 ? (
                    preparationTimeAnalysis.prepTimeData.map((item: any) => (
                      <tr
                        key={item.itemName}
                        className="hover:bg-amber-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.itemName || "Unknown Item"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {item.itemCount || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {(item.totalPrepTime || 0).toFixed(1)} mins
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={
                              (item.avgPrepTime || 0) > 20
                                ? "text-red-600 font-bold text-lg"
                                : (item.avgPrepTime || 0) > 15
                                  ? "text-amber-600 font-medium text-lg"
                                  : "text-green-600 text-lg"
                            }
                          >
                            {(item.avgPrepTime || 0).toFixed(1)} mins
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No preparation time data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Busy Hours Tab */}
      {activeTab === "busy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Peak Hours
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Hour
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Order Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {busyHourAnalysis?.peakHours &&
                    busyHourAnalysis.peakHours.length > 0 ? (
                      busyHourAnalysis.peakHours.map((hour: any) => (
                        <tr
                          key={hour.hour}
                          className="hover:bg-amber-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {hour.hour}:00 - {hour.hour + 1}:00
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {hour.orderCount || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(hour.revenue || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(hour.avgOrderValue || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-4 text-center text-gray-500"
                        >
                          No peak hours data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slow Hours */}
            <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-5">
                Slow Hours
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Hour
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Order Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {busyHourAnalysis?.slowHours &&
                    busyHourAnalysis.slowHours.length > 0 ? (
                      busyHourAnalysis.slowHours.map((hour: any) => (
                        <tr
                          key={hour.hour}
                          className="hover:bg-amber-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {hour.hour}:00 - {hour.hour + 1}:00
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {hour.orderCount || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(hour.revenue || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(hour.avgOrderValue || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-4 text-center text-gray-500"
                        >
                          No slow hours data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Full Hourly Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 md:p-6 transition-all duration-300 hover:shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-5">
              Complete Hourly Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Hour
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Order Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {busyHourAnalysis?.hourlyData &&
                  busyHourAnalysis.hourlyData.length > 0 ? (
                    busyHourAnalysis.hourlyData.map((hour: any) => (
                      <tr
                        key={hour.hour}
                        className="hover:bg-amber-50 transition-colors duration-200"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {hour.hour}:00 - {hour.hour + 1}:00
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {hour.orderCount || 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(hour.revenue || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(hour.avgOrderValue || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No hourly data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
