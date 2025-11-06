import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface Tip {
  _id: Id<"tips">;
  orderId: Id<"orders">;
  amount: number;
  assignedTo: Id<"staff">;
  status: "pending" | "paid";
  date: number;
  paymentDate?: number;
}

interface StaffMember {
  _id: Id<"staff">;
  name: string;
  role: string;
}

export function TipManagement() {
  const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff"> | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  
  const allTips = useQuery(api.tips.getAllTips, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const staff = useQuery(api.staff.getAllStaff);
  const markTipAsPaid = useMutation(api.tips.markTipAsPaid);
  
  // Filter tips based on selected staff and status
  const filteredTips = allTips?.filter(tip => {
    if (selectedStaffId !== "all" && tip.assignedTo !== selectedStaffId) {
      return false;
    }
    if (statusFilter !== "all" && tip.status !== statusFilter) {
      return false;
    }
    return true;
  }) || [];
  
  // Group tips by staff member
  const tipsByStaff = filteredTips.reduce((acc, tip) => {
    const staffId = tip.assignedTo;
    if (!acc[staffId]) {
      acc[staffId] = [];
    }
    acc[staffId].push(tip);
    return acc;
  }, {} as Record<string, Tip[]>);
  
  // Calculate total tips per staff member
  const totalTipsByStaff = Object.entries(tipsByStaff).reduce((acc, [staffId, tips]) => {
    const pendingTotal = tips
      .filter(tip => tip.status === "pending")
      .reduce((sum, tip) => sum + tip.amount, 0);
      
    const paidTotal = tips
      .filter(tip => tip.status === "paid")
      .reduce((sum, tip) => sum + tip.amount, 0);
      
    acc[staffId] = {
      pending: pendingTotal,
      paid: paidTotal,
      total: pendingTotal + paidTotal
    };
    return acc;
  }, {} as Record<string, { pending: number; paid: number; total: number }>);
  
  const handleMarkAsPaid = async (tipId: Id<"tips">) => {
    try {
      await markTipAsPaid({ tipId });
      toast.success("Tip marked as paid!");
    } catch (error) {
      toast.error("Failed to mark tip as paid. Please try again.");
      console.error("Error marking tip as paid:", error);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Get staff member name by ID
  const getStaffName = (staffId: Id<"staff">) => {
    const staffMember = staff?.find(s => s._id === staffId);
    return staffMember ? staffMember.name : "Unknown Staff";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tip Management</h2>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Staff
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value as Id<"staff"> | "all")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Staff</option>
              {staff
                ?.filter(s => s.role === "waiter")
                .map(staffMember => (
                  <option key={staffMember._id} value={staffMember._id}>
                    {staffMember.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "paid")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
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
                ₹{filteredTips.reduce((sum, tip) => sum + tip.amount, 0).toFixed(2)}
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
                ₹{filteredTips
                  .filter(tip => tip.status === "pending")
                  .reduce((sum, tip) => sum + tip.amount, 0)
                  .toFixed(2)}
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
                ₹{filteredTips
                  .filter(tip => tip.status === "paid")
                  .reduce((sum, tip) => sum + tip.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tips by Staff Member */}
      {Object.entries(tipsByStaff).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(tipsByStaff).map(([staffId, tips]) => (
            <div key={staffId} className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {getStaffName(staffId as Id<"staff">)}
                </h3>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="font-bold text-amber-600">
                      ₹{totalTipsByStaff[staffId]?.pending.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Paid</p>
                    <p className="font-bold text-green-600">
                      ₹{totalTipsByStaff[staffId]?.paid.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-bold text-gray-900">
                      ₹{totalTipsByStaff[staffId]?.total.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
              
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
                        Actions
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {tip.status === "pending" ? (
                            <button
                              onClick={() => {
                                void handleMarkAsPaid(tip._id);
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark as Paid
                            </button>
                          ) : (
                            <span className="text-gray-500">
                              Paid on {tip.paymentDate ? formatDate(tip.paymentDate) : "N/A"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tips found</h3>
          <p className="text-gray-500">
            {filteredTips.length === 0
              ? "There are no tips matching your current filters."
              : "Tips will appear here when customers add them to their orders."}
          </p>
        </div>
      )}
    </div>
  );
}