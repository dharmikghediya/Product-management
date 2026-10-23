import { useState } from "react";
import { ArrowRight, Cpu, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { loginUser, registerUser, requestPasswordReset, resetPassword, readLastEmail, saveLastEmail } from "./authApi.js";
import BrandMark from "../products/components/BrandMark.jsx";
import "./auth.css";
import "./auth-responsive.css";

export default function AuthScreen({ onAuthenticated }) {
  const resetToken = new URLSearchParams(window.location.search).get("resetToken") || "";
  const rememberedEmail = readLastEmail();
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(rememberedEmail || "");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistering = mode === "register";
  const isForgotPassword = mode === "forgot";
  const isResettingPassword = mode === "reset";
  const showEmailSuggestion = !isRegistering && !isForgotPassword && !isResettingPassword && rememberedEmail && rememberedEmail !== email;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const nextEmail = email.trim();
        const result = await registerUser({ name, email: nextEmail, password, role: selectedRole });
        saveLastEmail(nextEmail);
        setMode("login");
        setPassword("");
        setNotice(result.message || "Account created. Sign in to continue.");
      } else if (isForgotPassword) {
        const result = await requestPasswordReset({ email });
        setNotice(result.message);
      } else if (isResettingPassword) {
        const result = await resetPassword({ token: resetToken, password });
        setMode("login");
        setPassword("");
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("resetToken");
        window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
        setNotice(result.message);
      } else {
        const trimmedEmail = email.trim();
        const result = await loginUser({ email: trimmedEmail, password });
        saveLastEmail(trimmedEmail);
        onAuthenticated({ token: result.token, user: result.user });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-intro" aria-label="DG Tech Store and Inventory">
        <div className="auth-message auth-brand-message">
          <span className="auth-tech-mark" aria-hidden="true"><Cpu size={25} strokeWidth={1.8} /></span>
          <h1><span>DG</span><span className="auth-company-subtitle">TECH STORE &amp; INVENTORY</span></h1>
          <p>Powering Your Digital World</p>
        </div>
        <span className="auth-index">DG / TECH STORE &amp; INVENTORY</span>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand brand">
            <span className="brand-mark brand-initials"><BrandMark className="brand-mark-art" /></span>
            <span className="brand-name"><span>DG</span><span>TECH STORE &amp; INVENTORY</span></span>
          </div>
          <div className="auth-heading">
            <span className="auth-kicker">{isRegistering ? "GET STARTED" : isForgotPassword || isResettingPassword ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</span>
            <h2>{isRegistering ? "Create your account" : isForgotPassword ? "Forgot your password?" : isResettingPassword ? "Choose a new password" : "Sign in to DG Tech Store"}</h2>
            <p>{isRegistering ? "Set up an account to manage your inventory." : isForgotPassword ? "Enter your email and we will send a reset link if an account matches." : isResettingPassword ? "Your new password must be at least 8 characters." : "Use your account to continue to your inventory."}</p>
          </div>

          {(mode === "login" || isRegistering) && (
            <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button
                className={mode === "login" ? "is-active" : ""}
                id="login-tab"
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => { setMode("login"); setError(""); setNotice(""); }}
              >
                Sign in
              </button>
              <button
                className={mode === "register" ? "is-active" : ""}
                id="register-tab"
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => { setMode("register"); setError(""); setNotice(""); }}
              >
                Register
              </button>
            </div>
          )}

          <form className={`auth-form${isRegistering ? " auth-form-register" : ""}`} onSubmit={submit}>
            {isRegistering && (
              <label className="auth-field" htmlFor="auth-name">
                <span>Your name</span>
                <span className="auth-input-wrap"><UserRound size={17} /><input id="auth-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} /></span>
              </label>
            )}
            {!isResettingPassword && (
              <label className="auth-field" htmlFor="auth-email">
                <span>Email address</span>
                <span className="auth-input-wrap"><Mail size={17} /><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></span>
              </label>
            )}
            {!isForgotPassword && (
              <div className="auth-field">
                <label htmlFor="auth-password">{isResettingPassword ? "New password" : "Password"}</label>
                <span className="auth-input-wrap">
                  <LockKeyhole size={17} />
                  <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isRegistering || isResettingPassword ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isRegistering || isResettingPassword ? 8 : undefined} />
                  <button className="auth-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {(isRegistering || isResettingPassword) && <span className="auth-hint">Use at least 8 characters.</span>}
              </div>
            )}
                        {isRegistering && (
              <div className="auth-field">
                <span>Account type</span>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="accountRole"
                      value="user"
                      checked={selectedRole === "user"}
                      onChange={() => setSelectedRole("user")}
                    />
                    <span>Customer / User</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                    <input
                      type="radio"
                      name="accountRole"
                      value="vendor"
                      checked={selectedRole === "vendor"}
                      onChange={() => setSelectedRole("vendor")}
                    />
                    <span>Vendor (Sell & Manage Products)</span>
                  </label>
                </div>
              </div>
            )}
            {showEmailSuggestion && (
              <div className="auth-email-suggestion-wrap">
                <button
                  className="auth-email-suggestion"
                  type="button"
                  onClick={() => setEmail(rememberedEmail)}
                >
                  <span className="auth-email-avatar">{rememberedEmail.charAt(0).toUpperCase() || "U"}</span>
                  <span className="auth-email-suggestion-content">
                    <strong>Recent account</strong>
                    <span>{rememberedEmail}</span>
                  </span>
                </button>
                <button
                  className="auth-email-switch"
                  type="button"
                  onClick={() => setEmail("")}
                >
                  Use another account
                </button>
              </div>
            )}
            {mode === "login" && (
              <button className="auth-text-button" type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>
                Forgot password?
              </button>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : isRegistering ? "Create account" : isForgotPassword ? "Send reset link" : isResettingPassword ? "Update password" : "Sign in"}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>
          {notice && <p className="auth-success" role="status">{notice}</p>}
          {(isForgotPassword || isResettingPassword) && (
            <button className="auth-text-button auth-back-button" type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
              Back to sign in
            </button>
          )}
          <p className="auth-secure-note">Your account details stay private.</p>
        </div>
      </section>
    </main>
  );
}
