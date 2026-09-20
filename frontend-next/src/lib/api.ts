import { clearAllAuthSession, getValidStoredToken } from "./auth-storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

class ApiClient {
  private getToken(): string | null {
    return getValidStoredToken();
  }

  async request<T = any>(
    path: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (typeof window !== "undefined") {
        const imp = localStorage.getItem("superadmin_impersonating");
        if (imp) {
          try {
            const parsed = JSON.parse(imp);
            if (parsed?.schoolId) {
              headers["X-School-ID"] = parsed.schoolId;
            }
          } catch {}
        }
      }
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
    });

    const contentType = res.headers.get("content-type");
    let data: any = null;
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await res.text();
        data = text ? { error: text } : null;
      } catch {
        data = null;
      }
    }

    if (res.status === 401) {
      const errorMessage = data?.error || "Invalid credentials or session expired";

      // Do NOT auto-redirect / auto-logout if:
      // 1. skipAuth is true
      // 2. The endpoint is an explicit credential action (e.g. change-password, login, OTP verify)
      const isAuthEndpoint =
        path.includes("/auth/change-password") ||
        path.includes("/auth/login") ||
        path.includes("/auth/internal/login") ||
        path.includes("/auth/reset-password") ||
        path.includes("/auth/forgot-password");

      if (!skipAuth && !isAuthEndpoint && typeof window !== "undefined") {
        const pathname = window.location.pathname;
        const isAuthPage =
          pathname === "/login" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/internal-ops/signin") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/student/login");

        if (!isAuthPage) {
          clearAllAuthSession();

          // Route internal-ops / superadmin to internal-ops signin, others to standard login
          if (
            pathname.startsWith("/internal-ops") ||
            pathname.startsWith("/admin") ||
            pathname.startsWith("/care-desk")
          ) {
            window.location.href = `/internal-ops/signin?error=${encodeURIComponent(
              "Session expired. Please sign in again."
            )}`;
          } else {
            window.location.href = `/login?error=${encodeURIComponent(
              "Session expired. Please log in again."
            )}`;
          }
        }
      }
      throw new Error(errorMessage);
    }

    if (!res.ok) {
      throw new Error(data?.error || `Request failed with status ${res.status}`);
    }

    return data as T;
  }

  get<T = any>(path: string, options?: FetchOptions) {
    return this.request<T>(path, { method: "GET", ...options });
  }

  post<T = any>(path: string, body: any = {}, options?: FetchOptions) {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  }

  put<T = any>(path: string, body: any = {}, options?: FetchOptions) {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  }

  patch<T = any>(path: string, body: any = {}, options?: FetchOptions) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    });
  }

  delete<T = any>(path: string, options?: FetchOptions) {
    return this.request<T>(path, { method: "DELETE", ...options });
  }
}

export const api = new ApiClient();
