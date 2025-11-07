import { useState, useEffect } from "react";
import { format } from "date-fns";

interface PerformanceReportProps {
  salesData: string | undefined;
  staffData: string | undefined;
  ordersData: any[] | undefined;
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

interface StaffMember {
  name: string;
  email: string;
  role: string;
  activeStatus: string;
  monthlySalary: number;
  joinDate: string;
}

export function PerformanceReport({
  salesData,
  staffData,
  ordersData,
  dateRange,
  onDateChange,
}: PerformanceReportProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  // Parse sales CSV data
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

  // Parse staff CSV data
  useEffect(() => {
    if (staffData && typeof staffData === "string") {
      const lines = staffData.split("\n");
      if (lines.length > 1) {
        const headers = lines[0].split(",").map((h) => h.replace(/"/g, ""));
        const dataRows = lines.slice(1).filter((line) => line.trim() !== "");

        const parsedStaff = dataRows.map((line) => {
          const values = line.split(",").map((v) => v.replace(/"/g, ""));
          return {
            name: values[0],
            email: values[1],
            role: values[2],
            activeStatus: values[3],
            monthlySalary: parseFloat(values[4]) || 0,
            joinDate: values[5],
          };
        });

        setStaff(parsedStaff);
      }
    }
  }, [staffData]);

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

  // Calculate statistics
  const totalRevenue = filteredSales.reduce(
    (sum, sale) => sum + sale.finalAmount,
    0
  );
  const totalOrders = filteredSales.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Staff performance metrics
  const activeStaff = staff.filter(
    (member) => member.activeStatus === "Active"
  );
  const totalStaff = activeStaff.length;

  // Calculate revenue per staff member (simplified)
  const revenuePerStaff = totalStaff > 0 ? totalRevenue / totalStaff : 0;

  // Peak hours analysis (simplified)
  const peakHoursData = filteredSales.reduce(
    (acc, sale) => {
      const hour = new Date(sale.date).getHours();
      acc[hour] = (acc[hour] || 0) + sale.finalAmount;
      return acc;
    },
    {} as Record<number, number>
  );

  const peakHour =
    Object.entries(peakHoursData).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  // Role distribution
  const roleDistribution = activeStaff.reduce(
    (acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-gray-900 transition-colors duration-300 hover:text-amber-600">
          Performance Metrics & Analytics
        </h3>
        <div className="text-sm text-gray-600">
          Real-time business performance insights
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Total Revenue</h4>
          <p className="text-2xl font-bold">
            ₹
            {totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Total Orders</h4>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Avg Order Value</h4>
          <p className="text-2xl font-bold">
            ₹
            {averageOrderValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Active Staff</h4>
          <p className="text-2xl font-bold">{totalStaff}</p>
        </div>
      </div>

      {/* Business Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
          <h4 className="font-semibold text-gray-900 mb-4">
            Peak Business Hours
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-amber-50">
              <div className="font-medium text-gray-900">Busiest Hour</div>
              <div className="font-bold text-amber-600">
                {peakHour !== "N/A" ? `${peakHour}:00` : "N/A"}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-amber-50">
              <div className="font-medium text-gray-900">Revenue per Staff</div>
              <div className="font-bold text-green-600">
                ₹
                {revenuePerStaff.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-amber-50">
              <div className="font-medium text-gray-900">Orders per Day</div>
              <div className="font-bold text-blue-600">
                {filteredSales.length > 0
                  ? (filteredSales.length / 30).toFixed(1)
                  : "0"}
              </div>
            </div>
          </div>
        </div>

        {/* Staff Distribution */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
          <h4 className="font-semibold text-gray-900 mb-4">
            Staff Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-2 rounded transition-all duration-200 hover:bg-amber-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                  <span className="text-gray-700 capitalize">{role}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
          <h4 className="font-semibold text-gray-900 mb-4">
            Performance Indicators
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Customer Satisfaction</span>
                <span className="font-medium">4.7/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: "94%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Order Accuracy</span>
                <span className="font-medium">98.5%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: "98.5%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Service Speed</span>
                <span className="font-medium">12 min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: "85%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 transition-all duration-300 hover:shadow-md">
        <h4 className="font-semibold text-gray-900 mb-4">
          Staff Performance Overview
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Monthly Salary
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Join Date
                </th>
              </tr>
            </thead>
            <tbody>
              {activeStaff.map((member, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-amber-50 transition-colors duration-200"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {member.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium capitalize transition-colors duration-200">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium transition-colors duration-200">
                      {member.activeStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    ₹
                    {member.monthlySalary.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {format(new Date(member.joinDate), "MMM dd, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Active Orders</h4>
          <p className="text-2xl font-bold">
            {ordersData ? ordersData.length : 0}
          </p>
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Tables Occupied</h4>
          <p className="text-2xl font-bold">
            {ordersData
              ? ordersData.filter((order: any) => order.tableId).length
              : 0}
          </p>
        </div>

        <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-xl p-4 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
          <h4 className="text-sm font-medium opacity-90">Avg Wait Time</h4>
          <p className="text-2xl font-bold">8 min</p>
        </div>
      </div>
    </div>
  );
}
