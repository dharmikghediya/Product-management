import { useState } from "react";
import {createPortal} from "react-dom"; 
import { ShieldCheck } from "lucide-react";
import { changePassword } from "./authApi.js";
import "./change-password.css";

export default function ChangePasswordDialog({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);



  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword({ currentPassword, newPassword });
      setNotice(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="dialog-backdrop change-password-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <section className="product-dialog password-change-dialog change-password-panel" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div className="dialog-heading change-password-heading">
          <div className="change-password-title-copy">
            <span className="auth-kicker">ACCOUNT SECURITY</span>
            <h2 id="change-password-title">Change password</h2>
            <p>Update your password to keep your DG Tech Store account secure.</p>
          </div>
          <span className="change-password-shield" aria-hidden="true"><ShieldCheck size={22} /></span>
        </div>
        {notice ? (
          <>
            <p className="password-change-notice" role="status">{notice}</p>
            <div className="dialog-actions">
              <button className="button button-primary" type="button" onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <form className="product-form password-change-form" onSubmit={submit}>
            <div className="password-change-section-label">
              <strong>Password details</strong>
              <span>Enter your current password, then choose a new one.</span>
            </div>
            <label className="form-field form-field-wide">
              Current password
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label className="form-field form-field-wide">
              New password
              <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} maxLength={128} />
              <small>Use 8 to 128 characters.</small>
            </label>
            <label className="form-field form-field-wide">
              Confirm new password
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} maxLength={128} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="dialog-actions">
              <button className="button button-quiet" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
              <button className="button button-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,document.body
  );
}
