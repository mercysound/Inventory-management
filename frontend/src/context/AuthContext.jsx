import { createContext, useState, useContext, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../utils/api";

const AuthContext = createContext();

const parseJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const logoutTimerRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("pos-user");
      return storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      localStorage.removeItem("pos-user");
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("pos-token");
    return storedToken && storedToken !== "undefined" ? storedToken : "";
  });

  const clearAutoLogout = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const scheduleAutoLogout = (tokenValue) => {
    clearAutoLogout();
    if (!tokenValue) return;

    const payload = parseJwt(tokenValue);
    const expiresAt = payload?.exp ? payload.exp * 1000 : null;
    if (!expiresAt) return;

    const delay = expiresAt - Date.now() - 5000;
    if (delay <= 0) {
      logout();
      return;
    }

    logoutTimerRef.current = window.setTimeout(() => {
      toast.info("Session expired. Logging out...");
      logout();
    }, delay);
  };

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("pos-user", JSON.stringify(userData));
    localStorage.setItem("pos-token", tokenData);
    scheduleAutoLogout(tokenData);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearAutoLogout();
      setUser(null);
      setToken("");
      localStorage.removeItem("pos-user");
      localStorage.removeItem("pos-token");
    }
  };

  useEffect(() => {
    if (token) {
      scheduleAutoLogout(token);
    }
    return clearAutoLogout;
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
