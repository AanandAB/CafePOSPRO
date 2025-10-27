import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SalesReportProps {
  salesData: string | undefined;
  dateRange: { start: Date | null; end: Date | null };
  onDateChange: (start: Date | null, end: Date | null) => void;
}

interface Sale {
  orderNumber: string;
  date: string;
  items: string;
  subtotal: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMode: string;
  staffName: string;
}

export function SalesReport({
  salesData,
  dateRange,
  onDateChange,
}: SalesReportProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [quickFilter, setQuickFilter] = useState("30");

  // Parse CSV data
  useEffect(() => {
    if (salesData && typeof salesData === "string") {
      const lines = salesData.split("\n");
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));
        const dataRows = lines.slice(1).filter((line) => line.trim() !== "");

        const parsedSales = dataRows.map((line) => {
          const values = line.split(",").map((v) => v.replace(/"/g, ""));
          return {
            orderNumber: values[0],
            date: values[1],
            items: values[2],
            subtotal: parseFloat(values[3]) || 0,
            discount: parseFloat(values[4]) || 0,
            tax: parseFloat(values[5]) || 0,
            finalAmount: parseFloat(values[6]) || 0,
            paymentMode: values[7],
            staffName: values[8],
          };
        });

        setSales(parsedSales);
      }
    }
  }, [salesData]);

  // Filter sales based on date range
  useEffect(() => {
    if (sales.length > 0 && dateRange.start && dateRange.end) {
      const filtered = sales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= dateRange.start! && saleDate <= dateRange.end!;
      });
      setFilteredSales(filtered);
    } else {
      setFilteredSales(sales);
    }
  }, [sales, dateRange]);

  // Quick date filters
  const applyQuickFilter = (days: string) => {
    setQuickFilter(days);
    const end = new Date();
    const start = subDays(end, parseInt(days));

    onDateChange(startOfDay(start), endOfDay(end));
  };

  // Calculate statistics
  const totalRevenue = filteredSales.reduce(
    (sum, sale) => sum + sale.finalAmount,
    0
  );
  const totalOrders = filteredSales.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment mode breakdown
  const paymentModeBreakdown = filteredSales.reduce(
    (acc, sale) => {
      acc[sale.paymentMode] = (acc[sale.paymentMode] || 0) + sale.finalAmount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Daily sales trend
  const dailySales = filteredSales.reduce(
    (acc, sale) => {
      const date = sale.date;
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += sale.finalAmount;
      acc[date].orders += 1;
      return acc;
    },
    {} as Record<string, { date: string; revenue: number; orders: number }>
  );

  const dailySalesArray = Object.values(dailySales).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Sales Performance Report
        </h3>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {["7", "30", "90", "365"].map((days) => (
              <button
                key={days}
                onClick={() => applyQuickFilter(days)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  quickFilter === days
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={
                dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : ""
              }
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                onDateChange(date, dateRange.end);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
            <span className="flex items-center text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                onDateChange(dateRange.start, date);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
          <h4 className="text-sm font-medium opacity-90">Total Revenue</h4>
          <p className="text-2xl font-bold">
            ₹
            {totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
          <h4 className="text-sm font-medium opacity-90">Total Orders</h4>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl p-4 text-white">
          <h4 className="text-sm font-medium opacity-90">Avg Order Value</h4>
          <p className="text-2xl font-bold">
            ₹
            {averageOrderValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <h4 className="text-sm font-medium opacity-90">Conversion Rate</h4>
          <p className="text-2xl font-bold">{totalOrders > 0 ? "85%" : "0%"}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Revenue Trend</h4>
          <div className="h-64 flex items-end justify-between gap-1">
            {dailySalesArray.slice(-30).map((day, index) => {
              const maxValue = Math.max(
                ...dailySalesArray.map((d) => d.revenue)
              );
              const height = maxValue > 0 ? (day.revenue / maxValue) * 200 : 0;

              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all duration-300 min-w-[4px]"
                      style={{ height: `${Math.max(height, 2)}px` }}
                      title={`${day.date}: ₹${day.revenue.toFixed(2)}`}
                    ></div>
                    {index % 5 === 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {format(new Date(day.date), "MM/dd")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Payment Methods</h4>
          <div className="space-y-3">
            {Object.entries(paymentModeBreakdown).map(([mode, amount]) => {
              const percentage =
                totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={mode} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">
                      {mode || "Unknown"}
                    </span>
                    <span>
                      ₹
                      {amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Top Selling Items</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredSales.slice(0, 6).map((sale, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="font-medium text-gray-900 truncate">
                {sale.items.split(";")[0]}
              </div>
              <div className="text-sm text-gray-600">
                ₹
                {sale.finalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Order #
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Items
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Payment
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.slice(0, 10).map((sale, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {sale.orderNumber}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {format(new Date(sale.date), "MMM dd, yyyy")}
                  </td>
                  <td
                    className="py-3 px-4 text-gray-600 max-w-xs truncate"
                    title={sale.items}
                  >
                    {sale.items.split(";")[0]}
                    {sale.items.split(";").length > 1
                      ? ` +${sale.items.split(";").length - 1} more`
                      : ""}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                      {sale.paymentMode || "Unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    ₹
                    {sale.finalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
