// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
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
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const navigate = useNavigate();

  // 🔹 Helper to always get fresh Firebase token
  const getFreshToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true); // force refresh
  };

  // ---------- Backend sync ----------
  const syncProfile = async (extra = {}) => {
    const user = auth.currentUser;
    if (!user) return;

    const idToken = await getFreshToken();
    if (!idToken) return;

    const res = await fetch("http://localhost:5000/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        name: user.displayName || "",
        email: user.email,
        phone: extra.phone || "",
        photoURL: user.photoURL || "",
        provider: user.providerData?.[0]?.providerId || "password",
      }),
    });

    try {
      const data = await res.json();
      console.log("SYNC result:", data);
      if (data?.ok && data.user) {
        localStorage.setItem("craftedbyher_user", JSON.stringify(data.user));
      }
    } catch (e) {
      console.warn("sync parse failed", e);
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
          navigate("/products");
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

      // ✅ Always get fresh token
     // ✅ Get token here
const idToken = await user.getIdToken();

// Fetch role from backend
// ✅ Always sync first (creates/updates user in DB)
await fetch("http://localhost:5000/api/auth/sync", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({
    name: user.displayName || "",
    email: user.email,
    photoURL: user.photoURL || "",
    provider: user.providerData?.[0]?.providerId || "password",
  }),
});

// Show a single success toast
toast.dismiss();
toast.success("Login successful!", { className: "custom-toast", autoClose: 1200 });

// ✅ Now fetch role
const res = await fetch("http://localhost:5000/api/auth/me", {
  headers: { Authorization: `Bearer ${idToken}` },
});
const { user: profile } = await res.json();

      // Save profile with role
      localStorage.setItem("craftedbyher_user", JSON.stringify(profile));

      // Redirect based on role
      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/account");
      }

      // Sync profile (non-blocking)
      syncProfile?.();
    } catch (err) {
      console.error("Email login error:", err);
      const msg =
        {
          "auth/invalid-credential": "Invalid email or password.",
          "auth/user-not-found": "No account found for this email.",
          "auth/wrong-password": "Wrong password.",
          "auth/too-many-requests": "Too many attempts. Please wait and try again.",
          "auth/email-not-verified": "Please verify your email before continuing.",
        }[err?.code] || err?.message || "Login failed";
      toast.error(msg, { className: "custom-toast", autoClose: 2500 });
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
      await syncProfile();

      // Fetch role
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) throw new Error("Unauthorized");
      const { user: profile } = await res.json();

      localStorage.setItem("isLoggedIn", "true");
      toast.success("Signed in with Google!", {
        position: "bottom-center",
        className: "custom-toast",
        hideProgressBar: true,
        autoClose: 800,
      });
      // Show only one final toast
      toast.dismiss();
      toast.success("Login successful!", { className: "custom-toast", autoClose: 1200 });

      // Save profile with role
      localStorage.setItem("craftedbyher_user", JSON.stringify(profile));

      // Redirect
      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/account");
      }
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Google Sign-In failed", { className: "custom-toast", autoClose: 2500 });
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
          <img src="/images/login-side.jpg" alt="Login Visual" />
        </div>

        <div className="bk-auth-form">
          <h2 className="bk-auth-title">Sign In</h2>

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
            <div className="bk-field bk-input-group">
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

            <p className="bk-auth-footer" style={{ marginTop: 16 }}>
              Not a member? <Link to="/register">Sign up</Link>
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

          {/* ToastContainer is provided globally in App.jsx */}
        </div>
      </div>
    </div>
  );
}
