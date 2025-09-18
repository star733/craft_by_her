import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

export default function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  // Fetch categories
  const fetchCategories = async (user) => {
    const token = await user.getIdToken();
    const res = await fetch("http://localhost:5000/api/admin/categories", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) fetchCategories(user);
    });
    return () => unsub();
  }, []);

  // Save category
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Category name required");

    const user = auth.currentUser;
    const token = await user.getIdToken();
    const url = editingId
      ? `http://localhost:5000/api/admin/categories/${editingId}`
      : "http://localhost:5000/api/admin/categories";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success(editingId ? "Category updated" : "Category added");
      setForm({ name: "", description: "" });
      setEditingId(null);
      fetchCategories(user);
    } else {
      toast.error("Failed to save category");
    }
  };

  // Delete category
  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    const user = auth.currentUser;
    const token = await user.getIdToken();
    const res = await fetch(`http://localhost:5000/api/admin/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success("Category deleted");
      fetchCategories(user);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: "240px", background: "#fff", borderRight: "1px solid #eee", padding: "20px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "30px", color: "#5c4033" }}>CraftedByHer</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#5c4033",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#5c4033",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📦 Products
          </button>
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#5c4033",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            🧾 Orders
          </button>
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#5c4033",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            ⚙️ Settings
          </button>
          <hr />
          <button 
            onClick={() => navigate("/admin")} 
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "red",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            🚪 Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px", background: "#f8fafc" }}>
        <h1 style={{ marginBottom: "20px", fontSize: "24px", fontWeight: "600", color: "#5c4033" }}>Category Management</h1>

        {/* Form */}
        <section style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "30px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>Add/Edit Category</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", alignItems: "end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Category Name</label>
              <input
                type="text"
                placeholder="Category Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  outline: "none",
                  fontSize: "14px",
                  width: "100%"
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "500" }}>Description (optional)</label>
              <input
                type="text"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  outline: "none",
                  fontSize: "14px",
                  width: "100%"
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#5c4033",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                height: "fit-content"
              }}
            >
              {editingId ? "Update" : "Add"} Category
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", description: "" });
                  setEditingId(null);
                }}
                style={{
                  padding: "12px 24px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  height: "fit-content"
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </section>

        {/* Categories List */}
        <section style={{ background: "#fff", padding: "24px", borderRadius: "12px" }}>
          <h2 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>Categories ({categories.length})</h2>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Name</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Description</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px", fontWeight: "500" }}>{c.name}</td>
                    <td style={{ padding: "12px", color: "#666" }}>{c.description || "-"}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => {
                            setForm({ name: c.name, description: c.description || "" });
                            setEditingId(c._id);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#5c4033",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(c._id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#dc3545",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                      No categories found. Add your first category above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
