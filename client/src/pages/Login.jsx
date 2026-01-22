// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { auth } from "../firebase";
import { validateLogin, validateEmail, validatePassword } from "../utils/validate";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || null;

  // 🔹 Helper to always get fresh Firebase token
  const getFreshToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true); // force refresh
  };

  // ---------- Backend sync ----------
  const syncProfile = async (extra = {}) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await getFreshToken();
      if (!idToken) return;

      const res = await fetch(`${API_BASE}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: user.displayName || "",
          email: user.email,
          phone: extra.phone || "",
          photoURL: user.photoURL || "",
          provider: user.providerData?.[0]?.providerId || "password",
        }),
      });

      const data = await res.json().catch(() => null);
      console.log("SYNC result:", data);
      if (data?.ok && data.user) {
        localStorage.setItem("craftedbyher_user", JSON.stringify(data.user));
      }
    } catch (e) {
      console.warn("sync failed:", e?.message || e);
      // Do not throw to keep UI flow alive when backend is down
    }
  };

  // ---------- Pick up redirect result ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res?.user) {
          await syncProfile();
          localStorage.setItem("isLoggedIn", "true");
          toast.success("Signed in with Google!", {
            position: "bottom-center",
            className: "custom-toast",
            hideProgressBar: true,
            autoClose: 1000,
          });
          navigate(fromPath || "/products");
        }
      } catch (err) {
        console.error("Redirect sign-in error", err);
      }
    })();
  }, []);

  // ---------- Validation handlers ----------
  const onEmailChange = (v) => {
    setEmail(v);
    setErrors((e) => ({ ...e, email: validateEmail(v) }));
  };
  const onPwChange = (v) => {
    setPassword(v);
    setErrors((e) => ({ ...e, password: validatePassword(v) }));
  };

  // ---------- Email/password login ----------
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const formError = validateLogin({ email, password });
    if (formError) {
      setErrors({
        email: validateEmail(email),
        password: validatePassword(password),
      });
      setTouched({ email: true, password: true });
      toast.error(formError, { className: "custom-toast" });
      return;
    }
    setLoadingEmail(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);

      localStorage.setItem("isLoggedIn", "true");
      toast.success("Login successful!", { className: "custom-toast", autoClose: 1200 });

      // ✅ Always get fresh token
      const idToken = await user.getIdToken();

      // Debug: Test connection before sync
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      console.log("API Base URL:", API_BASE);
      
      // Test connection
      try {
        const testResponse = await fetch(`${API_BASE}/api/auth/me`);
        console.log("Connection test response:", testResponse.status);
      } catch (testErr) {
        console.error("Connection test failed:", testErr);
        toast.error("Connection test failed: " + testErr.message, { className: "custom-toast", autoClose: 5000 });
      }

      // ✅ Always sync first (creates/updates user in DB)
      const syncResponse = await fetch(`${API_BASE}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: user.displayName || "",
          email: user.email,
          photoURL: user.photoURL || "",
          provider: user.providerData?.[0]?.providerId || "password",
        }),
      });

      console.log("Sync response:", syncResponse.status, syncResponse.statusText);

      // Check if sync failed
      if (!syncResponse.ok) {
        if (syncResponse.status === 0) {
          // Network error - server unreachable
          toast.error("Cannot connect to server. Please check if the server is running and you have internet connection.", { 
            className: "custom-toast", 
            autoClose: 5000 
          });
          setLoadingEmail(false);
          return;
        } else if (syncResponse.status === 403) {
          // Seller not approved - block login
          const errorData = await syncResponse.json().catch(() => ({}));
          await signOut(auth);
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("craftedbyher_user");
          toast.error(errorData.message || "Your seller application is pending admin approval. You will receive an email when approved.", { 
            className: "custom-toast", 
            autoClose: 7000 
          });
          setLoadingEmail(false);
          return;
        } else {
          // Other server error
          toast.error(`Server error: ${syncResponse.status} ${syncResponse.statusText}`, { 
            className: "custom-toast", 
            autoClose: 3000 
          });
          setLoadingEmail(false);
          return;
        }
      }

      toast.dismiss();
      toast.success("Login successful!", { autoClose: 1200 });

      // ✅ Now fetch role
      const roleResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${idToken}` },
      });

      console.log("Role fetch response:", roleResponse.status, roleResponse.statusText);

      // Check if role fetch failed due to network issues
      if (!roleResponse.ok) {
        if (roleResponse.status === 0) {
          // Network error - server unreachable
          toast.error("Cannot connect to server to fetch user role. Please check your connection.", { 
            className: "custom-toast", 
            autoClose: 5000 
          });
          setLoadingEmail(false);
          return;
        } else {
          // Other server error
          toast.error(`Failed to fetch user role: ${roleResponse.status} ${roleResponse.statusText}`, { 
            className: "custom-toast", 
            autoClose: 3000 
          });
          setLoadingEmail(false);
          return;
        }
      }

      const responseData = await roleResponse.json();
      console.log("Role response data:", responseData);
      const { user: profile } = responseData;

      // Save profile with role
      localStorage.setItem("craftedbyher_user", JSON.stringify(profile));

      console.log("User profile:", profile);
      console.log("User role:", profile?.role);

      // 🔒 GLOBAL seller gate: if there is a seller application that is NOT approved,
      // block ALL login (no buyer fallback) until admin approves.
      try {
        const token = await user.getIdToken(true);
        const appRes = await fetch(`${API_BASE}/api/seller/applications/my-application`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Global seller gate - application status:", appRes.status);

        if (appRes.ok) {
          const appData = await appRes.json();
          console.log("Global seller gate - application data:", appData);
          if (appData.success && appData.application && appData.application.status !== "approved") {
            // Seller has applied but is NOT approved yet → block login completely
            await signOut(auth);
            toast.error(
              "Your seller application is pending admin approval. You'll receive an email saying 'the admin accepted your request and you can log in now'. Please wait for approval before logging in.",
              { className: "custom-toast", autoClose: 7000 }
            );
            navigate("/login");
            return;
          }
        } else if (appRes.status !== 404) {
          // For safety, if server cannot tell us the application status (and it's not 404 = no app),
          // block login instead of allowing a potentially unapproved seller.
          console.log("Global seller gate - unexpected status, blocking login:", appRes.status);
          await signOut(auth);
          toast.error("Unable to verify seller application status. Please try again later.", {
            className: "custom-toast",
            autoClose: 5000,
          });
          navigate("/login");
          return;
        }
      } catch (gateErr) {
        console.log("Global seller gate error - blocking login", gateErr);
        await signOut(auth);
        toast.error("Error verifying seller application status. Please try again later.", {
          className: "custom-toast",
          autoClose: 5000,
        });
        navigate("/login");
        return;
      }

      // At this point either:
      // - user has no seller application, OR
      // - seller application exists and is approved.
      // So we can safely route by role.
      if (profile?.role === "admin") {
        console.log("Redirecting admin to /admin");
        navigate("/admin");
      } else if (profile?.role === "seller") {
        console.log("Approved seller - redirecting to /seller");
        navigate("/seller");
      } else {
        console.log("Redirecting buyer to /account");
        // For buyers, redirect to account dashboard (with sidebar) or the page they were trying to access
        navigate(fromPath || "/account");
      }

      // Sync profile (non-blocking)
      syncProfile?.();
    } catch (err) {
      console.error("Email login error:", err);
      
      // Check if it's a network error
      if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        toast.error("Cannot connect to server. Please check your internet connection and ensure the server is running.", { className: "custom-toast", autoClose: 5000 });
      } else {
        // Check for specific backend error messages
        let errorMessage = "";
        
        // Check if we have a response from the backend
        if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = err?.message || "Login failed";
        }
        
        // Handle seller-specific errors
        if (errorMessage.includes("Seller application not approved")) {
          toast.error("Your seller application is not yet approved. Please check your email for updates.", { 
            className: "custom-toast", 
            autoClose: 4000 
          });
        } else if (errorMessage.includes("User is not a seller")) {
          toast.error("This account is not registered as a seller.", { 
            className: "custom-toast", 
            autoClose: 3000 
          });
        } else {
          // Handle standard Firebase errors
          const msg =
            {
              "auth/invalid-credential": "Invalid email or password.",
              "auth/user-not-found": "No account found for this email.",
              "auth/wrong-password": "Wrong password.",
              "auth/too-many-requests": "Too many attempts. Please wait and try again.",
              "auth/email-not-verified": "Please verify your email before continuing.",
            }[err?.code] || errorMessage || "Login failed";
          toast.error(msg, { className: "custom-toast", autoClose: 2500 });
        }
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  // ---------- Google login ----------
  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      // ✅ Always get fresh token
      const idToken = await getFreshToken();

      // Sync with backend
      const syncResponse = await fetch(`${API_BASE}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: gUser.displayName || "",
          email: gUser.email,
          photoURL: gUser.photoURL || "",
          provider: gUser.providerData?.[0]?.providerId || "google.com",
        }),
      });

      // Check if sync failed due to network issues
      if (!syncResponse.ok) {
        if (syncResponse.status === 0) {
          // Network error - server unreachable
          toast.error("Cannot connect to server during Google login. Please check your connection.", { 
            className: "custom-toast", 
            autoClose: 5000 
          });
          setLoadingGoogle(false);
          return;
        } else if (syncResponse.status === 403) {
          // Seller not approved - block login
          const errorData = await syncResponse.json().catch(() => ({}));
          await signOut(auth);
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("craftedbyher_user");
          toast.error(errorData.message || "Your seller application is pending admin approval. You will receive an email when approved.", { 
            className: "custom-toast", 
            autoClose: 7000 
          });
          setLoadingGoogle(false);
          return;
        } else {
          // Other server error
          toast.error(`Server error during Google login: ${syncResponse.status} ${syncResponse.statusText}`, { 
            className: "custom-toast", 
            autoClose: 3000 
          });
          setLoadingGoogle(false);
          return;
        }
      }

      // Fetch role
      const roleResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${idToken}` },
      });

      console.log("Role response status:", roleResponse.status);
      
      // Check if role fetch failed due to network issues
      if (!roleResponse.ok) {
        if (roleResponse.status === 0) {
          // Network error - server unreachable
          toast.error("Cannot connect to server to fetch user role after Google login. Please check your connection.", { 
            className: "custom-toast", 
            autoClose: 5000 
          });
          setLoadingGoogle(false);
          return;
        } else {
          // Other server error
          toast.error(`Failed to fetch user role after Google login: ${roleResponse.status} ${roleResponse.statusText}`, { 
            className: "custom-toast", 
            autoClose: 3000 
          });
          setLoadingGoogle(false);
          return;
        }
      }

      const responseData = await roleResponse.json();
      console.log("Role response data:", responseData);
      const { user: profile } = responseData;

      // 🔒 GLOBAL seller gate (Google login as well)
      try {
        const token = await gUser.getIdToken(true);
        const appRes = await fetch(`${API_BASE}/api/seller/applications/my-application`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Global seller gate (Google) - application status:", appRes.status);

        if (appRes.ok) {
          const appData = await appRes.json();
          console.log("Global seller gate (Google) - application data:", appData);
          if (appData.success && appData.application && appData.application.status !== "approved") {
            await signOut(auth);
            toast.error(
              "Your seller application is pending admin approval. You'll receive an email saying 'the admin accepted your request and you can log in now'. Please wait for approval before logging in.",
              { className: "custom-toast", autoClose: 7000 }
            );
            navigate("/login");
            return;
          }
        } else if (appRes.status !== 404) {
          console.log("Global seller gate (Google) - unexpected status, blocking login:", appRes.status);
          await signOut(auth);
          toast.error("Unable to verify seller application status. Please try again later.", {
            className: "custom-toast",
            autoClose: 5000,
          });
          navigate("/login");
          return;
        }
      } catch (gateErr) {
        console.log("Global seller gate error (Google) - blocking login", gateErr);
        await signOut(auth);
        toast.error("Error verifying seller application status. Please try again later.", {
          className: "custom-toast",
          autoClose: 5000,
        });
        navigate("/login");
        return;
      }

      // If we reach here, either no seller application OR it is approved.
      localStorage.setItem("isLoggedIn", "true");
      toast.success("Signed in with Google!", {
        position: "bottom-center",
        className: "custom-toast",
        hideProgressBar: true,
        autoClose: 800,
      });
      toast.dismiss();
      toast.success("Login successful!", { autoClose: 1200 });

      // Save profile with role
      localStorage.setItem("craftedbyher_user", JSON.stringify(profile));

      console.log("User profile:", profile);
      console.log("User role:", profile?.role);

      if (profile?.role === "admin") {
        console.log("Redirecting admin to /admin");
        navigate("/admin");
      } else if (profile?.role === "seller") {
        console.log("Approved seller (Google) - redirecting to /seller");
        navigate("/seller");
      } else {
        console.log("Redirecting buyer to /account");
        navigate(fromPath || "/account");
      }
    } catch (err) {
      console.error("Google login error:", err);
      const isConnRefused = /Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/i.test(err?.message || "");
      const msg = isConnRefused
        ? `Backend not reachable at ${API_BASE}. Please start the server (npm start in server).`
        : "Google Sign-In failed";
      toast.error(msg, { className: "custom-toast", autoClose: 3000 });
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ---------- UI ----------
  const emailInvalid = touched.email && !!errors.email;
  const emailValid = touched.email && !errors.email && email;
  const pwInvalid = touched.password && !!errors.password;
  const pwValid = touched.password && !errors.password && password;

  return (
    <div className="bk-auth-wrapper">
      <div className="bk-auth-card">
        <div className="bk-auth-image">
          {/* Use Vite base-aware path with graceful fallback */}
          <img
            src={`${import.meta.env.BASE_URL || '/'}images/login-side.jpg`}
            alt="Login Visual"
            onError={(e) => {
              const target = e.currentTarget;
              // Try an alternate path once; then hide if still failing
              if (!target.dataset.fallbackTried) {
                target.dataset.fallbackTried = '1';
                target.src = '/images/login-side.jpeg';
              } else {
                target.style.display = 'none';
              }
            }}
          />
        </div>

        <div className="bk-auth-form">
          <h2 className="bk-auth-title">Sign In</h2>
          {fromPath && (
            <div className="bk-alert bk-alert--info" style={{marginBottom: 12}}>
              Please login to view your {fromPath.replace("/", "")}.
            </div>
          )}

          <form onSubmit={handleEmailLogin} autoComplete="on">
            {/* Email */}
            <div className="bk-field">
              <input
                className={`bk-auth-input ${emailInvalid ? "is-invalid" : ""} ${emailValid ? "is-valid" : ""}`}
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
              {emailInvalid && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="bk-input-group">
              <input
                className={`bk-auth-input bk-input--with-icon ${pwInvalid ? "is-invalid" : ""} ${pwValid ? "is-valid" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => onPwChange(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="bk-input-icon"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
              {pwInvalid && <span className="field-error">{errors.password}</span>}
            </div>

            <div style={{ textAlign: "right", marginTop: 8 }}>
              <Link to="/forgot" className="bk-auth-link forgot">
                Forgot password?
              </Link>
            </div>

            <p className="bk-auth-footer" style={{ marginTop: 12 }}>
              Don't have an account? <Link to="/register" className="bk-auth-link">Sign Up</Link>
            </p>

            <p className="bk-auth-footer" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
              🏢 Hub Manager? <Link to="/hub-manager/login" className="bk-auth-link" style={{color: '#8b5cf6'}}>Login Here</Link>
            </p>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button 
                className={`bk-btn bk-btn--primary ${loadingEmail ? 'loading' : ''}`} 
                type="submit" 
                disabled={loadingEmail}
              >
                {loadingEmail ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>

          <div className="bk-auth-divider">
            <span>or</span>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
              className={`bk-btn bk-btn--google ${loadingGoogle ? 'loading' : ''}`}
              style={{ width: 240 }}
            >
              <img src="/icons/google-white.svg" alt="Google" style={{ width: 20, height: 20 }} />
              {loadingGoogle ? "Connecting…" : "Sign in with Google"}
            </button>
          </div>

          {/* Quick Links */}
          <div style={{ 
            textAlign: "center", 
            marginTop: "20px", 
            paddingTop: "15px", 
            borderTop: "1px solid #eee",
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            <Link 
              to="/delivery-login" 
              style={{
                color: "#666",
                textDecoration: "none",
                fontSize: "13px",
                transition: "color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.color = "#5c4033"}
              onMouseOut={(e) => e.target.style.color = "#666"}
            >
              🚚 Delivery Login
            </Link>
            <span style={{ color: "#ddd" }}>|</span>
            <Link 
              to="/seller-guide" 
              style={{
                color: "#666",
                textDecoration: "none",
                fontSize: "13px",
                transition: "color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.color = "#5c4033"}
              onMouseOut={(e) => e.target.style.color = "#666"}
            >
              📝 Seller Guide
            </Link>
          </div>

          <ToastContainer />
        </div>
      </div>
    </div>
  );
}