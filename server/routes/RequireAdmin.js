// src/routes/RequireAdmin.jsx
import { Navigate } from "react-router-dom";

export default function RequireAdmin({ children }) {
  const user = JSON.parse(localStorage.getItem("craftedbyher_user") || "null");

  if (!user) {
    // not logged in
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    // logged in but not admin
    return <Navigate to="/account" replace />;
  }

  return children;
}
