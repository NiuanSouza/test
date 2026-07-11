import { API_BASE_URL } from "../lib/constants";
import { getStoredToken, clearStoredToken } from "../lib/jwt";

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}


async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { requireAuth = true, headers, ...customOptions } = options;

  const config: RequestInit = {
    ...customOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (requireAuth) {
    const token = getStoredToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized globally
    if (response.status === 401 || response.status === 403) {
      clearStoredToken();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const message = typeof data === "object" ? data.error || data.message || "Erro na requisição" : data;
      throw new ApiError(response.status, message, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors
    throw new Error(error instanceof Error ? error.message : "Erro ao conectar com o servidor.");
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: ApiOptions) => apiFetch<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body: any, options?: ApiOptions) => apiFetch<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: any, options?: ApiOptions) => apiFetch<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: any, options?: ApiOptions) => apiFetch<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: ApiOptions) => apiFetch<T>(endpoint, { ...options, method: "DELETE" }),
  // Custom method for FormData without application/json content-type
  postFormData: <T>(endpoint: string, formData: FormData, options?: ApiOptions) => {
    const { requireAuth = true, headers, ...customOptions } = options || {};
    
    const config: RequestInit = {
      ...customOptions,
      method: "POST",
      body: formData,
      headers: { ...headers },
    };

    if (requireAuth) {
      const token = getStoredToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    return fetch(`${API_BASE_URL}${endpoint}`, config).then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new ApiError(res.status, errData.error || "Erro no upload", errData);
      }
      return res.text() as unknown as T;
    });
  }
};
