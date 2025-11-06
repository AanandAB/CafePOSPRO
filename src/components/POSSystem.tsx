import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { useStaffAuth } from "../contexts/StaffAuthContext";

export function POSSystem() {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isBillingVisible, setIsBillingVisible] = useState(false); // Start hidden on mobile

  const inventory = useQuery(api.inventory.getAllInventory);
  const categories = useQuery(api.inventory.getAllCategories);
  const tables = useQuery(api.tables.getAvailableTables);
  const createOrder = useMutation(api.orders.createOrder);
  const staffDetails = useQuery(api.auth.getStaffDetails);
  const { staff: staffAuth } = useStaffAuth();

  // Get the actual staff details (either from Convex Auth for managers or custom auth for staff)
  const actualStaffDetails = staffDetails || staffAuth;

  const [selectedCategory, setSelectedCategory] = useState("all");

  // Check if user has permission to create orders
  const canCreateOrders = actualStaffDetails
    ? ["manager", "waiter", "cashier"].includes(actualStaffDetails.role)
    : true; // Default to true for managers

  // Auto-show billing section when items are added (only on mobile)
  useEffect(() => {
    if (selectedItems.length > 0 && window.innerWidth < 1024) {
      setIsBillingVisible(true);
    }
  }, [selectedItems.length]);

  const filteredInventory =
    inventory?.filter(
      (item) => selectedCategory === "all" || item.category === selectedCategory
    ) || [];

  const addToCart = (item: any) => {
    // Check if user has permission to add items
    if (!canCreateOrders) {
      toast.error("You don't have permission to add items to orders");
      return;
    }

    // Check stock availability
    const existingItem = selectedItems.find(
      (selected) => selected._id === item._id
    );
    const currentQuantity = existingItem ? existingItem.quantity : 0;

    if (currentQuantity + 1 > item.quantity) {
      toast.error(`Only ${item.quantity} ${item.itemName} available in stock`);
      return;
    }

    if (existingItem) {
      setSelectedItems(
        selectedItems.map((selected) =>
          selected._id === item._id
            ? {
                ...selected,
                quantity: selected.quantity + 1,
                total: (selected.quantity + 1) * selected.unitPrice,
              }
            : selected
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          ...item,
          inventoryId: item._id,
          quantity: 1,
          total: item.unitPrice,
        },
      ]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    // Check if user has permission to update quantities
    if (!canCreateOrders) {
      toast.error("You don't have permission to modify order items");
      return;
    }

    const item = inventory?.find((i) => i._id === itemId);
    if (item && newQuantity > item.quantity) {
      toast.error(`Only ${item.quantity} items available in stock`);
      return;
    }

    if (newQuantity <= 0) {
      setSelectedItems(selectedItems.filter((item) => item._id !== itemId));
    } else {
      setSelectedItems(
        selectedItems.map((item) =>
          item._id === itemId
            ? {
                ...item,
                quantity: newQuantity,
                total: newQuantity * item.unitPrice,
              }
            : item
        )
      );
    }
  };

  // Check if an item is already in the cart
  const isItemInCart = (itemId: string) => {
    return selectedItems.some((item) => item._id === itemId);
  };

  // Get quantity of item in cart
  const getItemQuantity = (itemId: string) => {
    const item = selectedItems.find((item) => item._id === itemId);
    return item ? item.quantity : 0;
  };

  // Load system settings
  const systemSettings = JSON.parse(localStorage.getItem("systemSettings") || "{}");
  
  const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
  const enableGST = systemSettings.enableGST !== false; // Default to true if not set
  const tax = enableGST ? subtotal * 0.18 : 0;
  const finalAmount = subtotal + tax - discount;

  const handleCreateOrder = async () => {
    // Check if user has permission to create orders
    if (!canCreateOrders) {
      toast.error("You don't have permission to create orders");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please add items to the order");
      return;
    }

    // Check stock for all items before creating order
    for (const selectedItem of selectedItems) {
      const inventoryItem = inventory?.find((i) => i._id === selectedItem._id);
      if (inventoryItem && selectedItem.quantity > inventoryItem.quantity) {
        toast.error(
          `Not enough ${selectedItem.itemName} in stock. Available: ${inventoryItem.quantity}`
        );
        return;
      }
    }

    try {
      const orderItems = selectedItems.map((item) => ({
        inventoryId: item.inventoryId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));

      // Get the staff ID based on the authentication type
      // Only pass waiterId if it's a valid staff member (not a manager)
      let waiterId: Id<"staff"> | undefined;
      if (actualStaffDetails && actualStaffDetails.role !== "manager") {
        // For staff from custom auth, use their ID
        waiterId =
          (actualStaffDetails as any)._id || (actualStaffDetails as any).id;
      }
      // For managers, we don't pass a waiterId since they're not staff members

      // Load system settings to pass GST setting
      const systemSettings = JSON.parse(localStorage.getItem("systemSettings") || "{}");
      const enableGST = systemSettings.enableGST !== false; // Default to true if not set

      await createOrder({
        tableId: selectedTable ? (selectedTable as any) : undefined,
        items: orderItems,
        waiterId: waiterId, // This will be undefined for managers
        notes: customerName ? `Customer: ${customerName}` : undefined,
        enableGST, // Pass GST setting to backend
      });

      // Reset form
      setSelectedItems([]);
      setSelectedTable("");
      setCustomerName("");
      setDiscount(0);
      setIsBillingVisible(false); // Hide billing after order creation

      toast.success("Order created successfully!");
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast.error(
        `Failed to create order: ${error.message || "Unknown error"}`
      );
    }
  };

  // If user doesn't have permission to access POS, show access denied message
  if (!canCreateOrders) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">POS System</h2>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-amber-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access the POS system. Only managers,
            waiters, and cashiers can create orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">POS System</h2>

      {/* Staff Info */}
      {actualStaffDetails && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {actualStaffDetails.name}
              </p>
              <p className="text-sm text-amber-700 capitalize">
                {actualStaffDetails.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Billing Toggle Button with Cart Icon */}
      <div className="lg:hidden fixed bottom-4 right-4 z-20">
        <button
          onClick={() => setIsBillingVisible(!isBillingVisible)}
          className="bg-amber-600 text-white p-3 rounded-full shadow-lg hover:bg-amber-700 transition-colors relative"
        >
          <span className="text-lg">🛒</span>
          {selectedItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                selectedCategory === "all"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
              }`}
            >
              All Items
            </button>
            {categories?.map((category) => (
              <button
                key={category._id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedCategory === category.name
                    ? "bg-amber-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Menu Grid - Optimized for faster loading and better UX */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredInventory.map((item) => (
              <div
                key={item._id}
                onClick={() => addToCart(item)}
                className={`bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all duration-150 ${
                  isItemInCart(item._id)
                    ? "border-2 border-amber-500 ring-1 ring-amber-200 bg-amber-50"
                    : "border-gray-200 hover:border-amber-300"
                }`}
              >
                <div className="text-center">
                  {/* Item Image - Optimized size */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.itemName}
                      className="w-12 h-12 object-cover rounded-full mx-auto mb-2"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg">🍽️</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                    {item.itemName}
                  </h3>
                  <p className="text-amber-600 font-bold text-sm">₹{item.unitPrice}</p>
                  <p
                    className={`text-xs mt-1 ${
                      item.quantity <= item.lowStockThreshold
                        ? "text-red-600 font-bold"
                        : "text-gray-500"
                    }`}
                  >
                    Stock: {item.quantity}{" "}
                    {item.quantity <= item.lowStockThreshold && "(Low)"}
                  </p>
                  {/* Show quantity if item is in cart */}
                  {isItemInCart(item._id) && (
                    <div className="mt-1 bg-amber-100 text-amber-800 text-xs font-bold py-0.5 px-1.5 rounded-full inline-block">
                      {getItemQuantity(item._id)} in cart
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary - Floating on mobile */}
        <div
          className={`lg:col-span-1 ${isBillingVisible ? "block" : "hidden"} lg:block`}
        >
          <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 h-fit lg:sticky lg:top-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Summary
              </h3>
              <button
                onClick={() => setIsBillingVisible(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Customer Info - Compact form */}
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />

              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select Table (Optional)</option>
                {tables?.map((table) => (
                  <option key={table._id} value={table._id}>
                    Table {table.tableNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Items - Optimized scrolling and compact display */}
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <p className="text-gray-500 text-center py-3 text-sm">
                  No items selected
                </p>
              ) : (
                selectedItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {item.itemName}
                      </h4>
                      <p className="text-xs text-gray-600">
                        ₹{item.unitPrice} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mx-1">
                      <button
                        onClick={() =>
                          updateQuantity(item._id, item.quantity - 1)
                        }
                        className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item._id, item.quantity + 1)
                        }
                        className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <div className="ml-1 text-right">
                      <p className="font-semibold text-gray-900 text-sm">
                        ₹{item.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals - Compact and clear */}
            {selectedItems.length > 0 && (
              <div className="space-y-1.5 border-t pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (18%):</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount:</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-16 px-1.5 py-0.5 text-sm border border-gray-300 rounded text-right"
                    min="0"
                    max={subtotal}
                  />
                </div>
                <div className="flex justify-between font-bold border-t pt-1.5 text-base">
                  <span>Total:</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons - Clear and prominent */}
            <div className="space-y-2 mt-3">
              <button
                onClick={() => {
                  void handleCreateOrder();
                }}
                disabled={selectedItems.length === 0}
                className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Create Order
              </button>
              <button
                onClick={() => {
                  setSelectedItems([]);
                  setDiscount(0);
                }}
                className="w-full bg-gray-200 text-gray-700 py-1.5 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Billing Overlay - Simplified */}
      {selectedItems.length > 0 && !isBillingVisible && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10 flex items-end">
          <div className="bg-white w-full rounded-t-xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Order Summary
              </h3>
              <button
                onClick={() => setIsBillingVisible(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Order Items - Mobile optimized */}
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {selectedItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {item.itemName}
                    </h4>
                    <p className="text-xs text-gray-600">
                      ₹{item.unitPrice} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">
                      ₹{item.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals - Mobile optimized */}
            <div className="space-y-1 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (18%):</span>
                <span className="font-medium">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1.5 text-base">
                <span>Total:</span>
                <span>₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons - Mobile optimized */}
            <div className="space-y-2 mt-3">
              <button
                onClick={() => {
                  void handleCreateOrder();
                  setIsBillingVisible(true);
                }}
                className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
