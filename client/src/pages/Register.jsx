// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { auth } from "../firebase";

import {
  validateRegister,
  validateName,
  validatePhone,
  validateEmail,
  validatePassword,
} from "../utils/validate";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errors, setErrors] = useState({ name: "", phone: "", email: "", password: "" });
  const [touched, setTouched] = useState({ name: false, phone: false, email: false, password: false });
  const navigate = useNavigate();

  const onName  = (v) => { setName(v);   setErrors((e) => ({ ...e, name: validateName(v) })); };
  const onPhone = (v) => { setPhone(v);  setErrors((e) => ({ ...e, phone: validatePhone(v) })); };
  const onEmail = (v) => { setEmail(v);  setErrors((e) => ({ ...e, email: validateEmail(v) })); };
  const onPw    = (v) => { setPassword(v); setErrors((e) => ({ ...e, password: validatePassword(v) })); };

  const onSubmit = async (e) => {
    e.preventDefault();

    const formError = validateRegister({ name, phone, email, password });
    if (formError) {
      setErrors({
        name: validateName(name),
        phone: validatePhone(phone),
        email: validateEmail(email),
        password: validatePassword(password),
      });
      setTouched({ name: true, phone: true, email: true, password: true });
      toast.error(formError, { className: "custom-toast" });
      return;
    }

    setLoading(true);
    try {
      // 1) Create Firebase user
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Persist lightweight user profile for UI
      localStorage.setItem(
        "craftedbyher_user",
        JSON.stringify({ name: user.displayName || "", email: user.email || "", uid: user.uid })
      );

      // 2) Save display name
      if (name) await updateProfile(user, { displayName: name });

      // 3) Send verification email
      await sendEmailVerification(user, {
        url: `${window.location.origin}/action`,
        handleCodeInApp: true,
      });

      // 4) (Optional) sync preliminary profile to backend
      try {
        const idToken = await user.getIdToken();
        await fetch("http://localhost:5000/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ phone }),
        });
      } catch (e) {
        console.warn("Profile sync skipped/failed:", e);
      }

      // 5) Sign out to enforce verification before first login
      await signOut(auth);

      // ✅ Correct message for registration flow
      toast.success("Verification email sent. Please check your inbox.", {
        className: "custom-toast",
        autoClose: 2000,
      });

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error(err);
      const msg =
        {
          "auth/email-already-in-use": "Email already in use.",
          "auth/weak-password": "Password should be at least 6 characters.",
          "auth/invalid-email": "Invalid email address.",
        }[err.code] || err?.message || "Registration failed";
      toast.error(msg, { className: "custom-toast" });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Google sign up ----------
  const handleGoogleSignup = async () => {
    try {
      setLoadingGoogle(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      // Sync lightweight profile locally
      localStorage.setItem(
        "craftedbyher_user",
        JSON.stringify({ name: gUser.displayName || "", email: gUser.email || "", uid: gUser.uid })
      );
      localStorage.setItem("isLoggedIn", "true");

      // Optional: call backend sync similar to login
      try {
        const idToken = await gUser.getIdToken();
        await fetch("http://localhost:5000/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            name: gUser.displayName || "",
            email: gUser.email,
            photoURL: gUser.photoURL || "",
            provider: gUser.providerData?.[0]?.providerId || "google",
          }),
        });
      } catch {}

      toast.success("Signed up with Google!", { className: "custom-toast", autoClose: 1200 });
      navigate("/account");
    } catch (err) {
      console.error("Google signup error:", err);
      toast.error("Google sign-up failed", { className: "custom-toast" });
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="bk-auth-wrapper">
      <div className="bk-auth-card">
        <div className="bk-auth-image">
          <img src="/images/login-side.jpeg" alt="Register Visual" />
        </div>

        <div className="bk-auth-form">
          <h2 className="bk-auth-title">Sign Up</h2>

          <form autoComplete="on" onSubmit={onSubmit}>
            {/* NAME */}
            <div className="bk-field">
              <input
                className={`bk-auth-input ${touched.name && errors.name ? "is-invalid" : ""} ${
                  touched.name && !errors.name ? "is-valid" : ""
                }`}
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => onName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
              {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* PHONE */}
            <div className="bk-field">
              <input
                className={`bk-auth-input ${touched.phone && errors.phone ? "is-invalid" : ""} ${
                  touched.phone && !errors.phone ? "is-valid" : ""
                }`}
                type="text"
                placeholder="Phone Number (10 digits)"
                value={phone}
                onChange={(e) => onPhone(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              />
              {touched.phone && errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            {/* EMAIL */}
            <div className="bk-field">
              <input
                className={`bk-auth-input ${touched.email && errors.email ? "is-invalid" : ""} ${
                  touched.email && !errors.email ? "is-valid" : ""
                }`}
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => onEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
              {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* PASSWORD */}
            <div className="bk-field bk-input-group">
              <input
                className={`bk-auth-input bk-input--with-icon ${
                  touched.password && errors.password ? "is-invalid" : ""
                } ${touched.password && !errors.password ? "is-valid" : ""}`}
                type={showPw ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => onPw(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                minLength={8}
              />
              <button
                type="button"
                className="bk-input-icon"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
              </button>
              {touched.password && errors.password && (
                <span className="field-error">{errors.password}</span>
              )}
            </div>

            <div className="bk-form-actions">
              <button 
                className={`bk-btn bk-btn--primary ${loading ? 'loading' : ''}`} 
                disabled={loading}
              >
                {loading ? "Creating…" : "Create Account"}
              </button>
            </div>

            <div className="bk-auth-divider">
              <span>or</span>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loadingGoogle}
                className={`bk-btn bk-btn--google ${loadingGoogle ? 'loading' : ''}`}
                style={{ width: 260 }}
              >
                <img src="/icons/google-white.svg" alt="Google" style={{ width: 20, height: 20 }} />
                {loadingGoogle ? "Connecting…" : "Sign up with Google"}
              </button>
            </div>

            <ToastContainer />
          </form>

          <p className="bk-auth-footer" style={{ marginTop: 12 }}>
            Already have an account? <Link to="/login" className="bk-auth-link">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
