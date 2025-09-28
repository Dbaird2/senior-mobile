import { useAuth } from "./useAuth";
import { API_BASE } from "../constants/env";

export function useApi() {
  const { token, logout } = useAuth();

  async function request(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await res.text();
    if (res.status === 401) {
      await logout();
      throw new Error("Session expired. Please sign in again.");
    }
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    try { return JSON.parse(text); } catch { return text; }
  }

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: "POST", body: JSON.stringify(body) }),
    patch: (p, body) => request(p, { method: "PATCH", body: JSON.stringify(body) }),
    del: (p) => request(p, { method: "DELETE" }),
  };
}
