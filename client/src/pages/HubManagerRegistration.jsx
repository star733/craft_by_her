import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function HubManagerRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hubs, setHubs] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    hubId: "",
    address: {
      street: "",
      city: "",
      state: "Kerala",
      pincode: ""
    }
  });

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hubs`);
      const data = await res.json();
      if (data.success) {
        // Filter hubs without managers
        const availableHubs = data.hubs.filter(hub => !hub.managerId);
        setHubs(availableHubs);
      }
    } catch (error) {
      console.error("Error fetching hubs:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.username || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      // For now, this is a self-registration endpoint (you may want admin approval)
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/hub-managers/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
          address: formData.address,
          hubId: formData.hubId || null
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Registration successful! Please wait for admin approval.");
        navigate("/hub-manager/login");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
              <span className="text-3xl">🏢</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Hub Manager Registration</h2>
            <p className="text-gray-600">Join our hub management team</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Enter your full name"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="your@email.com"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="10-digit mobile number"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Account Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Account Credentials</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Choose a username"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Min. 6 characters"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Confirm password"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hub Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Hub Assignment (Optional)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Hub
                </label>
                <select
                  name="hubId"
                  value={formData.hubId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  disabled={loading}
                >
                  <option value="">No hub assignment (Admin will assign later)</option>
                  {hubs.map((hub) => (
                    <option key={hub.hubId} value={hub.hubId}>
                      {hub.name} - {hub.district}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Available hubs without managers: {hubs.length}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Address (Optional)</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Street address"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="City"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="State"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="6-digit pincode"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register as Hub Manager"}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 font-semibold mb-2">📝 Registration Note:</p>
            <p className="text-xs text-blue-700">
              After registration, your account will be in "pending" status. An administrator will review and activate your account.
            </p>
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/hub-manager/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-600 hover:text-gray-800 transition"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
