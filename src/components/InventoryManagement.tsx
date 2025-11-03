import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { useUserPreferences } from "../contexts/UserPreferencesContext";

interface InventoryItem {
  _id: Id<"inventory">;
  _creationTime: number;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lowStockThreshold: number;
  supplier?: string;
  barcode?: string;
  image?: string;
  isActive: boolean;
}

export function InventoryManagement() {
  const { playSound, preferences } = useUserPreferences();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showHiddenItems, setShowHiddenItems] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    quantity: 0,
    unitPrice: 0,
    lowStockThreshold: 5,
    supplier: "",
    barcode: "",
    image: "",
  });

  const inventory = useQuery(showHiddenItems ? api.inventory.getAllInventoryIncludingHidden : api.inventory.getAllInventory);
  const categories = useQuery(api.inventory.getAllCategories);
  const addItem = useMutation(api.inventory.addInventoryItem);
  const updateItem = useMutation(api.inventory.updateInventoryItem);
  const toggleItemStatus = useMutation(api.inventory.toggleInventoryItemStatus);

  // Filter inventory based on search, category, low stock filter, and hidden items filter
  const filteredInventory = inventory?.filter((item) => {
    const matchesSearch = item.itemName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesLowStock =
      !showLowStockOnly || item.quantity <= item.lowStockThreshold;
    const matchesHidden = showHiddenItems ? !item.isActive : item.isActive; // Show hidden or active items based on filter
    return matchesSearch && matchesCategory && matchesLowStock && matchesHidden;
  });

  // Check for low stock items and show notifications
  useEffect(() => {
    if (inventory && preferences.notifications.lowStockAlerts) {
      const lowStockItems = inventory.filter(
        (item) => item.quantity <= item.lowStockThreshold
      );

      if (lowStockItems.length > 0) {
        // Only show notification if we haven't shown it recently
        const lastLowStockAlert = localStorage.getItem("lastLowStockAlert");
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (
          !lastLowStockAlert ||
          now - parseInt(lastLowStockAlert) > fiveMinutes
        ) {
          toast.info(
            `Low stock alert: ${lowStockItems.length} item${
              lowStockItems.length > 1 ? "s" : ""
            } running low`,
            {
              duration: 5000,
            }
          );
          playSound("notification");
          localStorage.setItem("lastLowStockAlert", now.toString());
        }
      }
    }
  }, [inventory, preferences.notifications.lowStockAlerts, playSound]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItem(formData);
      toast.success("Item added successfully");
      playSound("success");
      setFormData({
        itemName: "",
        category: "",
        quantity: 0,
        unitPrice: 0,
        lowStockThreshold: 5,
        supplier: "",
        barcode: "",
        image: "",
      });
      setShowAddForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add item");
      playSound("error");
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateItem({
        itemId: editingItem._id,
        ...formData,
      });
      toast.success("Item updated successfully");
      playSound("success");
      setEditingItem(null);
      setShowEditForm(false);
      setFormData({
        itemName: "",
        category: "",
        quantity: 0,
        unitPrice: 0,
        lowStockThreshold: 5,
        supplier: "",
        barcode: "",
        image: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to update item");
      playSound("error");
    }
  };

  const handleDeleteItem = async (itemId: Id<"inventory">) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        // We don't have a delete function, so we'll just hide the item
        await toggleItemStatus({ itemId, isActive: false });
        toast.success("Item deleted successfully");
        playSound("success");
      } catch (error) {
        toast.error("Failed to delete item");
        playSound("error");
      }
    }
  };

  const handleToggleItemStatus = async (
    itemId: Id<"inventory">,
    isActive: boolean
  ) => {
    try {
      await toggleItemStatus({ itemId, isActive: !isActive });
      toast.success("Item status updated");
      playSound("click");
    } catch (error) {
      toast.error("Failed to update item status");
      playSound("error");
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lowStockThreshold: item.lowStockThreshold,
      supplier: item.supplier || "",
      barcode: item.barcode || "",
      image: item.image || "",
    });
    setShowEditForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Inventory Management
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
        >
          Add New Item
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories?.map((categoryObj: any) => {
                // Handle both string and object formats for categories
                const category =
                  typeof categoryObj === "string"
                    ? categoryObj
                    : categoryObj.name || categoryObj.category || "";
                // Skip empty categories
                if (!category) return null;
                return (
                  <option key={category} value={category}>
                    {category}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${
                showLowStockOnly
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
              }`}
            >
              Low Stock Only
            </button>
          </div>
          <div>
            <button
              onClick={() => setShowHiddenItems(!showHiddenItems)}
              className={`w-full px-3 py-2 rounded-lg font-medium transition-colors ${
                showHiddenItems
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
              }`}
            >
              {showHiddenItems ? "Show Active" : "Show Hidden"}
            </button>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      <div>
        {!filteredInventory ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-amber-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No items found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedCategory !== "all" || showLowStockOnly
                ? "Try adjusting your filters"
                : "Add your first inventory item to get started"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => (
              <div
                key={item._id}
                className={`border rounded-xl p-4 shadow-sm transition-all ${
                  item.isActive
                    ? "bg-white dark:bg-gray-800 border-amber-100 dark:border-gray-700"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-75"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {item.itemName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.category}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-full hover:bg-amber-50 dark:hover:bg-gray-600"
                    >
                      <span className="text-sm">✏️</span>
                    </button>
                    <button
                      onClick={() => void handleDeleteItem(item._id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-gray-600"
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  </div>
                </div>

                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.itemName}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-gray-400 dark:text-gray-500">
                      No Image
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Price:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₹{item.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Stock:
                    </span>
                    <span
                      className={`font-medium ${
                        item.quantity <= item.lowStockThreshold
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {item.quantity} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Threshold:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.lowStockThreshold}
                    </span>
                  </div>
                </div>

                {item.quantity <= item.lowStockThreshold && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                      Low Stock
                    </span>
                    {!item.isActive && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Hidden
                      </span>
                    )}
                  </div>
                )}
                {item.quantity > item.lowStockThreshold && !item.isActive && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      Hidden
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() =>
                      void handleToggleItemStatus(item._id, item.isActive)
                    }
                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      item.isActive
                        ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                        : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50"
                    }`}
                  >
                    {item.isActive ? "Hide" : "Unhide"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Item
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    itemName: "",
                    category: "",
                    quantity: 0,
                    unitPrice: 0,
                    lowStockThreshold: 5,
                    supplier: "",
                    barcode: "",
                    image: "",
                  });
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddItem(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) =>
                    setFormData({ ...formData, itemName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select existing category</option>
                    {categories?.map((categoryObj: any) => {
                      // Handle both string and object formats for categories
                      const category =
                        typeof categoryObj === "string"
                          ? categoryObj
                          : categoryObj.name || categoryObj.category || "";
                      // Skip empty categories
                      if (!category) return null;
                      return (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Or type new category"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select from existing categories or type a new one
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
                <div className="flex gap-2 mt-2">
                  <label className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors cursor-pointer">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Create a preview URL for the image
                          const previewUrl = URL.createObjectURL(file);
                          setFormData({ 
                            ...formData, 
                            image: previewUrl
                          });
                          
                          // In a real implementation, you would upload to a service like Cloudinary
                          // For now, we'll just use the preview URL
                          toast.info("Image selected. In a production environment, this would be uploaded to a cloud storage service.");
                        }
                      }}
                    />
                  </label>
                </div>
                {formData.image && (
                  <div className="mt-2">
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        // If the image fails to load, show a placeholder
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpath d='M21 15l-5-5L5 21'%3E%3C/path%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter URL or upload an image (JPG, PNG, GIF)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      itemName: "",
                      category: "",
                      quantity: 0,
                      unitPrice: 0,
                      lowStockThreshold: 5,
                      supplier: "",
                      barcode: "",
                      image: "",
                    });
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white py-2 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditForm && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Item
              </h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingItem(null);
                  setFormData({
                    itemName: "",
                    category: "",
                    quantity: 0,
                    unitPrice: 0,
                    lowStockThreshold: 5,
                    supplier: "",
                    barcode: "",
                    image: "",
                  });
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdateItem(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={(e) =>
                    setFormData({ ...formData, itemName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  Update Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingItem(null);
                    setFormData({
                      itemName: "",
                      category: "",
                      quantity: 0,
                      unitPrice: 0,
                      lowStockThreshold: 5,
                      supplier: "",
                      barcode: "",
                      image: "",
                    });
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-white py-2 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
