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
    const isPublic = publicRoutes.includes(pathname);

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
    return null; // Or a loading spinner
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
