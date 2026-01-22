import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { MAIN_CATEGORIES } from "../data/categories";

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    title: "",
    mainCategory: "",
    subCategory: "",
    stock: "",
    variants: [{ weight: "", price: "" }],
    image: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch products
  const fetchProducts = async (user) => {
    const token = await user.getIdToken();
    const res = await fetch("http://localhost:5000/api/admin/products", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchProducts(user);
      }
    });
    return () => unsub();
  }, []);

  // Get available subcategories for selected main category
  const getAvailableSubcategories = () => {
    if (!form.mainCategory) return [];
    return MAIN_CATEGORIES[form.mainCategory]?.subcategories || [];
  };

  // ✅ Save product
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.mainCategory || !form.subCategory) {
      toast.error("Title, main category, and subcategory are required");
      return;
    }
    if (!form.stock || form.stock < 0) {
      toast.error("Valid stock quantity is required");
      return;
    }
    if (!form.variants.some((v) => v.weight && v.price > 0)) {
      toast.error("At least one valid variant required");
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const url = editingId
        ? `http://localhost:5000/api/admin/products/${editingId}`
        : "http://localhost:5000/api/admin/products";
      const method = editingId ? "PUT" : "POST";

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("mainCategory", form.mainCategory);
      fd.append("subCategory", form.subCategory);
      fd.append("stock", form.stock);
      fd.append("variants", JSON.stringify(form.variants));
      if (form.image) fd.append("image", form.image);

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        toast.success(editingId ? "Product updated" : "Product added");
        setForm({ 
          title: "", 
          mainCategory: "", 
          subCategory: "",
          stock: "",
          variants: [{ weight: "", price: "" }], 
          image: null 
        });
        setEditingId(null);
        fetchProducts(auth.currentUser);
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to save product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving product");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (product) => {
    setForm({
      title: product.title || "",
      mainCategory: product.mainCategory || "",
      subCategory: product.subCategory || "",
      stock: product.stock || "",
      variants: product.variants && product.variants.length > 0 
        ? product.variants 
        : [{ weight: "", price: "" }],
      image: null,
    });
    setEditingId(product._id);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Product Management</h2>

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          placeholder="Product Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border px-3 py-2 rounded w-full mb-3"
        />

        {/* Main Category Dropdown */}
        <select
          value={form.mainCategory}
          onChange={(e) => setForm({ ...form, mainCategory: e.target.value, subCategory: "" })}
          className="border px-3 py-2 rounded w-full mb-3"
        >
          <option value="">Select Main Category</option>
          {Object.keys(MAIN_CATEGORIES).map((mainCat) => (
            <option key={mainCat} value={mainCat}>
              {mainCat}
            </option>
          ))}
        </select>

        {/* Sub Category Dropdown */}
        <select
          value={form.subCategory}
          onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
          className="border px-3 py-2 rounded w-full mb-3"
          disabled={!form.mainCategory}
        >
          <option value="">Select Sub Category</option>
          {getAvailableSubcategories().map((subCat) => (
            <option key={subCat} value={subCat}>
              {subCat}
            </option>
          ))}
        </select>

        {/* Stock */}
        <input
          type="number"
          placeholder="Stock Quantity"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className="border px-3 py-2 rounded w-full mb-3"
          min="0"
        />

        {/* Variants */}
        <h4 className="font-semibold mb-2">Variants (Weight + Price)</h4>
        {form.variants.map((v, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Weight (e.g. 100g)"
              value={v.weight}
              onChange={(e) => {
                const updated = [...form.variants];
                updated[i].weight = e.target.value;
                setForm({ ...form, variants: updated });
              }}
              className="border px-2 py-1 rounded"
            />
            <input
              type="number"
              placeholder="Price"
              value={v.price}
              onChange={(e) => {
                const updated = [...form.variants];
                updated[i].price = e.target.value;
                setForm({ ...form, variants: updated });
              }}
              className="border px-2 py-1 rounded"
              min="1"
              max="10000"
            />
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  variants: form.variants.filter((_, idx) => idx !== i),
                })
              }
              className="bg-red-500 text-white px-2 rounded"
            >
              X
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setForm({ ...form, variants: [...form.variants, { weight: "", price: "" }] })}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-3"
        >
          + Add Variant
        </button>

        {/* Image */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
          className="mb-3"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setForm({ 
                  title: "", 
                  mainCategory: "", 
                  subCategory: "",
                  stock: "",
                  variants: [{ weight: "", price: "" }], 
                  image: null 
                });
                setEditingId(null);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Products List */}
      <h3 className="text-xl font-bold mb-2">Products List</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products
          .filter(p => {
            // Exclude test products
            if (p.title && p.title.toLowerCase().includes("test product")) return false;
            return true;
          })
          .map((p) => (
          <div key={p._id} className="border rounded p-3 bg-white">
            {p.image && (
              <img 
                src={`http://localhost:5000/uploads/${p.image}`} 
                alt={p.title} 
                className="w-full h-40 object-cover rounded mb-2" 
              />
            )}
            <h4 className="font-bold">{p.title}</h4>
            <p className="text-sm text-gray-500">
              Category: {p.mainCategory && p.subCategory 
                ? `${p.mainCategory} > ${p.subCategory}`
                : p.subCategory || p.category?.name || p.category || "Uncategorized"}
            </p>
            <p className="text-sm text-gray-500">Stock: {p.stock || 0}</p>
            <ul className="mt-2">
              {(p.variants || []).map((v, idx) => (
                <li key={idx}>
                  {v.weight} — ₹{v.price}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleEdit(p)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
