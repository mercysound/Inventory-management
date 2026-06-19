// src/main.jsx
// Add CartProvider here so it wraps the entire app and is available on every page.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ── Global: prevent mouse-wheel from changing <input type="number"> values ────
// This runs once at startup. Without this, scrolling over any number input
// accidentally increments/decrements the value — common annoyance on Windows.
document.addEventListener("wheel", (e) => {
  if (document.activeElement?.type === "number") {
    document.activeElement.blur();
  }
}, { passive: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        {/* ThemeProvider inside AuthProvider — needs useAuth() for per-user mode key */}
        <ThemeProvider>
          {/* CartProvider must be INSIDE AuthProvider because it reads useAuth() */}
          <CartProvider>
            <App />
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
