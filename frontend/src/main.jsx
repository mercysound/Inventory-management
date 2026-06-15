// src/main.jsx
// Add CartProvider here so it wraps the entire app and is available on every page.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        {/* CartProvider must be INSIDE AuthProvider because it reads useAuth() */}
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
