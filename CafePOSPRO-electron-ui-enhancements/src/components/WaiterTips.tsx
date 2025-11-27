import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface Tip {
  _id: string;
  orderId: string;
  amount: number;
  assignedTo: string;
  status: "pending" | "paid";
  date: number;
  paymentDate?: number;
}

export function WaiterTips({ staffId }: { staffId: string }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  
  const tips = useQuery(api.tips.getTipsForWaiter, { 
    staffId: staffId,
    status: statusFilter === "all" ? undefined : statusFilter
  });
  
  const totalPending = useQuery(api.tips.getTotalPendingTipsForWaiter, { staffId: staffId });
  const totalPaid = useQuery(api.tips.getTotalPaidTipsForWaiter, { staffId: staffId });
  
  // Add effect to refetch data when filter changes
  useEffect(() => {
    // This will trigger a refetch when statusFilter changes
  }, [statusFilter, staffId]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Tips</h2>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-amber-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tips</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{((totalPending || 0) + (totalPaid || 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Tips</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(totalPending || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Tips</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(totalPaid || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4">
        <div className="flex items-center gap-4">
          <label className="block text-sm font-medium text-gray-700">
            Filter by Status:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 text-sm rounded-full ${
                statusFilter === "all"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 text-sm rounded-full ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1 text-sm rounded-full ${
                statusFilter === "paid"
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Paid
            </button>
          </div>
        </div>
      </div>
      
      {/* Tips List */}
      {tips && tips.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tips.map((tip) => (
                  <tr key={tip._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tip.orderId.slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tip.date)} {formatTime(tip.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{tip.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tip.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {tip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tip.paymentDate 
                        ? `${formatDate(tip.paymentDate)} ${formatTime(tip.paymentDate)}`
                        : "Not paid yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tips found</h3>
          <p className="text-gray-500">
            {tips && tips.length === 0
              ? "You don't have any tips yet."
              : "Tips will appear here when customers add them to their orders."}
          </p>
        </div>
      )}
    </div>
  );
}