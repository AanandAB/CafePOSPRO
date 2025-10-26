import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function InventoryManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inventory = useQuery(api.inventory.getAllInventory);
  const categories = useQuery(api.inventory.getAllCategories);
  const lowStockItems = useQuery(api.inventory.getLowStockItems);

  const addItem = useMutation(api.inventory.addInventoryItem);
  const updateItem = useMutation(api.inventory.updateInventoryItem);
  const addCategory = useMutation(api.inventory.addCategory);
  const updateStock = useMutation(api.inventory.updateStock);
  const seedCategories = useMutation(api.inventory.seedDefaultCategories);
  const seedSampleData = useMutation(api.seed.seedSampleData);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    quantity: 0,
    unitPrice: 0,
    lowStockThreshold: 10,
    supplier: "",
    barcode: "",
    image: "", // Add image field
  });

  const [categoryData, setCategoryData] = useState({
    name: "",
    description: "",
    color: "#f59e0b",
  });

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Remove image
  const removeImage = () => {
    setImagePreview(null);
    setFormData({ ...formData, image: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateItem({
          itemId: editingItem._id,
          ...formData,
        });
        toast.success("Item updated successfully");
        setEditingItem(null);
      } else {
        await addItem(formData);
        toast.success("Item added successfully");
      }

      setFormData({
        itemName: "",
        category: "",
        quantity: 0,
        unitPrice: 0,
        lowStockThreshold: 10,
        supplier: "",
        barcode: "",
        image: "",
      });
      setImagePreview(null);
      setShowAddForm(false);
    } catch (error) {
      toast.error("Failed to save item");
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory(categoryData);
      toast.success("Category added successfully");
      setCategoryData({ name: "", description: "", color: "#f59e0b" });
      setShowCategoryForm(false);
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleStockUpdate = async (itemId: string, change: number) => {
    try {
      await updateStock({ itemId: itemId as any, quantityChange: change });
      toast.success("Stock updated");
    } catch (error) {
      toast.error("Failed to update stock");
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lowStockThreshold: item.lowStockThreshold,
      supplier: item.supplier || "",
      barcode: item.barcode || "",
      image: item.image || "", // Add image field
    });
    setImagePreview(item.image || null);
    setShowAddForm(true);
  };

  const handleSeedCategories = async () => {
    try {
      await seedCategories();
      toast.success("Default categories created!");
    } catch (error) {
      toast.error("Failed to create categories");
    }
  };

  const handleSeedSampleData = async () => {
    try {
      await seedSampleData();
      toast.success("Sample data created! You can now explore the system.");
    } catch (error) {
      toast.error("Failed to create sample data");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Inventory Management
        </h2>
        <div className="flex gap-3">
          {(!inventory || inventory.length === 0) && (
            <button
              onClick={handleSeedSampleData}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              🚀 Load Sample Data
            </button>
          )}
          {(!categories || categories.length === 0) && (
            <button
              onClick={handleSeedCategories}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Create Categories
            </button>
          )}
          <button
            onClick={() => setShowCategoryForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Category
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            ⚠️ Low Stock Alert
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg p-3 border border-red-200"
              >
                <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                <p className="text-sm text-red-600">
                  Only {item.quantity} left (Min: {item.lowStockThreshold})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Item Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />

              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                <option value="">Select Category</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Item Image (Optional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Choose Image
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Quantity"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit Price"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unitPrice: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <input
                type="number"
                placeholder="Low Stock Threshold"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lowStockThreshold: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />

              <input
                type="text"
                placeholder="Supplier (Optional)"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                    setFormData({
                      itemName: "",
                      category: "",
                      quantity: 0,
                      unitPrice: 0,
                      lowStockThreshold: 10,
                      supplier: "",
                      barcode: "",
                      image: "",
                    });
                    setImagePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add New Category
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                value={categoryData.name}
                onChange={(e) =>
                  setCategoryData({ ...categoryData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />

              <input
                type="text"
                placeholder="Description (Optional)"
                value={categoryData.description}
                onChange={(e) =>
                  setCategoryData({
                    ...categoryData,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setCategoryData({
                      name: "",
                      description: "",
                      color: "#f59e0b",
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-100">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory?.map((item) => (
              <div
                key={item._id}
                className="border border-gray-200 rounded-lg p-4"
              >
                {/* Item Image */}
                {item.image && (
                  <div className="mb-3">
                    <img
                      src={item.image}
                      alt={item.itemName}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {item.itemName}
                    </h3>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <button
                    onClick={() => startEdit(item)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    ✏️
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-medium">₹{item.unitPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span
                      className={`font-medium ${
                        item.quantity <= item.lowStockThreshold
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.quantity}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStockUpdate(item._id, -1)}
                    className="flex-1 bg-red-100 text-red-600 py-1 rounded text-sm font-medium hover:bg-red-200"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleStockUpdate(item._id, 1)}
                    className="flex-1 bg-green-100 text-green-600 py-1 rounded text-sm font-medium hover:bg-green-200"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleStockUpdate(item._id, 10)}
                    className="flex-1 bg-blue-100 text-blue-600 py-1 rounded text-sm font-medium hover:bg-blue-200"
                  >
                    +10
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
