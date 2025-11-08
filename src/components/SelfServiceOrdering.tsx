import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { FeedbackForm } from "./FeedbackForm";

interface MenuItem {
  _id: Id<"inventory">;
  itemName: string;
  category: string;
  unitPrice: number;
  image?: string;
  isActive: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
  total: number;
  cookingInstructions?: string;
}

interface Table {
  _id: Id<"tables">;
  tableNumber: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
}

interface OrderItem {
  inventoryId: Id<"inventory">;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  cookingInstructions?: string;
  status: "pending" | "preparing" | "ready" | "served";
}

interface Order {
  _id: Id<"orders">;
  _creationTime: number;
  orderNumber: string;
  tableId?: Id<"tables">;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    cookingInstructions?: string;
    status: "pending" | "preparing" | "ready" | "served";
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  finalAmount: number;
  status: "active" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid";
  paymentMode?: "cash" | "upi" | "card";
  waiterId?: Id<"staff">;
  cashierId?: Id<"staff">;
  notes?: string;
}

export function SelfServiceOrdering({ tableId }: { tableId: string }) {
  const [customerName, setCustomerName] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [previousOrderItems, setPreviousOrderItems] = useState<any>({});
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [showTipOptions, setShowTipOptions] = useState(false);
  const [acceptedNotification, setAcceptedNotification] = useState<any>(null);

  // Fetch inventory items
  const inventory = useQuery(api.inventory.getAllInventory);

  // Fetch table information
  const tables = useQuery(api.tables.getAllTables);

  // Fetch existing orders for this table
  const existingOrders = useQuery(api.orders.getOrdersByTable, {
    tableId: tableId as Id<"tables">,
  });

  // Fetch all staff members to show who accepted requests
  const allStaff = useQuery(api.staff.getAllStaff);

  // Fetch accepted notifications for this table
  const acceptedNotifications = useQuery(api.notifications.getAcceptedNotificationsForTable, {
    tableId: tableId as Id<"tables">,
  });

  // Fetch restaurant profile for VAT and currency settings
  const restaurantProfile = useQuery(api.restaurant.getRestaurantProfile);

  // Mutations
  const createOrder = useMutation(api.orders.createOrder);
  const updateTableStatus = useMutation(api.tables.updateTableStatus);
  const clearTableOrders = useMutation(api.orders.clearTableOrders);
  const notifyWaitersOfCustomerRequest = useMutation(api.notifications.notifyWaitersOfCustomerRequest);

  // Get unique categories
  const categories = [
    "All",
    ...(inventory
      ? Array.from(new Set(inventory.map((item: MenuItem) => item.category)))
      : []),
  ];

  // Filter items by category
  const filteredItems = inventory
    ? activeCategory === "All"
      ? inventory
      : inventory.filter((item: MenuItem) => item.category === activeCategory)
    : [];

  // Find table info
  useEffect(() => {
    if (tables && tableId) {
      const table = tables.find((t: Table) => t._id === tableId);
      setTableInfo(table || null);

      // Update table status to occupied
      if (table && table.status !== "occupied") {
        void updateTableStatus({
          tableId: table._id,
          status: "occupied",
        });
      }
    }
  }, [tables, tableId, updateTableStatus]);

  // Load existing orders for this table and check for status changes
  useEffect(() => {
    if (existingOrders && existingOrders.length > 0) {
      setTableOrders(existingOrders);

      // Filter orders that belong to the current customer
      const customerOrders = existingOrders.filter(
        (order) => order.notes && order.notes.includes(customerName)
      );

      // Check for status changes to show notifications for customer's own orders
      customerOrders.forEach((order: Order) => {
        order.items.forEach((item) => {
          const key = `${order._id}-${item.itemName}`;
          const previousStatus = previousOrderItems[key];

          if (previousStatus !== item.status) {
            if (item.status === "preparing") {
              toast.info(`${item.itemName} is now being prepared`);
            } else if (item.status === "ready") {
              toast.success(`${item.itemName} is ready!`);
            }

            setPreviousOrderItems((prev: any) => ({
              ...prev,
              [key]: item.status,
            }));
          }
        });
      });
    }
  }, [existingOrders, customerName, previousOrderItems]);

  // Set the most recent accepted notification
  useEffect(() => {
    if (acceptedNotifications && acceptedNotifications.length > 0) {
      // Get the most recent accepted notification
      const latestNotification = acceptedNotifications[0];
      setAcceptedNotification(latestNotification);
    } else {
      setAcceptedNotification(null);
    }
  }, [acceptedNotifications]);

  // Handle customer name submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim()) {
      setShowNameForm(false);
      toast.success(`Welcome, ${customerName}! You can now start ordering.`);
    } else {
      toast.error("Please enter your name");
    }
  };

  // Call waiter function
  const callWaiter = async () => {
    try {
      await notifyWaitersOfCustomerRequest({
        type: "waiter_call",
        tableId: tableId as Id<"tables">,
        tableNumber: tableInfo?.tableNumber || "Unknown",
        message: `Customer ${customerName} needs assistance`,
      });
      toast.success("Waiter has been notified! A waiter will be with you shortly.");
    } catch (error) {
      toast.error("Failed to notify waiter. Please try again.");
      console.error("Error calling waiter:", error);
    }
  };

  // Request water function
  const requestWater = async () => {
    try {
      await notifyWaitersOfCustomerRequest({
        type: "water_request",
        tableId: tableId as Id<"tables">,
        tableNumber: tableInfo?.tableNumber || "Unknown",
        message: `Customer ${customerName} requests water`,
      });
      toast.success("Water request has been sent! A waiter will bring water shortly.");
    } catch (error) {
      toast.error("Failed to send water request. Please try again.");
      console.error("Error requesting water:", error);
    }
  };

  // Get staff member name by ID
  const getStaffName = (staffId: Id<"staff">) => {
    const staffMember = allStaff?.find(s => s._id === staffId);
    return staffMember ? staffMember.name : "Unknown Staff";
  };

  // Add item to cart
  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (cartItem) => cartItem._id === item._id
      );
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem._id === item._id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
                total: (cartItem.quantity + 1) * cartItem.unitPrice,
              }
            : cartItem
        );
      } else {
        return [
          ...prevCart,
          {
            ...item,
            quantity: 1,
            total: item.unitPrice,
          },
        ];
      }
    });
    toast.success(`${item.itemName} added to cart`);
  };

  // Remove item from cart
  const removeFromCart = (itemId: Id<"inventory">) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((item) =>
          item._id === itemId
            ? {
                ...item,
                quantity: item.quantity - 1,
                total: (item.quantity - 1) * item.unitPrice,
              }
            : item
        );
      } else {
        return prevCart.filter((item) => item._id !== itemId);
      }
    });
  };

  // Update cooking instructions for an item in cart
  const updateCookingInstructions = (
    itemId: Id<"inventory">,
    instructions: string
  ) => {
    setCart((prevCart) => {
      return prevCart.map((item) =>
        item._id === itemId
          ? { ...item, cookingInstructions: instructions }
          : item
      );
    });
  };

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate tax based on restaurant profile VAT settings
  const enableVAT = restaurantProfile?.enableVAT !== false; // Default to true
  const vatRate = restaurantProfile?.vatRate || 5; // Default to 5% (UAE rate)
  const tax = enableVAT ? subtotal * (vatRate / 100) : 0;
  
  const finalAmount = subtotal + tax;

  // Submit order
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Please add items to your order");
      return;
    }

    try {
      const orderItems = cart.map((item) => ({
        inventoryId: item._id,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        cookingInstructions: item.cookingInstructions,
        // Removed status field as it's not expected by the backend
      }));

      // Calculate subtotal, tax, and final amount
      const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
      
      // Calculate tax based on restaurant profile VAT settings
      const enableVAT = restaurantProfile?.enableVAT !== false; // Default to true
      const vatRate = restaurantProfile?.vatRate || 5; // Default to 5% (UAE rate)
      const tax = enableVAT ? subtotal * (vatRate / 100) : 0;
      
      const finalAmount = subtotal + tax + tipAmount; // Include tip in final amount

      const result = await createOrder({
        tableId: tableId as Id<"tables">,
        items: orderItems,
        notes: orderNote
          ? `${customerName}: ${orderNote}`
          : `Order by ${customerName}`,
        tipAmount: tipAmount, // Include tip amount
      });

      console.log("Order created successfully:", result);
      toast.success(
        "Order submitted successfully! A waiter will review your order."
      );
      setCart([]);
      setOrderNote("");
      setTipAmount(0); // Reset tip amount after order submission
      setShowTipOptions(false); // Hide tip options after order submission
    } catch (error) {
      console.error("Order submission error:", error);
      toast.error("Failed to submit order. Please try again.");
    }
  };

  // Reset and start new order
  const startNewOrder = () => {
    setCart([]);
    setOrderNote("");
    setShowNameForm(true);
    setCustomerName("");
  };

  // Clear table history when leaving
  const leaveTable = async () => {
    if (
      window.confirm(
        "Are you leaving the table? This will clear all order history for this table."
      )
    ) {
      try {
        // Clear table orders
        await clearTableOrders({ tableId: tableId as Id<"tables"> });

        // Mark table as available
        await updateTableStatus({
          tableId: tableId as Id<"tables">,
          status: "available",
        });

        // Reset the customer session to show name form again
        setShowNameForm(true);
        setCustomerName("");
        setCart([]);
        setOrderNote("");

        toast.success("Table history cleared. Thank you for dining with us!");
      } catch (error) {
        toast.error("Failed to clear table history. Please try again.");
        console.error("Error clearing table:", error);
      }
    }
  };

  if (!inventory) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // Show name form first
  if (showNameForm) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to CafePOSPro
            </h1>
            <p className="text-gray-600 mt-2">
              Table {tableInfo?.tableNumber || tableId}
            </p>
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your Name
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Start Ordering
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg p-4 mb-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">CafePOSPro</h1>
            <p className="text-amber-100 text-sm sm:text-base">
              Table {tableInfo?.tableNumber || tableId}
            </p>
            <p className="text-amber-100 text-sm">
              Welcome, <span className="font-bold">{customerName}</span>!
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={startNewOrder}
              className="px-3 py-1 bg-white text-amber-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors whitespace-nowrap"
            >
              Change Name
            </button>
            <button
              onClick={() => {
                void leaveTable();
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Leave Table
            </button>
          </div>
        </div>

        {/* Waiter Call and Water Request Buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => {
              void callWaiter();
            }}
            className="flex-1 min-w-[120px] px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span className="text-lg">🔔</span>
            <span>Call Waiter</span>
          </button>
          <button
            onClick={() => {
              void requestWater();
            }}
            className="flex-1 min-w-[120px] px-4 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span className="text-lg">💧</span>
            <span>Request Water</span>
          </button>
        </div>

        <p className="text-amber-100 mt-3 text-center text-sm italic">
          Browse our menu and add items to your order. Your table mates can see
          what you're ordering in real-time.
        </p>
      </div>

      {/* Waiter On The Way Notification */}
      {acceptedNotification && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">
                Waiter on the way!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                {getStaffName(acceptedNotification.acceptedBy)} is coming to your table
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Order Status - What others at the table are ordering */}
      {tableOrders && tableOrders.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Live Orders at Your Table
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {tableOrders.map((order: Order) => (
              <div
                key={order._id}
                className="bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.notes
                        ? order.notes.split(":")[0]
                        : "Anonymous Customer"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "active"
                        ? "bg-amber-100 text-amber-800"
                        : order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="mt-2 space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium">
                          {item.quantity}x {item.itemName}
                        </span>
                        {item.cookingInstructions && (
                          <p className="text-xs text-gray-500 mt-1">
                            Instructions: {item.cookingInstructions}
                          </p>
                        )}
                        <span
                          className={`ml-2 px-1 py-0.5 rounded text-xs ${
                            item.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "preparing"
                                ? "bg-blue-100 text-blue-800"
                                : item.status === "ready"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <span className="font-medium">
                        {restaurantProfile?.currency || "₹"}{item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Ordered at{" "}
                  {new Date(order._creationTime).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer's Own Orders with Status */}
      {tableOrders &&
        tableOrders.filter(
          (order) => order.notes && order.notes.includes(customerName)
        ).length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
            <h2 className="text-lg font-semibold text-amber-900 mb-3">
              Your Orders
            </h2>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {tableOrders
                .filter(
                  (order) => order.notes && order.notes.includes(customerName)
                )
                .map((order: Order) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-amber-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          Placed at{" "}
                          {new Date(order._creationTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "active"
                            ? "bg-amber-100 text-amber-800"
                            : order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status === "active"
                          ? "In Progress"
                          : order.status === "completed"
                            ? "Completed"
                            : "Cancelled"}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm bg-amber-50 p-2 rounded"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {item.quantity}x {item.itemName}
                            </span>
                            {item.cookingInstructions && (
                              <p className="text-xs text-gray-600 mt-1">
                                Note: {item.cookingInstructions}
                              </p>
                            )}
                            <div className="flex items-center mt-1">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : item.status === "preparing"
                                      ? "bg-blue-100 text-blue-800"
                                      : item.status === "ready"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.status.charAt(0).toUpperCase() +
                                  item.status.slice(1)}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                {item.status === "pending" &&
                                  "Waiting to be prepared"}
                                {item.status === "preparing" &&
                                  "Being prepared"}
                                {item.status === "ready" && "Ready to serve"}
                                {item.status === "served" && "Served"}
                              </span>
                            </div>
                          </div>
                          <span className="font-medium">
                            ₹{item.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <span className="font-medium text-gray-700">
                        Total: {restaurantProfile?.currency || "₹"}
                        {order.items
                          .reduce((sum, item) => sum + item.total, 0)
                          .toFixed(2)}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        order.paymentStatus === "paid"
                          ? "text-green-600 bg-green-100"
                          : "text-amber-600 bg-amber-100"
                      }`}>
                        {order.paymentStatus === "paid"
                          ? "✅ Paid"
                          : "💳 Pending Payment"}
                      </span>
                    </div>
                    
                    {/* Payment Completion Message */}
                    {order.paymentStatus === "paid" && (
                      <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg animate-pulse">
                        <div className="flex items-center">
                          <span className="text-green-600 text-lg mr-2">✓</span>
                          <span className="text-green-800 font-bold">
                            Payment completed successfully!
                          </span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                          Thank you for your order. Your receipt has been generated.
                        </p>
                        <div className="mt-2 flex items-center text-xs text-green-600">
                          <span className="animate-bounce">🎉</span>
                          <span className="ml-2">We appreciate your business!</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* Main Content - Fixed Order Menu and Scrollable Menu Items */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Scrollable Menu Items - Takes full width on mobile, 70% on desktop */}
        <div className="lg:w-7/12 flex flex-col">
          {/* Header with Feedback Button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Feedback</span>
            </button>
          </div>

          {/* Category Tabs - Horizontal scroll on mobile */}
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap flex-shrink-0 ${
                  activeCategory === category
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Items Grid - Scrollable on mobile */}
          <div className="flex-grow overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item: MenuItem) => {
                // Check if item is already in cart
                const isInCart = cart.some(
                  (cartItem) => cartItem._id === item._id
                );
                const cartItem = cart.find(
                  (cartItem) => cartItem._id === item._id
                );

                return (
                  <div
                    key={item._id}
                    className={`rounded-lg border shadow-sm overflow-hidden hover:shadow transition-all ${
                      isInCart
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.itemName}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpath d='M21 15l-5-5L5 21'%3E%3C/path%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                      {!item.isActive && (
                        <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                          Unavailable
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {item.itemName}
                        </h3>
                        <p className="font-bold text-amber-600 text-sm">
                          {restaurantProfile?.currency || "₹"}{item.unitPrice.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 gap-1">
                        {isInCart ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => removeFromCart(item._id)}
                              className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold hover:bg-amber-700 transition-colors"
                              disabled={!item.isActive}
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {cartItem?.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold hover:bg-amber-700 transition-colors"
                              disabled={!item.isActive}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            disabled={!item.isActive}
                            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              item.isActive
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {item.isActive ? "Add" : "Unavailable"}
                          </button>
                        )}

                        {isInCart && (
                          <div className="text-right">
                            <p className="font-medium text-gray-900 text-sm">
                              {restaurantProfile?.currency || "₹"}{(cartItem!.quantity * item.unitPrice).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fixed Order Menu - Takes full width on mobile, 30% on desktop */}
        <div className="lg:w-5/12">
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-4 sticky top-4 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Order</h2>
              {cart.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛒</span>
                </div>
                <p className="text-gray-500">No items added yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Select items from the menu to add to your order
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item._id}
                      className="border-b pb-3 bg-amber-50 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-sm text-gray-600">
                            {restaurantProfile?.currency || "₹"}{item.unitPrice} each × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm hover:bg-amber-700"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Cooking Instructions for Cart Items */}
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Special instructions (optional)"
                          value={item.cookingInstructions || ""}
                          onChange={(e) =>
                            updateCookingInstructions(item._id, e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>

                      <p className="text-right font-medium mt-1">
                        {restaurantProfile?.currency || "₹"}{item.total.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{restaurantProfile?.currency || "₹"}{subtotal.toFixed(2)}</span>
                  </div>
                  
                  
                  {/* Tip Section */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span>Tip</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{restaurantProfile?.currency || "₹"}{tipAmount.toFixed(2)}</span>
                        <button
                          onClick={() => setShowTipOptions(!showTipOptions)}
                          className="text-amber-600 hover:text-amber-700 text-sm"
                        >
                          {showTipOptions ? "Hide" : "Add"}
                        </button>
                      </div>
                    </div>
                    
                    {showTipOptions && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          {[0, 10, 20, 50, 100].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setTipAmount(amount)}
                              className={`px-2 py-1 text-xs rounded ${
                                tipAmount === amount
                                  ? "bg-amber-600 text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {amount === 0 ? "No Tip" : `${restaurantProfile?.currency || "₹"}${amount}`}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(Number(e.target.value))}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="Custom"
                          />
                          <button
                            onClick={() => setTipAmount(0)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>{restaurantProfile?.currency || "₹"}{(finalAmount + tipAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Special instructions for the entire order (optional)"
                    className="w-full p-2 border border-gray-300 rounded-lg mb-3"
                    rows={2}
                  />
                  <button
                    onClick={() => {
                      void submitOrder();
                    }}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Submit Order for Approval
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Form Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Share Your Experience
                </h3>
                <button
                  onClick={() => setShowFeedbackForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
              <FeedbackForm
                tableId={tableId}
                customerName={customerName}
                onFeedbackSubmitted={() => {
                  setShowFeedbackForm(false);
                  toast.success("Thank you for your feedback!");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
