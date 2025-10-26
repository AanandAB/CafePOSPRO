import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

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
  const [loadingNetworkInterfaces, setLoadingNetworkInterfaces] =
    useState(true);

  const staff = useQuery(api.staff.getAllStaff);
  const addStaff = useMutation(api.staff.addStaff);
  const updateStaff = useMutation(api.staff.updateStaff);
  const updateStaffPin = useMutation(api.staff.updateStaffPin);

  useEffect(() => {
    // Get network interfaces when component mounts
    const getNetworkInterfaces = async () => {
      try {
        // Try to get network interfaces from Electron
        if (
          (window as any).electronAPI &&
          typeof (window as any).electronAPI.getNetworkInterfaces === "function"
        ) {
          const result = await (
            window as any
          ).electronAPI.getNetworkInterfaces();
          if (result.success) {
            setNetworkInterfaces(result.interfaces);
          } else {
            // Fallback to default interfaces
            setNetworkInterfaces([
              "http://[YOUR_COMPUTER_IP]:5177",
              "http://192.168.1.10:5177",
              "http://192.168.0.10:5177",
            ]);
          }
        } else {
          // Fallback to default interfaces when not in Electron
          setNetworkInterfaces([
            "http://[YOUR_COMPUTER_IP]:5177",
            "http://192.168.1.10:5177",
            "http://192.168.0.10:5177",
          ]);
        }
      } catch (error) {
        // Fallback to default interfaces on error
        setNetworkInterfaces([
          "http://[YOUR_COMPUTER_IP]:5177",
          "http://192.168.1.10:5177",
          "http://192.168.0.10:5177",
        ]);
      } finally {
        setLoadingNetworkInterfaces(false);
      }
    };

    void getNetworkInterfaces();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
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

  const handleGenerateNewPIN = async (staffId: Id<"staff">) => {
    const newPIN = Math.floor(1000 + Math.random() * 9000).toString();
    await handleUpdatePIN(staffId, newPIN);
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

        {loadingNetworkInterfaces ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-blue-700">
              Loading network addresses...
            </span>
          </div>
        ) : (
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
                    void navigator.clipboard
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
        )}

        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Staff should use one of the links
            above to access the system. If the first link doesn't work, try the
            others. On mobile devices, staff should select "Staff Login" and
            enter their email and PIN.
          </p>
        </div>
      </div>

      {/* Add/Edit Staff Form */}
      {(isAddingStaff || editingStaffId) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingStaffId ? "Edit Staff Member" : "Add New Staff Member"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingStaffId) {
                void handleUpdateStaff(e);
              } else {
                void handleAddStaff(e);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
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
                  Email Address *
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
                >
                  <option value="manager">Manager</option>
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Salary
                </label>
                <input
                  type="number"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="₹0.00"
                />
              </div>

              {!editingStaffId && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    4-Digit PIN
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Enter 4-digit PIN"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePIN}
                      disabled={isGeneratingPIN}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingPIN ? "Generating..." : "Generate"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Staff will use this PIN to log in to the system
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                {editingStaffId ? "Update Staff" : "Add Staff"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingStaff(false);
                  setEditingStaffId(null);
                  setName("");
                  setEmail("");
                  setRole("waiter");
                  setPin("");
                  setMonthlySalary("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
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
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Salary
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff?.map((staffMember) => (
                <tr key={staffMember._id}>
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
                        <div className="text-sm text-gray-500">
                          {staffMember.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        staffMember.role === "manager"
                          ? "bg-purple-100 text-purple-800"
                          : staffMember.role === "waiter"
                            ? "bg-blue-100 text-blue-800"
                            : staffMember.role === "kitchen"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {staffMember.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.isActive ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staffMember.monthlySalary ? (
                      <span>₹{staffMember.monthlySalary.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(staffMember)}
                        className="text-amber-600 hover:text-amber-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void handleGenerateNewPIN(staffMember._id);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        New PIN
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
