import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import loginService from "../service/loginService";
import "./Login.css";

function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    loginService.getCurrentUser().then((response) => {
      if (!isMounted) return;
      const user = response?.item;
      if (!user) navigate("/login", { replace: true });
      else if (!user.mustChangePassword) navigate("/admin", { replace: true });
    }).catch(() => {
      if (isMounted) navigate("/login", { replace: true });
    });
    return () => { isMounted = false; };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmNewPassword) {
      setErrorMessage("Complete all password fields.");
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setErrorMessage("The new passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await loginService.changePassword(formData);
      localStorage.clear();
      window.dispatchEvent(new CustomEvent("site-auth-changed"));
      navigate("/login?passwordChanged=1", { replace: true });
    } catch (error) {
      const apiMessage = error?.response?.data?.errors?.[0];
      setErrorMessage(apiMessage || "Unable to change the password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="change-password-title">
        <div className="login-card__heading">
          <p className="login-card__eyebrow">First Login Security</p>
          <h1 id="change-password-title">Create Your Password</h1>
          <p>Your temporary password must be replaced before you can access the admin site.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form__field">
            <label htmlFor="current-password">Temporary password</label>
            <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" value={formData.currentPassword} onChange={handleChange} required disabled={isSubmitting} autoFocus />
          </div>
          <div className="login-form__field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="newPassword" type="password" autoComplete="new-password" value={formData.newPassword} onChange={handleChange} required disabled={isSubmitting} />
            <small className="login-form__help">At least 8 characters with uppercase, lowercase, number, and symbol.</small>
          </div>
          <div className="login-form__field">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" name="confirmNewPassword" type="password" autoComplete="new-password" value={formData.confirmNewPassword} onChange={handleChange} required disabled={isSubmitting} />
          </div>
          <div className={`login-form__message ${errorMessage ? "login-form__message--visible" : ""}`} role="alert" aria-live="polite">
            {errorMessage || "\u00A0"}
          </div>
          <button type="submit" className="login-form__submit" disabled={isSubmitting}>
            {isSubmitting ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ChangePassword;
