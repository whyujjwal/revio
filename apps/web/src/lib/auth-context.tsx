"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import api from "./api";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("revio_token");
    if (stored) setToken(stored);
    setLoaded(true);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const t = res.data.access_token;
    localStorage.setItem("revio_token", t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem("revio_token");
    setToken(null);
  };

  if (!loaded) return null;

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
