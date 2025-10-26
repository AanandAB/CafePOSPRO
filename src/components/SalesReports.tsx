import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function SalesReports() {
  console.log("=== SalesReports Component Render ===");

  // Simple query to get all sales data
  const salesData = useQuery(api.sales.getAllSales);

  console.log("Sales data:", salesData);

  // Show loading state
  if (salesData === undefined) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <div className="ml-4 text-gray-600">Loading sales data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (salesData === null) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Error Loading Data
          </h2>
          <p className="text-gray-600">
            There was an error loading the sales data.
          </p>
        </div>
      </div>
    );
  }

  // Calculate basic statistics
  const totalRevenue = salesData.reduce(
    (sum: number, sale: any) => sum + sale.finalAmount,
    0
  );
  const totalOrders = salesData.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="text-green-600 font-bold">
          Data Loaded Successfully!
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalRevenue.toLocaleString()}
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
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Sales
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Order #
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Table
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
              {salesData.slice(0, 10).map((sale: any) => (
                <tr
                  key={sale._id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {sale.orderNumber}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(sale.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {sale.tableNumber || "Takeaway"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                      {sale.paymentMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    ₹{sale.finalAmount.toLocaleString()}
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
