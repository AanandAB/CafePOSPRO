import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import * as QRCode from "qrcode.react";
import { getAppBaseURL, getAllAccessibleURLs } from "../utils/network";

export function StaffManagement() {
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("waiter");
  const [pin, setPin] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<Id<"staff"> | null>(
    null
  );
  const [isGeneratingPIN, setIsGeneratingPIN] = useState(false);

  // Get network interfaces for staff access link
  const [networkInterfaces, setNetworkInterfaces] = useState<string[]>([]);
  const [selectedIP, setSelectedIP] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const staff = useQuery(api.staff.getAllStaff);
  const addStaff = useMutation(api.staff.addStaff);
  const updateStaff = useMutation(api.staff.updateStaff);
  const updateStaffPin = useMutation(api.staff.updateStaffPin);

  useEffect(() => {
    // Get network interfaces when component mounts
    const getNetworkInterfaces = async () => {
      setIsLoading(true);
      try {
        // Get all accessible URLs (works in both dev and prod)
        const urls = await getAllAccessibleURLs();
        
        setNetworkInterfaces(urls);
        // Select the first URL as default (should be the current IP)
        setSelectedIP(urls[0]);
        setIsLoading(false);
      } catch (error) {
        console.error("Error getting network interfaces:", error);
        // Fallback to localhost
        const port = window.location.port || "5173";
        const defaultIPs = [`http://localhost:${port}`];
        
        setNetworkInterfaces(defaultIPs);
        setSelectedIP(defaultIPs[0]);
        setIsLoading(false);
      }
    };

    // Run the detection when component mounts
    void getNetworkInterfaces();
    
    // Refresh IP detection every 10 seconds to catch network changes quickly
    const interval = setInterval(() => {
      // Only refresh in development
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        void getNetworkInterfaces();
      }
    }, 10000); // Check every 10 seconds instead of 30
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    // Wrap the async function to avoid linter error
    void (async () => {
      try {
        await addStaff({
          name,
          email,
          role: role as any,
          pin: pin || undefined,
          monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
        });
        toast.success("Staff member added successfully");
        // Reset form
        setName("");
        setEmail("");
        setRole("waiter");
        setPin("");
        setMonthlySalary("");
        setIsAddingStaff(false);
      } catch (error: any) {
        toast.error(`Failed to add staff: ${error.message}`);
      }
    })();
  };

  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
    // Wrap the async function to avoid linter error
    void (async () => {
      try {
        await updateStaff({
          staffId: editingStaffId,
          name: name || undefined,
          email: email || undefined,
          role: (role as any) || undefined,
          monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
        });
        toast.success("Staff member updated successfully");
        // Reset form
        setName("");
        setEmail("");
        setRole("waiter");
        setMonthlySalary("");
        setEditingStaffId(null);
      } catch (error: any) {
        toast.error(`Failed to update staff: ${error.message}`);
      }
    })();
  };

  const handleGeneratePIN = () => {
    setIsGeneratingPIN(true);
    // Generate a random 4-digit PIN
    const newPIN = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(newPIN);
    setTimeout(() => setIsGeneratingPIN(false), 300);
  };

  const handleEdit = (staffMember: any) => {
    setName(staffMember.name);
    setEmail(staffMember.email);
    setRole(staffMember.role);
    setMonthlySalary(staffMember.monthlySalary || "");
    setEditingStaffId(staffMember._id);
  };

  const handleUpdatePIN = async (staffId: Id<"staff">, newPIN: string) => {
    try {
      await updateStaffPin({ staffId, pin: newPIN });
      toast.success("Staff PIN updated successfully");
    } catch (error: any) {
      toast.error(`Failed to update PIN: ${error.message}`);
    }
  };

  const handleGenerateNewPIN = (staffId: Id<"staff">) => {
    // Wrap the async function to avoid linter error
    void (async () => {
      const newPIN = Math.floor(1000 + Math.random() * 9000).toString();
      await handleUpdatePIN(staffId, newPIN);
    })();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <button
          onClick={() => setIsAddingStaff(true)}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          Add Staff Member
        </button>
      </div>

      {/* Staff Access Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Staff Access Information
        </h3>
        <p className="text-blue-700 mb-4">
          Staff members can access the system using the following link:
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-blue-700">
              Loading network addresses...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {networkInterfaces.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(url)
                        .then(() => {
                          toast.success("Link copied to clipboard");
                        })
                        .catch(() => {
                          toast.error("Failed to copy link");
                        });
                    }}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>

            {/* QR Code Section */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="text-md font-semibold text-blue-900 mb-3">
                Scan QR Code for Staff Access
              </h4>
              <div className="flex flex-col items-center">
                {selectedIP && (
                  <>
                    <QRCode.QRCodeSVG 
                      value={selectedIP} 
                      size={200} 
                      level={"H"} 
                      includeMargin={true} 
                      className="mb-3 bg-white p-4 rounded-lg"
                    />
                    <p className="text-sm text-blue-700 text-center">
                      Staff can scan this QR code to access the login page
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Member Form */}
      {isAddingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Staff Member
              </h3>
              <button
                onClick={() => setIsAddingStaff(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void handleAddStaff(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                >
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePIN}
                    disabled={isGeneratingPIN}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    {isGeneratingPIN ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Salary (Optional)
                </label>
                <input
                  type="number"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Add Staff Member
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingStaff(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Member Form */}
      {editingStaffId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Staff Member
              </h3>
              <button
                onClick={() => setEditingStaffId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); void handleUpdateStaff(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                >
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Salary (Optional)
                </label>
                <input
                  type="number"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Update Staff Member
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStaffId(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Staff Member
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contact
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Salary
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff?.map((staffMember) => (
                <tr key={staffMember._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-amber-800 font-medium">
                          {staffMember.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {staffMember.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        staffMember.role === "manager"
                          ? "bg-purple-100 text-purple-800"
                          : staffMember.role === "cashier"
                          ? "bg-green-100 text-green-800"
                          : staffMember.role === "waiter"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {staffMember.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staffMember.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staffMember.monthlySalary
                      ? `₹${staffMember.monthlySalary}`
                      : "Not set"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-amber-600 hover:text-amber-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void handleGenerateNewPIN(staffMember._id as Id<"staff">);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Reset PIN
                      </button>
                    </div>
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