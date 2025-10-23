import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "../constants/env";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ⬇️ Change this when your backend is ready
// e.g. "/phone-api/login.php" or "/api/login"
const LOGIN_PATH = "/api/login";

// Try several common token keys
function pickToken(data) {
  if (!data) return null;
  return (
    data.token ||
    (data.data && data.data.token) ||
    data.jwt ||
    data.access_token ||
    null
  );
}

export function AuthProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [token, setToken] = useState(null);

  // Load persisted token at startup
  useEffect(() => {
    (async () => {
      try {
        const t = await SecureStore.getItemAsync("token");
        if (t) setToken(t);
      } catch (e) {
        console.warn("SecureStore getItemAsync error:", e);
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  // Real login (will work when your endpoint exists)
  const login = async (email, password) => {
    const url = `${API_BASE}${LOGIN_PATH}`;
    console.log("LOGIN →", url, { email });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // If your API expects 'username' instead, change this line:
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    console.log("LOGIN status/body →", res.status, text);

    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

    const t = pickToken(data);
    if (!t) throw new Error("Token not found in response");

    setToken(t);
    await SecureStore.setItemAsync("token", t);
  };

  // Dev helper: set token without hitting the server
  const setTokenDirect = async (value) => {
    setToken(value);
    await SecureStore.setItemAsync("token", value);
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
    } finally {
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ initialized, token, login, logout, setTokenDirect }}>
      {children}
    </AuthContext.Provider>
  );
}
