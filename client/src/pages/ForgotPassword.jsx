// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        // optional: after user finishes on Google’s page, you can bounce them to /login
        url: `${window.location.origin}/login`,
      });

      // ✅ show toast + clear the field
      toast.success("Reset link sent. Please check your inbox.", {
        className: "custom-toast",
      });
      setEmail("");
      setJustSent(true); // optional: to show a tiny helper text under the field
    } catch (err) {
      console.error(err);
      const msg =
        {
          "auth/user-not-found": "No user found for that email.",
          "auth/invalid-email": "Invalid email address.",
        }[err.code] || err.message || "Failed to send reset email.";
      toast.error(msg, { className: "custom-toast" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bk-auth-wrapper">
      <div className="bk-auth-card" style={{ maxWidth: 420 }}>
        <div className="bk-auth-form">
          <h2 className="bk-auth-title">Reset Password</h2>

          <form onSubmit={onSubmit} autoComplete="on">
            <input
              className="bk-auth-input"
              type="email"
              name="username"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Optional helper line after we send once */}
            {justSent && !email && (
              <div className="bk-auth-footer" style={{ marginTop: 6 }}>
                We've sent a link to your email.
              </div>
            )}

            <div className="bk-form-actions">
              <button className="bk-btn bk-btn--primary" disabled={sending}>
                {sending ? "Sending…" : "Send Reset Link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
