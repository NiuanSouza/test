"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredToken, isTokenExpired, clearStoredToken, decodeToken } from "../lib/jwt";

interface UserData {
  name: string;
  permission: string;
  registration: string;
}

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ["/login", "/reset-password"];

  useEffect(() => {
    const token = getStoredToken();
    const isPublic = pathname ? publicRoutes.includes(pathname) : false;

    if (!token || isTokenExpired(token)) {
      clearStoredToken();
      setUser(null);
      if (!isPublic) {
        router.push("/login");
      }
    } else {
      const payload = decodeToken(token);
      if (payload) {
        setUser({
          name: localStorage.getItem("userName") || payload.name || "Usuário",
          permission: localStorage.getItem("userPermission") || payload.permission || "TECHNICIAN",
          registration: localStorage.getItem("userRegistration") || payload.sub || "",
        });
        
        if (isPublic) {
          // Redirect to appropriate dashboard based on permission
          const perm = localStorage.getItem("userPermission") || payload.permission || "";
          if (perm === "MANAGER" || perm === "ADMIN") {
            router.push("/dashboard");
          } else {
            router.push("/home");
          }
        }
      }
    }
    
    setIsLoading(false);
  }, [pathname, router]);

  const logout = () => {
    clearStoredToken();
    setUser(null);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--color-surface)" }}>
        <div style={{ 
          width: "48px", height: "48px", border: "4px solid rgba(0, 32, 128, 0.1)", 
          borderLeftColor: "var(--color-primary)", borderRadius: "50%", 
          animation: "spin 1s linear infinite" 
        }} />
        <p style={{ marginTop: "16px", color: "var(--color-primary)", fontWeight: 600 }}>Carregando SIVA...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
