import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginService from "../service/loginService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const email = formData.email.trim();

    if (!email || !formData.password) {
      setErrorMessage("Enter both your email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await loginService.userLogin({
        email,
        password: formData.password,
      });

      const user = response?.item;

      if (!user || typeof user !== "object") {
        throw new Error("The login response did not include the user profile.");
      }

      localStorage.setItem("userId", String(user.id));
      localStorage.setItem("userName", user.name || user.email || "Admin");
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("userRole", user.roleName || "");
      localStorage.setItem("isLoggedIn", "true");

      window.dispatchEvent(
        new CustomEvent("site-auth-changed", {
          detail: { user },
        }),
      );

      navigate("/admin", { replace: true });
    } catch (error) {
      const apiMessage = error?.response?.data?.errors?.[0];

      if (error?.response?.status === 401) {
        setErrorMessage("The email or password is incorrect.");
      } else {
        setErrorMessage(
          apiMessage ||
            error?.message ||
            "Unable to log in right now. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__heading">
          <p className="login-card__eyebrow">Site_2024 Administration</p>
          <h1 id="login-title">Admin Login</h1>
          <p>Sign in to manage inventory, orders, returns, and site settings.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form__field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="login-form__field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
            />
          </div>

          <div
            className={`login-form__message ${
              errorMessage ? "login-form__message--visible" : ""
            }`}
            role="alert"
            aria-live="polite"
          >
            {errorMessage || "\u00A0"}
          </div>

          <button
            type="submit"
            className="login-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
