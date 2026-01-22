// src/pages/Action.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { auth } from "../firebase";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Action() {
  const [params] = useSearchParams();
  const mode = useMemo(() => params.get("mode"), [params]);
  const oobCode = useMemo(() => params.get("oobCode"), [params]);
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [emailForReset, setEmailForReset] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle verifyEmail immediately
  useEffect(() => {
    const run = async () => {
      if (!mode || !oobCode) return setVerifying(false);

      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          toast.success("Email verified! Please sign in.", { className: "custom-toast" });

          // Check if this was a seller registration
          const postVerificationRole = localStorage.getItem("postVerificationRole");
          if (postVerificationRole === "seller") {
            // Clear the stored role
            localStorage.removeItem("postVerificationRole");
            // Redirect sellers directly to the seller application page
            setTimeout(() => navigate("/seller/application"), 1200);
          } else {
            // Redirect other users to login
            setTimeout(() => navigate("/login"), 1200);
          }
          return;
        }

        if (mode === "resetPassword") {
          // Check the code & get the email
          const email = await verifyPasswordResetCode(auth, oobCode);
          setEmailForReset(email);
          setVerifying(false);
          return;
        }

        // Unknown mode
        toast.error("Invalid action link.", { className: "custom-toast" });
        navigate("/login");
      } catch (err) {
        console.error(err);
        toast.error("This link is invalid or expired.", { className: "custom-toast" });
        navigate("/login");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, oobCode]);

  // Submit new password
  const onReset = async (e) => {
    e.preventDefault();
    if (!oobCode) return;
    // Enforce same rule as registration: at least 8 characters
    if ((pw || "").trim().length < 8) {
      toast.error("Password must be at least 8 characters.", { className: "custom-toast" });
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      toast.success("Password updated. You can sign in now.", { className: "custom-toast" });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      console.error(err);
      const msg = ({
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/expired-action-code": "This reset link has expired.",
        "auth/invalid-action-code": "This link is invalid.",
      })[err.code] || err.message || "Failed to update password.";
      toast.error(msg, { className: "custom-toast" });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading or verifyEmail handled above
  if (verifying && mode === "resetPassword") {
    return null;
  }

  // Render reset password form when mode=resetPassword
  if (mode === "resetPassword") {
    return (
      <div className="bk-auth-wrapper">
        <div className="bk-auth-card" style={{ maxWidth: 440 }}>
          <div className="bk-auth-form">
            <h2 className="bk-auth-title">Set a new password</h2>
            <p className="bk-auth-footer" style={{ marginBottom: 12 }}>
              for <strong>{emailForReset}</strong>
            </p>

            <form onSubmit={onReset} autoComplete="on">
              <div className="bk-input-group">
                <input
                  className="bk-auth-input bk-input--with-icon"
                  type={showPw ? "text" : "password"}
                  id="new-password"
                  name="new-password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="New password (min 8 characters)"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="bk-input-icon"
                >
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="bk-form-actions">
                <button className="bk-btn bk-btn--primary" disabled={submitting}>
                  {submitting ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown/handled modes
  return null;
}
