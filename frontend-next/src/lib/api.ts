const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
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

      // Only auto-redirect to /login if:
      // 1. This was an authenticated request (!skipAuth)
      // 2. We are NOT already on an authentication or onboarding page
      if (!skipAuth && typeof window !== "undefined") {
        const pathname = window.location.pathname;
        const isAuthPage =
          pathname === "/login" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/internal-ops/signin") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/forgot-password") ||
          pathname.startsWith("/student/login");

        if (!isAuthPage) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
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
