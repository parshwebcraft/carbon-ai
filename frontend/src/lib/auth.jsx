import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [token, setToken] = useState(localStorage.getItem("facets_token") || null);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("facets_token");
      localStorage.removeItem("facets_user");
      setUser(null);
      setToken(null);
    });
  }, [token]);

  async function refreshUser() {
    try {
      const { data } = await api.get("/auth/me");
      localStorage.setItem("facets_user", JSON.stringify(data));
      setUser(data);
      return data;
    } catch {
      return null;
    }
  }

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("facets_token", data.access_token);
    localStorage.setItem("facets_refresh", data.refresh_token);
    localStorage.setItem("facets_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password, company_name = "", phone = "") {
    const { data } = await api.post("/auth/register", {
      name,
      email,
      password,
      company_name,
      phone,
    });
    localStorage.setItem("facets_token", data.access_token);
    localStorage.setItem("facets_refresh", data.refresh_token);
    localStorage.setItem("facets_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("facets_token");
    localStorage.removeItem("facets_refresh");
    localStorage.removeItem("facets_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, token, login, logout, register, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
