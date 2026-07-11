import { jwtDecode } from "jwt-decode";
import { TOKEN_KEY } from "./constants";

export interface TokenPayload {
  sub: string;
  name: string;
  permission: string;
  exp: number;
  iat: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  
  const currentTime = Date.now() / 1000;
  return payload.exp < currentTime;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("userName");
    localStorage.removeItem("userPermission");
    localStorage.removeItem("userRegistration");
  }
}
