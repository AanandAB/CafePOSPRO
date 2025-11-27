import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function TestSales() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test the sales report with a wide date range
  const salesReport = useQuery(api.sales.getSalesReport, {
    startDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
    endDate: Date.now() + 24 * 60 * 60 * 1000, // 1 day in the future
  });

  useEffect(() => {
    console.log("Sales report data:", salesReport);

    if (salesReport !== undefined) {
      setTestResult(salesReport);
      setLoading(false);
    }

    if (salesReport === null) {
      setError("Received null response from sales report");
      setLoading(false);
    }
  }, [salesReport]);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Test Sales Component</h2>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Loading sales data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Test Sales Component</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Test Sales Component</h2>
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        Sales data loaded successfully!
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Sales Report Summary</h3>
        {testResult && (
          <div className="space-y-2">
            <p>Total Revenue: ₹{testResult.totalRevenue?.toLocaleString()}</p>
            <p>Total Orders: {testResult.totalOrders}</p>
            <p>
              Average Order Value: ₹{testResult.averageOrderValue?.toFixed(2)}
            </p>
            <p>Number of Sales Records: {testResult.sales?.length}</p>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Raw Data</h3>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
          {JSON.stringify(testResult, null, 2)}
        </pre>
      </div>
    </div>
  );
}
